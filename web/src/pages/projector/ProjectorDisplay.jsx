// Pantalla que se instala UNA vez en el proyector del aula. Sin login — solo
// espera. Un profesor o estudiante emparejado con este código empieza a
// proyectar desde su dispositivo con un solo toque, sin QR ni configuración.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
        <div style={{ flex: 1, position: 'relative', background: 'repeating-linear-gradient(135deg,#EEF0FB,#EEF0FB 14px,#E4E7F5 14px,#E4E7F5 28px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--fg-2)', background: 'rgba(255,255,255,0.85)', padding: '9px 18px', borderRadius: 12 }}>
            {state.session.fileName}
          </div>
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
