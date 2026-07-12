import { useEffect, useState } from 'react';
import { get, post } from '../../lib/api.js';
import { Screen, Sheet, Modal } from '../../ui/Screen.jsx';
import { Avatar, Chip, Field, PrimaryButton, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const SECTIONS = [
  { label: 'Profesores', role: 'teacher', variant: 'info' },
  { label: 'Estudiantes', role: 'student', variant: 'muted' },
];

function CredencialesModal({ creds, onClose }) {
  const [copied, setCopied] = useState('');
  const copy = (label, value) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(label); setTimeout(() => setCopied(''), 1500);
  };
  return (
    <Modal open={!!creds} onClose={onClose} title="Cuenta creada">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>
          Comparte estas credenciales con <strong style={{ color: 'var(--fg-1)' }}>{creds?.name}</strong>. La contraseña no se volverá a mostrar.
        </div>
        {[['Usuario', creds?.usuario], ['Contraseña temporal', creds?.pass]].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--ink-200)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{value}</div>
            </div>
            <button onClick={() => copy(label, value)} style={{ width: 34, height: 34, flexShrink: 0, border: 0, borderRadius: 9, background: 'var(--indigo-50)', color: 'var(--indigo-600)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Icon name={copied === label ? 'check' : 'copy'} size={15} />
            </button>
          </div>
        ))}
        <PrimaryButton onClick={onClose}>Listo</PrimaryButton>
      </div>
    </Modal>
  );
}

function CreateAccountSheet({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { account, credentials } = await post('/admin/accounts', { name, role });
      setName(''); onCreated(account, credentials);
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Crear cuenta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="María Fernanda Ríos" />
        <div>
          <label style={labelStyle}>Tipo de cuenta</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="teacher">Profesor</option>
            <option value="student">Estudiante</option>
          </select>
        </div>
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export default function AdminCuentas() {
  const [accounts, setAccounts] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creds, setCreds] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => get('/admin/accounts').then((d) => setAccounts(d.accounts));
  useEffect(() => { load(); }, []);

  const onCreated = (account, credentials) => {
    setShowCreate(false);
    setAccounts((prev) => [...(prev || []), account]);
    setCreds({ ...credentials, name: account.name });
  };

  const resetPassword = async (acc) => {
    setBusyId(acc.id);
    try {
      const { credentials } = await post(`/admin/accounts/${acc.id}/reset-password`);
      setCreds({ ...credentials, name: acc.name });
    } finally { setBusyId(null); }
  };

  if (!accounts) return null;

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div className="h2">Cuentas</div>
        <button onClick={() => setShowCreate(true)} style={{
          marginLeft: 'auto', border: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', borderRadius: 9,
          padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}><Icon name="plus" size={15} stroke={2.4} /> Crear cuenta</button>
      </div>
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
                  <Chip variant={c.status === 'Activa' ? 'success' : 'warning'}>{c.status}</Chip>
                  <button onClick={() => resetPassword(c)} disabled={busyId === c.id} title="Restablecer contraseña" style={{
                    width: 32, height: 32, flexShrink: 0, border: '1px solid var(--ink-200)', borderRadius: 9, background: 'var(--white)',
                    color: 'var(--fg-2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
                  }}><Icon name="refresh" size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <CreateAccountSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={onCreated} />
      <CredencialesModal creds={creds} onClose={() => setCreds(null)} />
    </Screen>
  );
}
