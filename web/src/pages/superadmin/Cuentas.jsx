import { useEffect, useState } from 'react';
import { get, post, del } from '../../lib/api.js';
import { Screen, Sheet, Modal } from '../../ui/Screen.jsx';
import { Avatar, Chip, Field, PrimaryButton, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const roleLabel = { admin: 'Admin', teacher: 'Profesor', student: 'Estudiante', enrollee: 'Matriculando' };
const roleVariant = (r) => (r === 'admin' ? 'info' : r === 'teacher' ? 'warning' : 'muted');

function CredencialesModal({ creds, onClose }) {
  const [copied, setCopied] = useState('');
  const copy = (label, value) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(label); setTimeout(() => setCopied(''), 1500);
  };
  return (
    <Modal open={!!creds} onClose={onClose} title={creds?.isReset ? 'Contraseña restablecida' : 'Cuenta creada'}>
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

function CreateAccountSheet({ open, onClose, onCreated, colegios }) {
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open && !schoolId && colegios?.length) setSchoolId(colegios[0].id); }, [open, colegios]);

  const submit = async () => {
    if (!name.trim() || !schoolId) return;
    setBusy(true); setError('');
    try {
      const { account, credentials } = await post('/superadmin/cuentas', { schoolId, name, role });
      setName(''); onCreated(account, credentials);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear cuenta">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Colegio</label>
          <select style={inputStyle} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {(colegios || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Field label="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="María Fernanda Ríos" />
        <div>
          <label style={labelStyle}>Tipo de cuenta</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin de colegio</option>
            <option value="teacher">Profesor</option>
            <option value="student">Estudiante</option>
          </select>
        </div>
        {error && <div style={{ fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
        <PrimaryButton onClick={submit} disabled={busy || !colegios?.length}>{busy ? 'Creando…' : 'Crear cuenta'}</PrimaryButton>
        {!colegios?.length && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Primero crea un colegio en la sección "Colegios".</div>}
      </div>
    </Sheet>
  );
}

export default function SuperCuentas() {
  const [query, setQuery] = useState('');
  const [porColegio, setPorColegio] = useState(null);
  const [colegios, setColegios] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creds, setCreds] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => get(`/superadmin/cuentas${query ? `?q=${encodeURIComponent(query)}` : ''}`).then((d) => setPorColegio(d.porColegio));
  useEffect(() => { load(); }, [query]);
  useEffect(() => { get('/superadmin/colegios').then((d) => setColegios(d.colegios)); }, []);

  const onCreated = (account, credentials) => {
    setShowCreate(false);
    load();
    setCreds({ ...credentials, name: account.name });
  };

  const resetPassword = async (a) => {
    setBusyId(a.id);
    try {
      const { credentials } = await post(`/superadmin/cuentas/${a.id}/reset-password`);
      setCreds({ ...credentials, name: a.name, isReset: true });
    } finally { setBusyId(null); }
  };

  const removeAccount = async (id) => { if (!confirm('¿Eliminar esta cuenta?')) return; await del(`/superadmin/cuentas/${id}`); load(); };

  if (!porColegio) return null;

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 10 }}>
        <div className="h2">Cuentas</div>
        <button onClick={() => setShowCreate(true)} style={{
          marginLeft: 'auto', border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10,
          padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><Icon name="plus" size={16} stroke={2.3} /> Crear cuenta</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 10 }}>
        Todas las cuentas de la red, organizadas por colegio. Crea la primera cuenta admin de un colegio nuevo aquí — de ahí en adelante ese admin ya puede crear profesores y estudiantes desde su propio panel.
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
                <button onClick={() => resetPassword(a)} disabled={busyId === a.id} style={{ height: 30, padding: '0 10px', border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  {busyId === a.id ? 'Generando…' : 'Restablecer contraseña'}
                </button>
                <button onClick={() => removeAccount(a.id)} aria-label="Eliminar cuenta" style={{ width: 30, height: 30, border: 0, borderRadius: 8, background: 'transparent', color: 'var(--danger-500)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {porColegio.length === 0 && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14 }}>Sin resultados.</div>}
      <CreateAccountSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={onCreated} colegios={colegios} />
      <CredencialesModal creds={creds} onClose={() => setCreds(null)} />
    </Screen>
  );
}
