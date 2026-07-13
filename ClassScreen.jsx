import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { StatGrid, StatusDot } from '../../ui/kit.jsx';

export default function AdminResumen() {
  const [data, setData] = useState(null);
  useEffect(() => { get('/admin/overview').then(setData); }, []);
  if (!data) return null;

  return (
    <Screen>
      <div style={{ marginBottom: 16 }}>
        <div className="h2">{data.school?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Panel de administración</div>
      </div>
      <StatGrid stats={data.stats} />
      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Ahora mismo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {data.activity.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusDot status={r.status} />
              <span style={{ fontSize: 13.5, color: 'var(--fg-1)', fontWeight: 600 }}>{r.room}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>— {r.text}</span>
            </div>
          ))}
          {data.activity.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Sin proyectores todavía.</div>}
        </div>
      </div>
    </Screen>
  );
}
