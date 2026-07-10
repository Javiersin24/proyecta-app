import { useEffect, useState } from 'react';
import { Sheet } from '../../ui/Screen.jsx';
import { useProjecting } from '../../lib/ProjectingContext.jsx';
import Icon from '../../ui/Icon.jsx';
import { StatusDot } from '../../ui/kit.jsx';

// Un toque: elige el proyector de tu colegio y listo — sin cast/espejo, sin QR.
export default function ProjectSheet({ material, open, onClose }) {
  const { listProjectors, start } = useProjecting();
  const [projectors, setProjectors] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (open) listProjectors().then(setProjectors).catch(() => setProjectors([])); }, [open]);

  const pick = async (p) => {
    setBusyId(p.id); setError('');
    try { await start(p, material.name); onClose(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Proyectar">
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 14 }}>
        Elige el proyector del salón — <strong style={{ color: 'var(--fg-1)' }}>{material?.name}</strong> se mostrará automáticamente.
      </div>
      {error && <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(projectors || []).map((p) => (
          <button key={p.id} onClick={() => pick(p)} disabled={busyId === p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 14px',
            border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--white)', cursor: 'pointer',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center' }}>
              <Icon name="projector" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <StatusDot status={p.status} /> {p.status === 'live' ? 'En uso ahora' : p.status === 'online' ? 'Disponible' : 'Sin conexión'}
              </div>
            </div>
            {busyId === p.id ? <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Conectando…</span> : <Icon name="cast" size={16} color="var(--fg-3)" />}
          </button>
        ))}
        {projectors && projectors.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: 16 }}>No hay proyectores en tu colegio todavía.</div>}
      </div>
    </Sheet>
  );
}
