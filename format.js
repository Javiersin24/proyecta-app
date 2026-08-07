// Registro del service worker + detección de "se puede instalar" y de
// "hay una versión nueva". La UI vive en ui/PwaBanners.jsx.
//
// No forzamos la actualización: avisamos y el usuario decide, para no recargar
// la app mientras un profesor está escribiendo notas o un comentario.

let deferredPrompt = null;              // evento beforeinstallprompt (Android/Chrome)
let waitingWorker = null;               // SW nuevo esperando para activarse
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn());
export const onPwaChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const canInstall = () => !!deferredPrompt;
export const hasUpdate = () => !!waitingWorker;

// ¿Ya está corriendo como app instalada?
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad moderno

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const p = deferredPrompt;
  deferredPrompt = null;
  emit();
  p.prompt();
  const { outcome } = await p.userChoice.catch(() => ({ outcome: 'dismissed' }));
  return outcome === 'accepted';
}

export function applyUpdate() {
  if (!waitingWorker) return;
  waitingWorker.postMessage('SKIP_WAITING');
  // Cuando el SW nuevo tome el control, recargamos una sola vez.
}

export function registerPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // evita el mini-banner nativo; usamos el nuestro
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; emit(); });

  if (!('serviceWorker' in navigator)) return;
  // En desarrollo (vite dev) no registramos nada: complica el hot-reload.
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', async () => {
    try {
      // updateViaCache:'none' → el navegador siempre consulta el servidor por
      // sw.js. Así las actualizaciones llegan aunque nginx cachee estáticos.
      const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });

      const track = (worker) => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          // Hay versión nueva lista Y ya había una app instalada antes.
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = worker;
            emit();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; emit(); }
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));

      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Busca actualizaciones al volver a la app (típico en celular).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      /* sin service worker la app funciona igual, solo sin modo offline */
    }
  });
}
