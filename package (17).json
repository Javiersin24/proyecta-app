import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../../lib/api.js';
import { Screen, Sheet } from '../../ui/Screen.jsx';
import { StatGrid, StatusDot, Field, PrimaryButton, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const statusColor = (s) => (s === 'live' ? 'var(--coral-600)' : s === 'online' ? 'var(--success-500)' : 'var(--danger-500)');
const statusLabel = (s) => (s === 'live' ? 'Proyectando' : s === 'online' ? 'En línea' : 'Sin conexión');

function ProyectorSheet({ open, onClose, proyector, colegios, onSaved, onDeleted }) {
  const isEdit = !!proyector;
  const [name, setName] = useState('');
  const [aula, setAula] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(proyector?.name || '');
      setAula(proyector?.aula || '');
      setSchoolId(proyector?.schoolId || colegios?.[0]?.id || '');
      setConfirmDelete(false);
    }
  }, [open, proyector, colegios]);

  const submit = async () => {
    setBusy(true);
    try {
      if (isEdit) {
        const { proyector: p } = await patch(`/superadmin/proyectores/${proyector.id}`, { name, aula, schoolId });
        onSaved(p);
      } else {
        const { proyector: p } = await post('/superadmin/proyectores', { name, aula, schoolId });
        onSaved(p);
      }
    } finally { setBusy(false); }
  };

  const toggleEnabled = async () => {
    setBusy(true);
    try { const { proyector: p } = await patch(`/superadmin/proyectores/${proyector.id}`, { enabled: !proyector.enabled }); onSaved(p); }
    finally { setBusy(false); }
  };

  const regenCode = async () => {
    setBusy(true);
    try { const { proyector: p } = await patch(`/superadmin/proyectores/${proyector.id}`, { regenCode: true }); onSaved(p); }
    finally { setBusy(false); }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(proyector.code).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const confirmedDelete = async () => {
    setBusy(true);
    try { await del(`/superadmin/proyectores/${proyector.id}`); onDeleted(proyector.id); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Editar proyector' : 'Nuevo proyector'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Proyector Sala 4B" />
        <Field label="Aula / salón" value={aula} onChange={(e) => setAula(e.target.value)} placeholder="4B" />
        <div>
          <label style={labelStyle}>Colegio</label>
          <select style={inputStyle} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {(colegios || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {isEdit && (
          <div style={{ border: '1px solid var(--ink-200)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase' }}>Código de activación</div>
                <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.06em' }}>{proyector.code}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{proyector.linked ? 'Vinculado a un dispositivo' : 'Sin vincular todavía'}</div>
              </div>
              <button onClick={copyCode} title="Copiar código" style={{ width: 34, height: 34, border: 0, borderRadius: 9, background: 'var(--indigo-50)', color: 'var(--indigo-600)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Icon name={copied ? 'check' : 'copy'} size={15} />
              </button>
              <button onClick={regenCode} disabled={busy} title="Regenerar código" style={{ width: 34, height: 34, border: 0, borderRadius: 9, background: 'var(--ink-100)', color: 'var(--fg-2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Icon name="refresh" size={15} />
              </button>
            </div>
            <button onClick={toggleEnabled} disabled={busy} style={{
              height: 40, border: 0, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: proyector.enabled ? 'var(--coral-50)' : 'var(--success-100)', color: proyector.enabled ? 'var(--coral-600)' : '#1a6b47',
            }}>{proyector.enabled ? 'Suspender proyector' : 'Reactivar proyector'}</button>
          </div>
        )}

        <PrimaryButton onClick={submit} disabled={busy || !name.trim() || !schoolId}>{busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear proyector'}</PrimaryButton>

        {isEdit && (
          confirmDelete ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 44, border: '1px solid var(--ink-200)', borderRadius: 12, background: 'var(--white)', color: 'var(--fg-2)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmedDelete} disabled={busy} style={{ flex: 1, height: 44, border: 0, borderRadius: 12, background: 'var(--danger-500)', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{busy ? 'Eliminando…' : 'Confirmar eliminación'}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ height: 40, border: 0, background: 'transparent', color: 'var(--danger-500)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Eliminar proyector</button>
          )
        )}
      </div>
    </Sheet>
  );
}

export default function SuperProyectores() {
  const [porColegio, setPorColegio] = useState(null);
  const [colegios, setColegios] = useState(null);
  const [sheetFor, setSheetFor] = useState(null); // { editing: proyector|null }

  const load = () => get('/superadmin/proyectores').then((d) => setPorColegio(d.porColegio));
  useEffect(() => { load(); get('/superadmin/colegios').then((d) => setColegios(d.colegios)); }, []);

  if (!porColegio) return null;
  const all = porColegio.flatMap((g) => g.proyectores);

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div className="h2">Proyectores</div>
        <button onClick={() => setSheetFor({ editing: null })} style={{
          marginLeft: 'auto', border: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', borderRadius: 9,
          padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}><Icon name="plus" size={15} stroke={2.4} /> Nuevo proyector</button>
      </div>
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
                <button key={p.id} onClick={() => setSheetFor({ editing: p })} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap',
                  borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left',
                }}>
                  <StatusDot status={p.enabled ? p.status : 'offline'} />
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.aula} · {p.code}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', flex: '1 1 180px' }}>{p.activity}</div>
                  {!p.enabled && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger-500)' }}>Suspendido</span>}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: statusColor(p.enabled ? p.status : 'offline') }}>{p.enabled ? statusLabel(p.status) : 'Suspendido'}</span>
                  <Icon name="chevron" size={16} color="var(--fg-3)" />
                </button>
              ))}
              {g.proyectores.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>Sin proyectores.</div>}
            </div>
          </div>
        ))}
      </div>

      <ProyectorSheet
        open={!!sheetFor}
        proyector={sheetFor?.editing}
        colegios={colegios}
        onClose={() => setSheetFor(null)}
        onSaved={() => { setSheetFor(null); load(); }}
        onDeleted={() => { setSheetFor(null); load(); }}
      />
    </Screen>
  );
}
