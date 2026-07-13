import Icon from '../../ui/Icon.jsx';
import { useProjecting } from '../../lib/ProjectingContext.jsx';

export default function ProjectingStrip() {
  const { session, stop } = useProjecting();
  if (!session) return null;
  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0, background: 'var(--ink-950)', color: '#fff',
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral-500)', animation: 'pulse 1.4s infinite', flexShrink: 0 }} />
      <Icon name="cast" size={15} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
        Proyectando <strong>{session.fileName}</strong> en {session.projectorName}
      </div>
      <button onClick={stop} style={{ border: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Detener
      </button>
    </div>
  );
}
