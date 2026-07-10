import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { Avatar, Chip, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const roleLabel = { admin: 'Admin', teacher: 'Profesor', student: 'Estudiante', enrollee: 'Matriculando' };
const roleVariant = (r) => (r === 'admin' ? 'info' : r === 'teacher' ? 'warning' : 'muted');

export default function SuperCuentas() {
  const [query, setQuery] = useState('');
  const [porColegio, setPorColegio] = useState(null);
  const [resetId, setResetId] = useState(null);

  const load = () => get(`/superadmin/cuentas${query ? `?q=${encodeURIComponent(query)}` : ''}`).then((d) => setPorColegio(d.porColegio));
  useEffect(() => { load(); }, [query]);
  if (!porColegio) return null;

  const resetPassword = async (id) => { const d = await post(`/superadmin/cuentas/${id}/reset-password`); setResetId(id); setTimeout(() => setResetId((c) => (c === id ? null : c)), 1800); };
  const removeAccount = async (id) => { if (!confirm('¿Eliminar esta cuenta?')) return; await del(`/superadmin/cuentas/${id}`); load(); };

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 6 }}>Cuentas</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 10 }}>
        Todas las cuentas de la red, organizadas por colegio. Puedes restablecer contraseñas o eliminar cuentas directamente desde aquí.
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o correo…" style={{ ...inputStyle, marginBottom: 14 }} />
      {porColegio.map(({ colegio, cuentas }) => (
        <div key={colegio} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="home" size={16} stroke={2} style={{ color: 'var(--indigo-500)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13.5 }}>{colegio}</span>
            <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>· {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
            {cuentas.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                <Avatar name={a.name} size={32} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{a.email}</div>
                </div>
                <Chip variant={roleVariant(a.role)}>{roleLabel[a.role] || a.role}</Chip>
                <Chip variant={a.status === 'Activa' ? 'success' : 'warning'}>{a.status}</Chip>
                <button onClick={() => resetPassword(a.id)} style={{ height: 30, padding: '0 10px', border: '1px solid var(--ink-200)', background: resetId === a.id ? 'var(--success-100)' : 'var(--white)', color: resetId === a.id ? '#1a6b47' : 'var(--fg-2)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  {resetId === a.id ? 'Enlace enviado ✓' : 'Restablecer contraseña'}
                </button>
                <button onClick={() => removeAccount(a.id)} aria-label="Eliminar cuenta" style={{ width: 30, height: 30, border: 0, borderRadius: 8, background: 'transparent', color: 'var(--danger-500)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {porColegio.length === 0 && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14 }}>Sin resultados.</div>}
    </Screen>
  );
}
