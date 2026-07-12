import { Fragment, useEffect, useRef, useState } from 'react';
import { get, put } from '../../lib/api.js';
import { TopBar, Avatar, Chip, EmptyState } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const PALETTE = ['var(--indigo-500)', 'var(--coral-500)', '#0EA5A0', '#8B5CF6', '#D99400'];
const GB_MAX = 5, GB_PASS = 3;
const gbFmt = (n) => (n == null ? '—' : n.toFixed(1));
const gbColor = (n) => (n == null ? 'var(--fg-3)' : n >= GB_PASS ? '#1a6b47' : '#B42318');
let seq = 0;
const gbId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function buildDefaultGradebook(roster) {
  return {
    cats: [
      { id: gbId('cat'), name: 'Talleres', cols: [{ id: gbId('c'), label: 'Taller 1' }, { id: gbId('c'), label: 'Taller 2' }] },
      { id: gbId('cat'), name: 'Tareas', cols: [{ id: gbId('c'), label: 'Tarea 1' }, { id: gbId('c'), label: 'Tarea 2' }] },
      { id: gbId('cat'), name: 'Quizes', cols: [{ id: gbId('c'), label: 'Quiz 1' }] },
      { id: gbId('cat'), name: 'Ejercicios', cols: [{ id: gbId('c'), label: 'Ejercicio 1' }] },
    ],
    rows: roster.map((name) => ({ id: gbId('r'), name })),
    grades: {},
  };
}

export default function TeacherCalificacionesScreen() {
  const [classes, setClasses] = useState(null);
  const [selId, setSelId] = useState(null);
  useEffect(() => { get('/teacher/classes').then((d) => setClasses(d.classes)); }, []);
  if (!classes) return null;
  const clase = classes.find((c) => c.id === selId);

  if (!classes.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Calificaciones" subtitle="Libro de notas por clase" />
        <div style={{ padding: '4px 16px 24px' }}><EmptyState icon="award" title="Sin clases" body="Cuando crees una clase, podrás registrar sus notas aquí." /></div>
      </div>
    );
  }
  if (!clase) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Calificaciones" subtitle="Elige una clase" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>Selecciona una de tus clases para ver o editar su libro de calificaciones.</div>
          {classes.map((c) => {
            const color = PALETTE[(c.paletteIdx || 0) % PALETTE.length];
            const n = (c.students || []).length || c.studentCount || 0;
            return (
              <button key={c.id} onClick={() => setSelId(c.id)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '13px 15px', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: color, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0, fontWeight: 800, fontSize: 15 }}>{c.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{c.section} · {n} estudiantes</div></div>
                <Icon name="chevron" size={18} color="var(--fg-3)" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Calificaciones" subtitle={`${clase.name} · ${clase.section}`} onBack={() => setSelId(null)} />
      <Gradebook key={clase.id} classId={clase.id} roster={(clase.students || []).map((s) => s.name)} />
    </div>
  );
}

function Gradebook({ classId, roster }) {
  const [gb, setGbRaw] = useState(null);
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState(true);
  const [newStudent, setNewStudent] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    get(`/teacher/classes/${classId}/gradebook`).then((d) => setGbRaw(d.gradebook || buildDefaultGradebook(roster)));
  }, [classId]);

  const setGb = (updater) => {
    setGbRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setSaved(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await put(`/teacher/classes/${classId}/gradebook`, next);
        setSaved(true);
      }, 500);
      return next;
    });
  };

  if (!gb) return null;

  const key = (rowId, colId) => `${rowId}::${colId}`;
  const setGrade = (rowId, colId, v) => setGb((p) => ({ ...p, grades: { ...p.grades, [key(rowId, colId)]: v } }));
  const num = (rowId, colId) => { const v = parseFloat(gb.grades[key(rowId, colId)]); return Number.isFinite(v) ? Math.min(GB_MAX, Math.max(0, v)) : null; };
  const catAvg = (rowId, cat) => { const xs = cat.cols.map((c) => num(rowId, c.id)).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const finalAvg = (rowId) => { const xs = gb.cats.map((c) => catAvg(rowId, c)).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const colClassAvg = (colId) => { const xs = gb.rows.map((r) => num(r.id, colId)).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const catClassAvg = (cat) => { const xs = gb.rows.map((r) => catAvg(r.id, cat)).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const finalClassAvg = () => { const xs = gb.rows.map((r) => finalAvg(r.id)).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };

  const renameCat = (catId, name) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, name } : c)) }));
  const addCat = () => setGb((p) => ({ ...p, cats: [...p.cats, { id: gbId('cat'), name: 'Nueva categoría', cols: [{ id: gbId('c'), label: 'Nota 1' }] }] }));
  const delCat = (catId) => setGb((p) => ({ ...p, cats: p.cats.filter((c) => c.id !== catId) }));
  const renameCol = (catId, colId, label) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: c.cols.map((k) => (k.id === colId ? { ...k, label } : k)) } : c)) }));
  const addCol = (catId) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: [...c.cols, { id: gbId('c'), label: `Nota ${c.cols.length + 1}` }] } : c)) }));
  const delCol = (catId, colId) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: c.cols.filter((k) => k.id !== colId) } : c)) }));
  const delRow = (rowId) => setGb((p) => ({ ...p, rows: p.rows.filter((r) => r.id !== rowId) }));
  const addRow = () => { const n = newStudent.trim(); if (!n) return; setGb((p) => ({ ...p, rows: [...p.rows, { id: gbId('r'), name: n }] })); setNewStudent(''); };

  const th = { padding: '8px 6px', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', borderBottom: '1px solid var(--ink-200)', background: 'var(--paper-50)', whiteSpace: 'nowrap' };
  const stickyName = { position: 'sticky', left: 0, zIndex: 3, background: 'var(--white)', textAlign: 'left', minWidth: 150, boxShadow: '2px 0 0 var(--ink-200)' };
  const stickyHead = { ...stickyName, background: 'var(--paper-50)', zIndex: 4 };
  const cell = { padding: '0', borderBottom: '1px solid var(--ink-200)', borderRight: '1px solid var(--ink-100)', textAlign: 'center' };
  const promCell = { ...cell, background: 'var(--paper-50)', fontWeight: 800 };
  const miniInput = (val, onCh, extra = {}) => (
    <input value={val} onChange={(e) => onCh(e.target.value)} style={{ width: '100%', border: '1px solid var(--ink-200)', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700, background: 'var(--white)', ...extra }} />
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,20,32,0.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--white)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '26px 24px 18px', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FEE4E2', color: '#B42318', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Icon name="trash" size={26} /></div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>¿Eliminar a {confirmDel.name}?</div>
              <div style={{ fontSize: 13.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>Se borrarán todas sus notas de esta tabla de forma permanente.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid var(--ink-200)', background: 'var(--white)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { delRow(confirmDel.id); setConfirmDel(null); }} style={{ flex: 1, height: 46, borderRadius: 12, border: 0, background: '#D92D20', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, fontSize: 12.5, color: 'var(--fg-3)' }}>{gb.rows.length} estudiantes · escala 0–5.0 · aprueba con {GB_PASS.toFixed(1)}</div>
        <button onClick={() => setEdit((e) => !e)} style={{ height: 38, padding: '0 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, border: edit ? '1px solid transparent' : '1px solid var(--ink-200)', background: edit ? 'var(--indigo-600)' : 'var(--white)', color: edit ? '#fff' : 'var(--fg-1)' }}>
          <Icon name={edit ? 'check' : 'edit'} size={16} /> {edit ? 'Listo' : 'Editar tabla'}
        </button>
      </div>

      {edit && <button onClick={addCat} style={{ height: 34, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, border: '1px dashed var(--indigo-500)', background: 'var(--indigo-50)', color: 'var(--indigo-700)', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}><Icon name="plus" size={15} /> Categoría</button>}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...th, ...stickyHead }}>Estudiante</th>
                {gb.cats.map((cat) => (
                  <th key={cat.id} colSpan={cat.cols.length + 1} style={{ ...th, borderRight: '2px solid var(--ink-200)', borderLeft: '1px solid var(--ink-100)' }}>
                    {edit ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        {miniInput(cat.name, (v) => renameCat(cat.id, v), { width: 98, textAlign: 'center' })}
                        <button onClick={() => addCol(cat.id)} title="Añadir columna" style={{ border: 0, background: 'var(--indigo-100)', color: 'var(--indigo-700)', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', fontWeight: 800, flexShrink: 0 }}>+</button>
                        <button onClick={() => delCat(cat.id)} title="Eliminar categoría" style={{ border: 0, background: '#FEE2E2', color: '#B42318', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={13} /></button>
                      </div>
                    ) : <span style={{ fontSize: 12, fontWeight: 800 }}>{cat.name}</span>}
                  </th>
                ))}
                <th rowSpan={2} style={{ ...th, background: 'var(--indigo-50)', color: 'var(--indigo-700)', minWidth: 74 }}>Definitiva</th>
                {edit && <th rowSpan={2} style={{ ...th, minWidth: 40 }} />}
              </tr>
              <tr>
                {gb.cats.map((cat) => (
                  <Fragment key={cat.id}>
                    {cat.cols.map((col) => (
                      <th key={col.id} style={{ ...th, minWidth: edit ? 92 : 54, borderLeft: '1px solid var(--ink-100)' }}>
                        {edit ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {miniInput(col.label, (v) => renameCol(cat.id, col.id, v), { fontSize: 10 })}
                            <button onClick={() => delCol(cat.id, col.id)} style={{ border: 0, background: 'transparent', color: '#B42318', cursor: 'pointer', flexShrink: 0, padding: 2 }}><Icon name="x" size={13} /></button>
                          </div>
                        ) : <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)' }}>{col.label}</span>}
                      </th>
                    ))}
                    <th style={{ ...th, background: 'var(--paper-50)', color: 'var(--fg-2)', minWidth: 46, borderRight: '2px solid var(--ink-200)' }}>Prom.</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {gb.rows.map((r, ri) => (
                <tr key={r.id}>
                  <td style={{ ...cell, ...stickyName, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', width: 16, textAlign: 'right', flexShrink: 0 }}>{ri + 1}</span>
                      <Avatar name={r.name} size={26} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.name}</span>
                    </div>
                  </td>
                  {gb.cats.map((cat) => (
                    <Fragment key={cat.id}>
                      {cat.cols.map((col) => (
                        <td key={col.id} style={cell}>
                          <input inputMode="decimal" value={gb.grades[key(r.id, col.id)] ?? ''} onChange={(e) => setGrade(r.id, col.id, e.target.value)} placeholder="–" style={{ width: '100%', minWidth: 46, height: 38, border: 0, background: 'transparent', textAlign: 'center', fontSize: 13, fontWeight: 600 }} />
                        </td>
                      ))}
                      <td style={{ ...promCell, borderRight: '2px solid var(--ink-200)', color: gbColor(catAvg(r.id, cat)), fontSize: 13 }}>{gbFmt(catAvg(r.id, cat))}</td>
                    </Fragment>
                  ))}
                  <td style={{ ...promCell, background: 'var(--indigo-50)', color: gbColor(finalAvg(r.id)), fontSize: 14.5 }}>{gbFmt(finalAvg(r.id))}</td>
                  {edit && <td style={{ ...cell, borderRight: 0 }}><button onClick={() => setConfirmDel({ id: r.id, name: r.name })} style={{ border: 0, background: 'transparent', color: '#B42318', cursor: 'pointer', padding: 8, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={15} /></button></td>}
                </tr>
              ))}
              <tr>
                <td style={{ ...cell, ...stickyName, padding: '9px 10px', background: 'var(--paper-50)', fontSize: 11.5, fontWeight: 800, color: 'var(--fg-2)' }}>Promedio del curso</td>
                {gb.cats.map((cat) => (
                  <Fragment key={cat.id}>
                    {cat.cols.map((col) => <td key={col.id} style={{ ...cell, background: 'var(--paper-50)', fontSize: 11.5, fontWeight: 700, color: gbColor(colClassAvg(col.id)) }}>{gbFmt(colClassAvg(col.id))}</td>)}
                    <td style={{ ...cell, background: 'var(--ink-100)', borderRight: '2px solid var(--ink-200)', fontSize: 12, fontWeight: 800, color: gbColor(catClassAvg(cat)) }}>{gbFmt(catClassAvg(cat))}</td>
                  </Fragment>
                ))}
                <td style={{ ...cell, background: 'var(--indigo-100)', fontSize: 13, fontWeight: 800, color: gbColor(finalClassAvg()) }}>{gbFmt(finalClassAvg())}</td>
                {edit && <td style={{ ...cell, background: 'var(--paper-50)', borderRight: 0 }} />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={newStudent} onChange={(e) => setNewStudent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRow()} placeholder="Nombre del estudiante" style={{ flex: 1, height: 40, border: '1px solid var(--ink-200)', borderRadius: 10, padding: '0 12px', fontSize: 13 }} />
          <button onClick={addRow} style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 0, background: 'var(--indigo-600)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><Icon name="plus" size={16} /> Estudiante</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12, color: saved ? '#1a6b47' : 'var(--fg-3)', fontWeight: 600 }}>
        <Icon name="check" size={15} /> {saved ? 'Cambios guardados' : 'Guardando…'}
      </div>
    </div>
  );
}
