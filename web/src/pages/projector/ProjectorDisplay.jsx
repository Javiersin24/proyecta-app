// Pantalla que se instala UNA vez en el proyector del aula. Sin login — solo
// espera. Un profesor o estudiante emparejado con este código empieza a
// proyectar desde su dispositivo con un solo toque, sin QR ni configuración.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fileUrl } from '../../lib/api.js';
import Icon from '../../ui/Icon.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function ProjectorDisplay() {
  const { code } = useParams();
  const [state, setState] = useState(null); // { projector, session }
  const [clock, setClock] = useState(fmtClock());
  const [error, setError] = useState(false);

  useEffect(() => {
    const tick = () => setClock(fmtClock());
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/projector/${code}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!stop) { setState(data); setError(false); }
      } catch { if (!stop) setError(true); }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [code]);

  const live = state?.projector?.status === 'live' && state?.session;

  // Botón "atrás"/"salir" del control remoto del proyector: corta la
  // proyección y vuelve a la pantalla de espera. La mayoría de controles de
  // smart TV mandan estas mismas teclas al navegador.
  useEffect(() => {
    const onKey = (e) => {
      if (!live) return;
      if (['Escape', 'Backspace', 'GoBack', 'Back', 'BrowserBack'].includes(e.key)) {
        e.preventDefault();
        fetch(`${API_BASE}/projector/${code}/detener`, { method: 'POST' }).catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, code]);

  if (error) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'var(--paper-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <Icon name="projector" size={32} color="var(--fg-3)" />
        <div style={{ fontWeight: 700, fontSize: 16 }}>Código "{code}" no encontrado</div>
        <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Verifica el código del aula con el administrador del colegio.</div>
      </div>
    );
  }
  if (!state) return null;

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', background: 'var(--paper-50)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!live && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, right: 26, fontSize: 15, fontWeight: 600, color: 'var(--fg-3)' }}>{clock}</div>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--indigo-500)', display: 'grid', placeItems: 'center', marginBottom: 6 }}>
            <Icon name="cast" size={22} color="#fff" />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 40 }}>{state.projector.name}</div>
          <div style={{ fontSize: 15, color: 'var(--fg-2)', fontWeight: 500 }}>Esperando una presentación…</div>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-400)', fontWeight: 600 }}>Profesor: escribe este código en Proyecta → "Marcar mi salón actual"</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 800, letterSpacing: '0.16em', color: 'var(--indigo-600)', background: 'var(--indigo-50)', borderRadius: 16, padding: '10px 34px' }}>
              {code}
            </div>
          </div>
        </div>
      )}

      {live && (
        <div style={{ flex: 1, position: 'relative', background: '#0d0f16', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <ProjectedContent session={state.session} />
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.92)', padding: '8px 16px', borderRadius: 999, boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--coral-500)', animation: 'pulse 1.4s infinite' }} />
            <span style={{ fontWeight: 700, fontSize: 12.5 }}>{state.projector.name} · {state.session.startedBy}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 16, background: 'rgba(255,255,255,0.85)', padding: '6px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-400)' }}>
            controla desde tu dispositivo
          </div>
        </div>
      )}
    </div>
  );
}

function fmtClock() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function youtubeEmbed(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : url;
}

// Muestra el documento real en pantalla completa. PDF, imagen y video se
// renderizan directo (mismo origen); Word/PowerPoint y otros no tienen
// previsualización nativa en el navegador, así que se muestra un aviso claro
// en vez de enviar el archivo a un visor externo de terceros.
function ProjectedContent({ session }) {
  const { fileKind, fileName } = session;
  const url = fileUrl(session.fileUrl);
  if (!url) {
    return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#fff', background: 'rgba(255,255,255,0.12)', padding: '9px 18px', borderRadius: 12 }}>{fileName}</div>;
  }
  if (fileKind === 'image') {
    return <img src={url} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />;
  }
  if (fileKind === 'video') {
    return <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} />;
  }
  if (fileKind === 'youtube') {
    return <iframe title={fileName} src={youtubeEmbed(url)} allow="autoplay; encrypted-media" style={{ width: '100%', height: '100%', border: 0 }} />;
  }
  if (fileKind === 'pdf') {
    return <iframe title={fileName} src={url} style={{ width: '100%', height: '100%', border: 0, background: '#fff' }} />;
  }
  if (fileKind === 'link') {
    return <iframe title={fileName} src={url} style={{ width: '100%', height: '100%', border: 0, background: '#fff' }} />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#fff' }}>
      <Icon name="file" size={40} color="rgba(255,255,255,0.6)" />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16 }}>{fileName}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Este tipo de archivo no se puede previsualizar aquí — ábrelo desde tu dispositivo.</div>
    </div>
  );
}
