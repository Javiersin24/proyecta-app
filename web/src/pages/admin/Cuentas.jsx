import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { Avatar, Chip } from '../../ui/kit.jsx';

const SECTIONS = [
  { label: 'Profesores', role: 'teacher', variant: 'info' },
  { label: 'Estudiantes', role: 'student', variant: 'muted' },
];

export default function AdminCuentas() {
  const [accounts, setAccounts] = useState(null);
  useEffect(() => { get('/admin/accounts').then((d) => setAccounts(d.accounts)); }, []);
  if (!accounts) return null;

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 14 }}>Cuentas</div>
      {SECTIONS.map((sec) => {
        const items = accounts.filter((c) => c.role === sec.role);
        if (!items.length) return null;
        return (
          <div key={sec.role} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sec.label} · {items.length}</div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
              {items.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                  <Avatar name={c.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{c.email}</div>
                  </div>
                  <Chip variant={sec.variant}>{sec.label.slice(0, -1)}</Chip>
                  <Chip variant={c.status === 'Activa' ? 'success' : 'warning'}>{c.status}</Chip>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Screen>
  );
}
