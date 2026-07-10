import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { StatGrid, StatusDot } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const statusColor = (s) => (s === 'live' ? 'var(--coral-600)' : s === 'online' ? 'var(--success-500)' : 'var(--danger-500)');
const statusLabel = (s) => (s === 'live' ? 'Proyectando' : s === 'online' ? 'En línea' : 'Sin conexión');

export default function SuperProyectores() {
  const [porColegio, setPorColegio] = useState(null);
  useEffect(() => { get('/superadmin/proyectores').then((d) => setPorColegio(d.porColegio)); }, []);
  if (!porColegio) return null;

  const all = porColegio.flatMap((g) => g.proyectores);

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 14 }}>Proyectores</div>
      <StatGrid stats={[
        { n: `${all.filter((p) => p.status !== 'offline').length}/${all.length}`, l: 'Proyectores en línea' },
        { n: all.filter((p) => p.status === 'live').length, l: 'Proyectando ahora' },
      ]} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {porColegio.map((g) => (
          <div key={g.colegio} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="home" size={16} stroke={2} style={{ color: 'var(--indigo-500)' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13.5 }}>{g.colegio}</span>
              <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>· {g.enLinea}/{g.proyectores.length} en línea</span>
            </div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
              {g.proyectores.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                  <StatusDot status={p.status} />
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div></div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', flex: '1 1 220px' }}>{p.activity}</div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: statusColor(p.status) }}>{statusLabel(p.status)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}
