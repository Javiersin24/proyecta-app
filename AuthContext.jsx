// Avisos de la app instalable: "Instalar Proyecta" y "Hay una versión nueva".
// Se muestran flotando abajo, por encima de la barra de pestañas, respetando
// el área segura del iPhone.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { canInstall, hasUpdate, onPwaChange, promptInstall, applyUpdate, isStandalone, isIOS } from '../lib/pwa.js';
import Icon from './Icon.jsx';

const DISMISS_KEY = 'proyecta_install_dismissed';

const wrap = {
  position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + var(--safe-bottom))',
  zIndex: 95, maxWidth: 460, margin: '0 auto',
  display: 'flex', alignItems: 'center', gap: 12,
  background: 'var(--white)', border: '1px solid var(--border-subtle)',
  borderRadius: 16, padding: '12px 14px', boxShadow: '0 8px 28px rgba(15,20,32,0.18)',
};
const btn = {
  height: 36, padding: '0 14px', borderRadius: 10, border: 0, cursor: 'pointer',
  background: 'var(--indigo-500)', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
};

export default function PwaBanners() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [iosHelp, setIosHelp] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => onPwaChange(() => force((n) => n + 1)), []);

  // La pantalla del proyector corre en un televisor: ahí no va ningún aviso.
  if (pathname.startsWith('/proyector')) return null;

  // 1) Versión nueva disponible — tiene prioridad sobre el aviso de instalar.
  if (hasUpdate()) {
    return (
      <div style={wrap}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="upload" size={17} color="var(--indigo-600)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Hay una versión nueva</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Actualiza para tener lo último.</div>
        </div>
        <button style={btn} onClick={applyUpdate}>Actualizar</button>
      </div>
    );
  }

  // 2) Invitación a instalar (solo si aún no está instalada y no la descartó).
  if (dismissed || isStandalone()) return null;

  const close = () => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); };

  // iPhone/iPad: Safari no ofrece instalación automática, se explica el paso.
  if (isIOS()) {
    return (
      <div style={{ ...wrap, alignItems: iosHelp ? 'flex-start' : 'center' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="share" size={16} color="var(--indigo-600)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Instala Proyecta en tu iPhone</div>
          {iosHelp ? (
            <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, marginTop: 3 }}>
              1. Toca el botón <b>Compartir</b> (el cuadrito con la flecha, abajo en Safari).<br />
              2. Baja y elige <b>“Agregar a pantalla de inicio”</b>.<br />
              3. Toca <b>Agregar</b>. Listo, te queda como una app.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Para abrirla como una app normal.</div>
          )}
        </div>
        {!iosHelp && <button style={btn} onClick={() => setIosHelp(true)}>Cómo</button>}
        <button onClick={close} aria-label="Cerrar" style={{ width: 30, height: 30, border: 0, background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="x" size={16} />
        </button>
      </div>
    );
  }

  // Android/Chrome/Edge: instalación con un toque.
  if (!canInstall()) return null;
  return (
    <div style={wrap}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name="cast" size={17} color="var(--indigo-600)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>Instalar Proyecta</div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Ábrela como app, sin el navegador.</div>
      </div>
      <button style={btn} onClick={promptInstall}>Instalar</button>
      <button onClick={close} aria-label="Cerrar" style={{ width: 30, height: 30, border: 0, background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
