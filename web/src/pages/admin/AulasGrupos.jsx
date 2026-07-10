import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { StatusDot, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

export default function AdminAulasGrupos() {
  const nav = useNavigate();
  const [section, setSection] = useState('grupos');
  const [grupos, setGrupos] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [aulaForm, setAulaForm] = useState(null);
  const [grupoForm, setGrupoForm] = useState(null);

  const loadGrupos = () => get('/admin/grupos').then((d) => setGrupos(d.grupos));
  const loadRooms = () => get('/admin/aulas').then((d) => setRooms(d.aulas));
  useEffect(() => { loadGrupos(); loadRooms(); }, []);

  const addAula = async () => {
    if (!aulaForm?.name) return;
    await post('/admin/aulas', { name: aulaForm.name, building: aulaForm.building || 'Sin edificio' });
    setAulaForm(null); loadRooms();
  };
  const addGrupo = async () => {
    if (!grupoForm?.nombre || !grupoForm?.grado) return;
    await post('/admin/grupos', { grado: grupoForm.grado, nombre: grupoForm.nombre, roomId: grupoForm.roomId || rooms?.[0]?.id, tamano: Number(grupoForm.tamano) || 25 });
    setGrupoForm(null); loadGrupos();
  };

  if (!grupos || !rooms) return null;

  const Toggle = (
    <div style={{ display: 'flex', gap: 6, background: 'var(--ink-100)', padding: 4, borderRadius: 11, width: 'fit-content', marginBottom: 14 }}>
      {[['grupos', 'Grupos'], ['aulas', 'Aulas físicas']].map(([id, label]) => (
        <button key={id} onClick={() => setSection(id)} style={{
          border: 0, borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          background: section === id ? 'var(--white)' : 'transparent', color: section === id ? 'var(--fg-1)' : 'var(--fg-3)',
          boxShadow: section === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}>{label}</button>
      ))}
    </div>
  );

  if (section === 'aulas') {
    return (
      <Screen>
        {Toggle}
        <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 10 }}>
          Cada aula tiene un código fijo para su proyector. Se instala una vez y queda vinculada — los profesores la detectan solos según su horario.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button style={btnPrimary} onClick={() => setAulaForm(aulaForm ? null : { name: '', building: '' })}><Icon name="plus" size={16} stroke={2.3} /> Agregar aula</button>
        </div>
        {aulaForm && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
            <div style={{ flex: '1 1 160px' }}><label style={labelStyle}>Nombre</label><input style={inputStyle} value={aulaForm.name} onChange={(e) => setAulaForm((p) => ({ ...p, name: e.target.value }))} placeholder="Aula 305" /></div>
            <div style={{ flex: '1 1 160px' }}><label style={labelStyle}>Edificio</label><input style={inputStyle} value={aulaForm.building} onChange={(e) => setAulaForm((p) => ({ ...p, building: e.target.value }))} placeholder="Edificio C" /></div>
            <button style={btnPrimary} onClick={addAula}>Guardar</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
          {rooms.map((r) => (
            <div key={r.id} style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <StatusDot status={r.status} />
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{r.name}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>{r.building}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--indigo-600)' }}>{r.code}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: r.status === 'live' ? 'var(--coral-600)' : r.status === 'online' ? 'var(--success-500)' : 'var(--danger-500)' }}>
                  {r.status === 'live' ? 'Proyectando' : r.status === 'online' ? 'En línea' : 'Sin conexión'}
                </span>
              </div>
            </div>
          ))}
          {rooms.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Sin aulas registradas.</div>}
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      {Toggle}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button style={btnPrimary} onClick={() => setGrupoForm(grupoForm ? null : { grado: '', nombre: '', roomId: rooms[0]?.id, tamano: 25 })}><Icon name="plus" size={16} stroke={2.3} /> Crear grupo</button>
      </div>
      {grupoForm && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ flex: '1 1 100px' }}><label style={labelStyle}>Grado</label><input style={inputStyle} value={grupoForm.grado} onChange={(e) => setGrupoForm((p) => ({ ...p, grado: e.target.value }))} placeholder="6°" /></div>
          <div style={{ flex: '1 1 100px' }}><label style={labelStyle}>Nombre</label><input style={inputStyle} value={grupoForm.nombre} onChange={(e) => setGrupoForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="6°D" /></div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Aula fija</label>
            <select style={inputStyle} value={grupoForm.roomId} onChange={(e) => setGrupoForm((p) => ({ ...p, roomId: e.target.value }))}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 90px' }}><label style={labelStyle}>Tamaño máx.</label><input type="number" min="1" style={inputStyle} value={grupoForm.tamano} onChange={(e) => setGrupoForm((p) => ({ ...p, tamano: e.target.value }))} /></div>
          <button style={btnPrimary} onClick={addGrupo}>Guardar</button>
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 10 }}>Elige un grupo para ver su horario, estudiantes, profesores, notas y asistencia.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
        {grupos.map((g) => (
          <button key={g.id} onClick={() => nav(`/admin/aulas-grupos/${g.id}`)} style={{ textAlign: 'left', border: '1px solid var(--border-subtle)', background: 'var(--white)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{g.nombre}</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 3 }}>{g.aula || 'Sin aula'} · {g.estudiantes.length} estudiantes</div>
          </button>
        ))}
        {grupos.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Aún no hay grupos conformados. Ve a Matrícula y ejecuta el sorteo.</div>}
      </div>
    </Screen>
  );
}
