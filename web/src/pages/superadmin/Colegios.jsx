import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../../lib/api.js';
import { fmtFecha, fmtCOP, diasHasta } from '../../lib/format.js';
import { Screen } from '../../ui/Screen.jsx';
import { StatGrid, Chip, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const PLANES = ['Aula', 'Plantel', 'Campus'];

export default function SuperColegios() {
  const [overview, setOverview] = useState(null);
  const [colegios, setColegios] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => { get('/superadmin/overview').then((d) => setOverview(d.stats)); get('/superadmin/colegios').then((d) => setColegios(d.colegios)); };
  useEffect(() => { load(); }, []);
  if (!colegios || !overview) return null;

  const addSchool = async () => { if (!form?.name) return; await post('/superadmin/colegios', form); setForm(null); load(); };
  const toggleStatus = async (c) => { await patch(`/superadmin/colegios/${c.id}`, { status: c.status === 'Activo' ? 'Suspendido' : 'Activo' }); load(); };
  const removeSchool = async (id) => { if (!confirm('¿Eliminar este colegio y todas sus cuentas?')) return; await del(`/superadmin/colegios/${id}`); load(); };

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 14 }}>Colegios</div>
      <StatGrid stats={overview} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '14px 0 10px' }}>
        <button style={btnPrimary} onClick={() => setForm(form ? null : { name: '', city: '', plan: 'Aula' })}><Icon name="plus" size={16} stroke={2.3} /> Agregar colegio</button>
      </div>
      {form && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ flex: '1 1 180px' }}><label style={labelStyle}>Nombre</label><input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Colegio Nueva Era" /></div>
          <div style={{ flex: '1 1 140px' }}><label style={labelStyle}>Ciudad</label><input style={inputStyle} value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Bogotá" /></div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={labelStyle}>Plan</label>
            <select style={inputStyle} value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}>
              {PLANES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <button style={btnPrimary} onClick={addSchool}>Guardar</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {colegios.map((c) => {
          const dias = diasHasta(c.renueva);
          const vence = dias !== null && dias <= 30;
          return (
            <div key={c.id} style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '15px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{c.city}</div>
                </div>
                <Chip variant="info">{c.plan}</Chip>
                <Chip variant={c.status === 'Activo' ? 'success' : c.status === 'Prueba' ? 'info' : 'warning'}>{c.status}</Chip>
                <button onClick={() => toggleStatus(c)} style={{ height: 30, padding: '0 10px', border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  {c.status === 'Activo' ? 'Suspender' : 'Activar'}
                </button>
                <button onClick={() => removeSchool(c.id)} aria-label="Eliminar colegio" style={{ width: 30, height: 30, border: 0, borderRadius: 8, background: 'transparent', color: 'var(--danger-500)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-100)' }}>
                {[
                  { l: 'Cuentas', v: c.accounts.toLocaleString('es-CO') },
                  { l: 'Proyectores', v: c.projectors },
                  { l: 'Suscripción desde', v: fmtFecha(c.desde) },
                  { l: 'Renueva', v: fmtFecha(c.renueva), warn: vence },
                  { l: 'Ingreso / mes', v: fmtCOP(c.ingresoMensual) },
                ].map((f, fi) => (
                  <div key={fi} style={{ flex: '1 1 110px', minWidth: 100 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', fontWeight: 700 }}>{f.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: f.warn ? 'var(--coral-600)' : 'var(--fg-1)', marginTop: 2 }}>{f.v}{f.warn && dias >= 0 ? ` · ${dias}d` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
