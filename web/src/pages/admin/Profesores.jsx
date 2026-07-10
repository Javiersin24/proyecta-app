import { useEffect, useState } from 'react';
import { get, post, patch } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { Avatar, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const MATERIAS_CATALOGO = ['Matemáticas', 'Física', 'Química', 'Español', 'Inglés', 'Historia', 'Ciencias Naturales', 'Educación Física'];
const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

export default function AdminProfesores() {
  const [profesores, setProfesores] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => get('/admin/profesores').then((d) => setProfesores(d.profesores));
  useEffect(() => { load(); }, []);

  const toggleMateria = (mat) => setForm((f) => ({ ...f, materias: f.materias.includes(mat) ? f.materias.filter((x) => x !== mat) : [...f.materias, mat] }));
  const add = async () => {
    if (!form?.name) return;
    await post('/admin/profesores', { name: form.name, materias: form.materias, capacidad: Number(form.capacidad) || 3 });
    setForm(null); load();
  };
  const setCap = async (id, cap) => { await patch(`/admin/profesores/${id}`, { capacidad: cap }); load(); };

  if (!profesores) return null;

  return (
    <Screen>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="h2">Profesores</div>
        <button style={btnPrimary} onClick={() => setForm(form ? null : { name: '', materias: [], capacidad: '3' })}><Icon name="plus" size={16} stroke={2.3} /> Agregar profesor</button>
      </div>

      {form && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 180px' }}><label style={labelStyle}>Nombre</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" /></div>
            <div style={{ flex: '0 0 160px' }}><label style={labelStyle}>Capacidad (grupos)</label><input type="number" min="1" style={inputStyle} value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} /></div>
          </div>
          <div>
            <label style={labelStyle}>Materias que dicta</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {MATERIAS_CATALOGO.map((mat) => {
                const on = form.materias.includes(mat);
                return (
                  <button key={mat} onClick={() => toggleMateria(mat)} style={{
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                    border: on ? '1.5px solid var(--indigo-500)' : '1px solid var(--ink-200)',
                    background: on ? 'var(--indigo-50)' : 'var(--white)', color: on ? 'var(--indigo-700)' : 'var(--fg-2)', fontSize: 12, fontWeight: 600,
                  }}>{mat}</button>
                );
              })}
            </div>
          </div>
          <div><button style={btnPrimary} onClick={add}>Guardar profesor</button></div>
        </div>
      )}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        {profesores.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
            <Avatar name={p.name} size={32} />
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{p.materias.join(' · ')}</div>
            </div>
            <input type="number" min="1" value={p.capacidad} onChange={(e) => setCap(p.id, Number(e.target.value) || 1)}
              style={{ width: 52, textAlign: 'center', padding: '5px 4px', border: '1px solid var(--ink-200)', borderRadius: 7, fontSize: 12.5 }} title="Capacidad de grupos" />
          </div>
        ))}
        {profesores.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>Aún no hay profesores registrados.</div>}
      </div>
    </Screen>
  );
}
