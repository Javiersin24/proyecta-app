import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, patch, put, del } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { Avatar, Chip, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const ASISTENCIA_OPTS = ['Presente', 'Tarde', 'Ausente'];

export default function AdminGrupoDetail() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const [grupo, setGrupo] = useState(null);
  const [gTab, setGTab] = useState('horario');
  const [horarioForm, setHorarioForm] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [profesores, setProfesores] = useState([]);

  const load = () => get(`/admin/grupos/${groupId}`).then((d) => setGrupo(d.grupo));
  useEffect(() => { load(); get('/admin/aulas').then((d) => setRooms(d.aulas)); get('/admin/profesores').then((d) => setProfesores(d.profesores)); }, [groupId]);
  if (!grupo) return null;

  const tamano = grupo.tamano || 25;
  const ocupacion = grupo.estudiantes.length;
  const horas = [...new Set(grupo.horario.map((h) => h.hora))].sort();
  const findSlot = (dia, hora) => grupo.horario.find((h) => h.dia === dia && h.hora === hora);
  const profMap = {};
  grupo.horario.forEach((h) => { if (!h.profesor) return; (profMap[h.profesor] ||= new Set()).add(h.materia); });
  const materias = [...new Set(grupo.horario.map((h) => h.materia))];

  const setTamano = async (v) => { await patch(`/admin/grupos/${groupId}`, { tamano: Number(v) || 1 }); load(); };
  const cycleAula = async () => {
    if (!rooms.length) return;
    const idx = rooms.findIndex((r) => r.id === grupo.roomId);
    const next = rooms[(idx + 1) % rooms.length];
    await patch(`/admin/grupos/${groupId}`, { roomId: next.id }); load();
  };
  const addHorario = async () => {
    if (!horarioForm?.materia || !horarioForm?.dia) return;
    await post(`/admin/grupos/${groupId}/horario`, horarioForm);
    setHorarioForm(null); load();
  };
  const removeHorario = async (slotId) => { await del(`/admin/grupos/${groupId}/horario/${slotId}`); load(); };
  const setAsistencia = async (studentName, estado) => { await put(`/admin/grupos/${groupId}/asistencia`, { studentName, estado }); load(); };

  const GTabs = (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', marginTop: 14, overflowX: 'auto' }}>
      {[['horario', 'Horario'], ['estudiantes', 'Estudiantes'], ['profesores', 'Profesores'], ['notas', 'Notas'], ['asistencia', 'Asistencia']].map(([id, label]) => (
        <button key={id} onClick={() => setGTab(id)} style={{
          border: 0, borderBottom: gTab === id ? '2.5px solid var(--indigo-500)' : '2.5px solid transparent',
          background: 'transparent', padding: '10px 14px', marginBottom: -1, whiteSpace: 'nowrap',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', color: gTab === id ? 'var(--indigo-600)' : 'var(--fg-3)',
        }}>{label}</button>
      ))}
    </div>
  );

  return (
    <Screen>
      <div onClick={() => nav('/admin/aulas-grupos')} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--indigo-600)', cursor: 'pointer', marginBottom: 10 }}>← Grupos</div>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{grupo.nombre}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{ocupacion} / {tamano} estudiantes</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, margin: 0 }}>Tamaño máx.</label>
          <input type="number" min={ocupacion || 1} value={tamano} onChange={(e) => setTamano(e.target.value)} style={{ width: 64, textAlign: 'center', padding: '7px 4px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }} />
          <button onClick={cycleAula} title="Cambiar aula fija" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: 'var(--indigo-600)', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>Aula fija: {grupo.aula || '—'}</button>
        </div>
      </div>

      {GTabs}

      <div style={{ marginTop: 14 }}>
        {gTab === 'horario' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button style={btnPrimary} onClick={() => setHorarioForm(horarioForm ? null : { materia: '', profesorId: '', dia: 'Lunes', hora: '' })}><Icon name="plus" size={16} stroke={2.3} /> Agregar clase</button>
            </div>
            {horarioForm && (
              <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <div style={{ flex: '1 1 140px' }}><label style={labelStyle}>Materia</label><input style={inputStyle} value={horarioForm.materia} onChange={(e) => setHorarioForm((p) => ({ ...p, materia: e.target.value }))} placeholder="Matemáticas" /></div>
                <div style={{ flex: '1 1 160px' }}>
                  <label style={labelStyle}>Profesor</label>
                  <select style={inputStyle} value={horarioForm.profesorId} onChange={(e) => setHorarioForm((p) => ({ ...p, profesorId: e.target.value }))}>
                    <option value="">Sin asignar</option>
                    {profesores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 110px' }}>
                  <label style={labelStyle}>Día</label>
                  <select style={inputStyle} value={horarioForm.dia} onChange={(e) => setHorarioForm((p) => ({ ...p, dia: e.target.value }))}>
                    {DIAS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 90px' }}><label style={labelStyle}>Hora</label><input style={inputStyle} value={horarioForm.hora} onChange={(e) => setHorarioForm((p) => ({ ...p, hora: e.target.value }))} placeholder="08:00" /></div>
                <button style={btnPrimary} onClick={addHorario}>Guardar</button>
              </div>
            )}
            {!grupo.horario.length ? (
              <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Sin clases asignadas.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${DIAS.length}, minmax(120px,1fr))`, gap: 1, background: 'var(--ink-200)', border: '1px solid var(--ink-200)', borderRadius: 14, overflow: 'hidden', minWidth: 640 }}>
                  <div style={{ background: 'var(--paper-50)' }} />
                  {DIAS.map((d) => <div key={d} style={{ background: 'var(--white)', padding: '10px 8px', textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: 'var(--fg-2)', textTransform: 'uppercase' }}>{d}</div>)}
                  {horas.map((hora) => (
                    <div key={hora} style={{ display: 'contents' }}>
                      <div style={{ background: 'var(--paper-50)', padding: '10px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', fontWeight: 700 }}>{hora}</div>
                      {DIAS.map((dia) => {
                        const slot = findSlot(dia, hora);
                        return (
                          <div key={dia + hora} style={{ background: slot ? 'var(--indigo-50)' : 'var(--white)', padding: slot ? '8px 10px' : 0, minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                            {slot && (
                              <>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--indigo-700)', paddingRight: 18 }}>{slot.materia}</div>
                                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{slot.profesor || 'Sin asignar'}</div>
                                <button onClick={() => removeHorario(slot.id)} aria-label="Quitar" style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, border: 0, borderRadius: 6, background: 'transparent', color: 'var(--fg-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={12} /></button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {gTab === 'estudiantes' && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
            {grupo.estudiantes.map((st, i) => (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                <Avatar name={st} size={32} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{st}</span>
              </div>
            ))}
            {!grupo.estudiantes.length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Aún no hay estudiantes asignados a este grupo.</div>}
          </div>
        )}

        {gTab === 'profesores' && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
            {Object.entries(profMap).map(([prof, mats], i) => (
              <div key={prof} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                <Avatar name={prof} size={32} />
                <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{prof}</div><div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{[...mats].join(', ')}</div></div>
              </div>
            ))}
            {!Object.keys(profMap).length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Aún no hay profesores asignados — agrega clases en la pestaña Horario.</div>}
          </div>
        )}

        {gTab === 'notas' && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'auto' }}>
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Chip variant="muted">Solo lectura · las registra el profesor</Chip>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--ink-200)' }}>Estudiante</th>
                  {materias.map((m) => <th key={m} style={{ padding: '10px 10px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--ink-200)' }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {grupo.estudiantes.map((st) => (
                  <tr key={st}>
                    <td style={{ padding: '8px 14px', fontWeight: 600, borderBottom: '1px solid var(--ink-100)', whiteSpace: 'nowrap' }}>{st}</td>
                    {materias.map((m) => {
                      const val = grupo.calificaciones[`${m}|${st}`] ?? '';
                      return <td key={m} style={{ padding: '8px 8px', borderBottom: '1px solid var(--ink-100)', textAlign: 'center' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: val === '' ? 'var(--fg-3)' : 'var(--fg-1)' }}>{val === '' ? '—' : val}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!materias.length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Aún no hay materias en el horario de este grupo.</div>}
          </div>
        )}

        {gTab === 'asistencia' && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
            {grupo.estudiantes.map((st, i) => (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                <Avatar name={st} size={32} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{st}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {ASISTENCIA_OPTS.map((opt) => {
                    const on = grupo.asistencia[st] === opt;
                    return (
                      <button key={opt} onClick={() => setAsistencia(st, opt)} style={{
                        border: on ? '1.5px solid var(--indigo-500)' : '1px solid var(--ink-200)',
                        background: on ? 'var(--indigo-50)' : 'var(--white)', color: on ? 'var(--indigo-700)' : 'var(--fg-2)',
                        borderRadius: 999, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                      }}>{opt}</button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!grupo.estudiantes.length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Sin estudiantes en este grupo.</div>}
          </div>
        )}
      </div>
    </Screen>
  );
}
