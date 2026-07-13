import { useState } from 'react';
import { put } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useProjecting } from '../../lib/ProjectingContext.jsx';
import { Sheet } from '../../ui/Screen.jsx';
import { StatusDot } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

// Botón "Proyectar": si el profesor de la clase ya marcó su salón actual, un
// solo toque manda el material — sin listas, sin escribir nada. Si todavía
// no lo ha marcado, lo hace UNA vez escribiendo el código que ve en la
// pantalla del proyector que tiene físicamente en frente (no elige de una
// lista, para no equivocarse de salón). Desde ahí queda igual para TODAS sus
// clases hasta que lo cambie. El estudiante nunca elige nada: si su profesor
// no ha marcado salón, solo ve un aviso.
export default function ProjectAction({ cls, material, compact = false, onLinked }) {
  const { user } = useAuth();
  const { session, start } = useProjecting();
  const isTeacher = user?.role === 'teacher';
  const [linkOpen, setLinkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const projector = cls?.projector;
  const isProjectingThis = session?.fileName === material?.name;

  const doProject = async (p) => {
    setBusy(true); setError('');
    try { await start(p, material, cls.id); setLinkOpen(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const link = async (code) => {
    setBusy(true); setError('');
    try {
      const { projector: p } = await put('/auth/salon-actual', { code });
      onLinked?.(p);
      await doProject(p);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  // Ya vinculado y habilitado → un solo toque.
  if (projector && projector.enabled) {
    if (compact) {
      return (
        <button onClick={() => doProject(projector)} disabled={busy} title="Proyectar en el aula" style={{
          width: 34, height: 34, borderRadius: 10, border: 0, cursor: 'pointer',
          background: isProjectingThis ? 'var(--coral-500)' : 'var(--indigo-50)', color: isProjectingThis ? '#fff' : 'var(--indigo-600)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name="cast" size={16} />
        </button>
      );
    }
    return (
      <div>
        {isProjectingThis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--coral-50)', color: 'var(--coral-600)', borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            <StatusDot status="live" /> Proyectando ahora en {projector.name}
          </div>
        )}
        {error && <div style={{ marginBottom: 8, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
        <button onClick={() => doProject(projector)} disabled={busy} style={{
          height: 52, width: '100%', border: 0, borderRadius: 14, cursor: 'pointer', background: 'var(--indigo-600)', color: '#fff',
          fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        }}>
          <Icon name="cast" size={19} /> {busy ? 'Proyectando…' : 'Proyectar en el aula'}
        </button>
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg-3)', textAlign: 'center' }}>Tu salón actual: {projector.name}{isTeacher ? ' · ' : ''}
          {isTeacher && <button onClick={() => setLinkOpen(true)} style={{ border: 0, background: 'none', color: 'var(--indigo-600)', fontWeight: 700, cursor: 'pointer', fontSize: 11.5, padding: 0 }}>cambiar</button>}
        </div>
        {isTeacher && <LinkSheet open={linkOpen} onClose={() => setLinkOpen(false)} onLink={link} busy={busy} error={error} />}
      </div>
    );
  }

  // Vinculado pero suspendido por el colegio/plataforma.
  if (projector && !projector.enabled) {
    const msg = 'Tu salón actual está suspendido. Contacta al administrador del colegio.';
    return compact ? (
      <div title={msg} style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--fg-3)', flexShrink: 0 }}><Icon name="cast" size={16} /></div>
    ) : (
      <div style={{ padding: '12px 14px', background: 'var(--ink-100)', borderRadius: 12, fontSize: 13, color: 'var(--fg-3)', textAlign: 'center' }}>{msg}</div>
    );
  }

  // Sin marcar todavía — el profesor lo hace una vez; el estudiante solo ve el aviso.
  if (!isTeacher) {
    const msg = 'Tu profesor aún no marcó su salón actual.';
    return compact ? null : (
      <div style={{ padding: '12px 14px', background: 'var(--ink-100)', borderRadius: 12, fontSize: 13, color: 'var(--fg-3)', textAlign: 'center' }}>{msg}</div>
    );
  }

  if (compact) {
    return (
      <button onClick={() => setLinkOpen(true)} title="Marcar mi salón actual" style={{
        width: 34, height: 34, borderRadius: 10, border: '1px dashed var(--indigo-400)', cursor: 'pointer',
        background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name="cast" size={16} />
      </button>
    );
  }
  return (
    <div>
      <button onClick={() => setLinkOpen(true)} style={{
        height: 52, width: '100%', border: '1.5px dashed var(--indigo-400)', borderRadius: 14, cursor: 'pointer', background: 'var(--indigo-50)', color: 'var(--indigo-700)',
        fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      }}>
        <Icon name="cast" size={19} /> Marcar mi salón actual
      </button>
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--fg-3)', textAlign: 'center' }}>Se hace una vez al entrar al salón — luego "Proyectar" es de un solo toque en todas tus clases.</div>
      <LinkSheet open={linkOpen} onClose={() => setLinkOpen(false)} onLink={link} busy={busy} error={error} />
    </div>
  );
}

// Variante para listas (material de un tema): un solo toque proyecta directo
// si el profesor ya marcó su salón actual; si no (y es el profesor), abre el
// vínculo por código.
export function useQuickProject(cls, onLinked) {
  const { user } = useAuth();
  const { start } = useProjecting();
  const isTeacher = user?.role === 'teacher';
  const [linkOpen, setLinkOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const projectNow = async (p, material) => {
    setBusy(true); setNotice('');
    try { await start(p, material, cls.id); }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };

  const trigger = (material) => {
    if (!cls) return;
    setNotice('');
    const projector = cls.projector;
    if (projector && projector.enabled) return projectNow(projector, material);
    if (projector && !projector.enabled) return setNotice('Tu salón actual está suspendido. Contacta al administrador del colegio.');
    if (!isTeacher) return setNotice('Tu profesor aún no marcó su salón actual.');
    setPending(material);
    setLinkOpen(true);
  };

  const link = async (code) => {
    setBusy(true); setNotice('');
    try {
      const { projector: p } = await put('/auth/salon-actual', { code });
      onLinked?.(p);
      setLinkOpen(false);
      if (pending) await projectNow(p, pending);
    } catch (e) { setNotice(e.message); setBusy(false); }
  };

  const sheet = isTeacher ? <LinkSheet open={linkOpen} onClose={() => setLinkOpen(false)} onLink={link} busy={busy} error="" /> : null;
  return { trigger, sheet, notice };
}

function LinkSheet({ open, onClose, onLink, busy, error }) {
  const [code, setCode] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Marca tu salón actual">
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 14, lineHeight: 1.5 }}>
        Escribe el código que ves en la <strong style={{ color: 'var(--fg-1)' }}>pantalla del proyector</strong> que tienes en frente (esquina inferior). Así queda vinculado el salón correcto, sin riesgo de equivocarte.
      </div>
      {error && <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ej. 7B3K" maxLength={6} autoFocus
          style={{ flex: 1, height: 52, border: '1.5px solid var(--ink-300)', borderRadius: 12, padding: '0 16px', fontSize: 20, fontWeight: 800, letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', textAlign: 'center' }} />
        <button onClick={() => code.trim() && onLink(code.trim())} disabled={busy || !code.trim()} style={{
          border: 0, borderRadius: 12, padding: '0 20px', background: code.trim() ? 'var(--indigo-600)' : 'var(--ink-300)', color: '#fff',
          fontWeight: 700, fontSize: 14, cursor: code.trim() ? 'pointer' : 'not-allowed',
        }}>{busy ? '…' : 'Vincular'}</button>
      </div>
    </Sheet>
  );
}
