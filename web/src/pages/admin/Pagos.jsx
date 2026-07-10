import { useEffect, useState } from 'react';
import { get, post, patch } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { StatGrid, Chip, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const statusVariant = (s) => (s === 'Pagado' ? 'success' : s === 'Vencido' ? 'danger' : 'warning');

export default function AdminPagos() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => get('/admin/pagos').then((d) => setItems(d.pagos));
  useEffect(() => { load(); }, []);
  if (!items) return null;

  const markPaid = (id) => patch(`/admin/pagos/${id}`, { status: 'Pagado' }).then(load);
  const add = async () => {
    if (!form?.student || !form?.monto) return;
    await post('/admin/pagos', { student: form.student, concepto: form.concepto || 'Pensión', monto: Number(form.monto), vence: form.vence || '—' });
    setForm(null); load();
  };

  const total = items.filter((p) => p.status === 'Pagado').reduce((s, p) => s + (p.monto || 0), 0);
  const pendiente = items.filter((p) => p.status === 'Pendiente').length;
  const vencido = items.filter((p) => p.status === 'Vencido').length;

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 14 }}>Pagos</div>
      <StatGrid stats={[
        { n: '$' + total.toLocaleString('es-CO'), l: 'Recaudado este mes' },
        { n: pendiente, l: 'Pagos pendientes' },
        { n: vencido, l: 'Pagos vencidos' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '14px 0' }}>
        <button style={btnPrimary} onClick={() => setForm(form ? null : { student: '', concepto: '', monto: '', vence: '' })}><Icon name="plus" size={16} stroke={2.3} /> Registrar cargo</button>
      </div>
      {form && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ flex: '1 1 160px' }}><label style={labelStyle}>Estudiante</label><input style={inputStyle} value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="Nombre" /></div>
          <div style={{ flex: '1 1 140px' }}><label style={labelStyle}>Concepto</label><input style={inputStyle} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Pensión julio" /></div>
          <div style={{ flex: '1 1 100px' }}><label style={labelStyle}>Monto</label><input style={inputStyle} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="450000" /></div>
          <div style={{ flex: '1 1 110px' }}><label style={labelStyle}>Vence</label><input style={inputStyle} value={form.vence} onChange={(e) => setForm({ ...form, vence: e.target.value })} placeholder="31 jul" /></div>
          <button style={btnPrimary} onClick={add}>Guardar</button>
        </div>
      )}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        {items.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.student}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{p.concepto} · vence {p.vence}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>${(p.monto || 0).toLocaleString('es-CO')}</span>
            <Chip variant={statusVariant(p.status)}>{p.status}</Chip>
            {p.status !== 'Pagado' && <button onClick={() => markPaid(p.id)} style={{ ...btnPrimary, height: 32, fontSize: 11.5, padding: '0 12px' }}>Marcar pagado</button>}
          </div>
        ))}
        {items.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>Sin cargos registrados.</div>}
      </div>
    </Screen>
  );
}
