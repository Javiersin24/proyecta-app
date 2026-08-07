import { Fragment, useEffect, useRef, useState } from 'react';
import { get, put, postFile, fetchBlob } from '../../lib/api.js';
import { TopBar, Avatar, Chip, EmptyState } from '../../ui/kit.jsx';
import { gbFmtIn, gbColorIn, gbId, gbScaleOf, gbFinalFromCats, gbHasWeights, SCALE_PRESETS, buildDefaultGradebook } from '../../lib/gradebook.js';
import Icon from '../../ui/Icon.jsx';

const PALETTE = ['var(--indigo-500)', 'var(--coral-500)', '#0EA5A0', '#8B5CF6', '#D99400'];

// Combina una vista previa importada con el libro de notas actual, SIN duplicar:
// empareja columnas por su nombre (o "Categoría · Columna") y estudiantes por su
// nombre. Lo nuevo se agrega; lo existente se actualiza. Las columnas que no
// existían caen en una categoría "Importadas".
function mergeImport(gb, preview) {
  const norm = (s) => String(s).trim().toLowerCase();
  const next = { cats: gb.cats.map((c) => ({ ...c, cols: [...c.cols] })), rows: [...gb.rows], grades: { ...gb.grades } };

  const colByKey = {};
  next.cats.forEach((cat) => cat.cols.forEach((col) => {
    colByKey[norm(col.label)] = col.id;
    colByKey[norm(`${cat.name} · ${col.label}`)] = col.id;
  }));
  let importCat = null;
  const ensureImportCat = () => {
    if (!importCat) { importCat = { id: gbId('cat'), name: 'Importadas', cols: [] }; next.cats.push(importCat); }
    return importCat;
  };
  const resolveCol = (label) => {
    if (colByKey[norm(label)]) return colByKey[norm(label)];
    const after = label.includes('·') ? label.split('·').pop().trim() : label;
    if (colByKey[norm(after)]) return colByKey[norm(after)];
    const cat = ensureImportCat();
    const id = gbId('c');
    cat.cols.push({ id, label: after });
    colByKey[norm(after)] = id;
    return id;
  };
  const colIds = preview.columns.map(resolveCol);

  const rowByName = {};
  next.rows.forEach((r) => { rowByName[norm(r.name)] = r.id; });
  let added = 0, updated = 0;
  preview.students.forEach((st) => {
    let rid = rowByName[norm(st.name)];
    if (!rid) { rid = gbId('r'); next.rows.push({ id: rid, name: st.name }); rowByName[norm(st.name)] = rid; added++; }
    else updated++;
    preview.columns.forEach((label, ci) => {
      const v = st.grades[label];
      if (v == null || v === '') return;
      next.grades[`${rid}::${colIds[ci]}`] = String(v);
    });
  });
  return { gb: next, added, updated };
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
  const [preview, setPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [showCfg, setShowCfg] = useState(false);
  const fileRef = useRef(null);
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

  const scale = gbScaleOf(gb);
  const fmt = (n) => gbFmtIn(n, scale);
  const color = (n) => gbColorIn(n, scale);
  const ponderado = gbHasWeights(gb);
  const sumaPesos = gb.cats.reduce((s, c) => s + (Number(c.peso) || 0), 0);

  const key = (rowId, colId) => `${rowId}::${colId}`;
  const setGrade = (rowId, colId, v) => setGb((p) => ({ ...p, grades: { ...p.grades, [key(rowId, colId)]: v } }));
  const num = (rowId, colId) => { const v = parseFloat(gb.grades[key(rowId, colId)]); return Number.isFinite(v) ? Math.min(scale.max, Math.max(0, v)) : null; };
  const avg = (xs) => { const f = xs.filter((x) => x != null); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null; };
  const catAvg = (rowId, cat) => avg(cat.cols.map((c) => num(rowId, c.id)));
  // Nota definitiva: ponderada por el peso de cada categoría si la clase lo configuró.
  const finalAvg = (rowId) => gbFinalFromCats(gb, gb.cats.map((c) => catAvg(rowId, c)));
  const colClassAvg = (colId) => avg(gb.rows.map((r) => num(r.id, colId)));
  const catClassAvg = (cat) => avg(gb.rows.map((r) => catAvg(r.id, cat)));
  const finalClassAvg = () => avg(gb.rows.map((r) => finalAvg(r.id)));

  const setScale = (preset) => setGb((p) => ({ ...p, scale: { max: preset.max, pass: preset.pass } }));
  const setPass = (v) => { const n = parseFloat(v); setGb((p) => ({ ...p, scale: { max: scale.max, pass: Number.isFinite(n) ? n : scale.pass } })); };
  const setPeso = (catId, v) => { const n = parseFloat(v); setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, peso: Number.isFinite(n) ? Math.max(0, n) : 0 } : c)) })); };

  const renameCat = (catId, name) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, name } : c)) }));
  const addCat = () => setGb((p) => ({ ...p, cats: [...p.cats, { id: gbId('cat'), name: 'Nueva categoría', cols: [{ id: gbId('c'), label: 'Nota 1' }] }] }));
  const delCat = (catId) => setGb((p) => ({ ...p, cats: p.cats.filter((c) => c.id !== catId) }));
  const renameCol = (catId, colId, label) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: c.cols.map((k) => (k.id === colId ? { ...k, label } : k)) } : c)) }));
  const addCol = (catId) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: [...c.cols, { id: gbId('c'), label: `Nota ${c.cols.length + 1}` }] } : c)) }));
  const delCol = (catId, colId) => setGb((p) => ({ ...p, cats: p.cats.map((c) => (c.id === catId ? { ...c, cols: c.cols.filter((k) => k.id !== colId) } : c)) }));
  const delRow = (rowId) => setGb((p) => ({ ...p, rows: p.rows.filter((r) => r.id !== rowId) }));
  const addRow = () => { const n = newStudent.trim(); if (!n) return; setGb((p) => ({ ...p, rows: [...p.rows, { id: gbId('r'), name: n }] })); setNewStudent(''); };

  // ── Importar / exportar Excel ──────────────────────────────────────────────
  const downloadTemplate = async () => {
    setImportMsg('');
    try {
      const blob = await fetchBlob(`/teacher/classes/${classId}/gradebook/export`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'notas.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { setImportMsg('No se pudo descargar la plantilla.'); }
  };
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportBusy(true); setImportMsg('');
    try {
      const { preview: pv } = await postFile(`/teacher/classes/${classId}/gradebook/import`, file);
      setPreview(pv);
    } catch (err) { setImportMsg(err.message || 'No se pudo leer el archivo.'); }
    finally { setImportBusy(false); }
  };
  const confirmImport = () => {
    const { gb: merged, added, updated } = mergeImport(gb, preview);
    setGb(merged);
    setImportMsg(`Importado: ${added} estudiante(s) nuevo(s), ${updated} actualizado(s).`);
    setPreview(null);
  };

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
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,20,32,0.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '86vh', overflowY: 'auto', background: 'var(--white)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', padding: '22px 22px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Vista previa de importación</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>
              Se importarán <b>{preview.students.length}</b> estudiante{preview.students.length !== 1 ? 's' : ''} y <b>{preview.columns.length}</b> columna{preview.columns.length !== 1 ? 's' : ''} de notas. Los estudiantes que ya existan (por nombre) se actualizan; los nuevos se agregan.
            </div>
            {preview.scaleWarning && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, background: '#FEF3C7', color: '#92600A', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.45 }}>
                <Icon name="alertTriangle" size={16} /> Detecté notas mayores a 5. Este libro usa escala <b>0–5.0</b>; revisa que las notas estén en esa escala antes de confirmar.
              </div>
            )}
            <div style={{ marginTop: 14, border: '1px solid var(--ink-200)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', background: 'var(--paper-50)', fontSize: 11, fontWeight: 800, color: 'var(--fg-2)', padding: '8px 12px', gap: 8 }}>
                <span style={{ flex: 1 }}>Estudiante</span><span>{preview.columns.slice(0, 3).join(' · ')}{preview.columns.length > 3 ? '…' : ''}</span>
              </div>
              {preview.students.slice(0, 6).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', fontSize: 12.5, borderTop: '1px solid var(--ink-100)' }}>
                  <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: 'var(--fg-3)' }}>{preview.columns.slice(0, 3).map((c) => s.grades[c] ?? '–').join(' · ')}</span>
                </div>
              ))}
              {preview.students.length > 6 && <div style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--fg-3)', borderTop: '1px solid var(--ink-100)' }}>y {preview.students.length - 6} más…</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setPreview(null)} style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid var(--ink-200)', background: 'var(--white)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmImport} style={{ flex: 1, height: 46, borderRadius: 12, border: 0, background: 'var(--indigo-600)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Confirmar importación</button>
            </div>
          </div>
        </div>
      )}
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
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onPickFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120, fontSize: 12.5, color: 'var(--fg-3)' }}>
          {gb.rows.length} estudiantes · escala 0–{scale.max === 5 ? '5.0' : scale.max} · aprueba con {fmt(scale.pass)}{ponderado ? ' · ponderada' : ''}
        </div>
        <button onClick={() => setShowCfg((v) => !v)} title="Escala y ponderación de esta clase" style={{ height: 38, padding: '0 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, border: showCfg ? '1px solid transparent' : '1px solid var(--ink-200)', background: showCfg ? 'var(--indigo-600)' : 'var(--white)', color: showCfg ? '#fff' : 'var(--fg-2)' }}>
          <Icon name="settings" size={15} /> Ajustes
        </button>
        <button onClick={downloadTemplate} title="Descarga el libro actual como Excel (sirve de plantilla)" style={{ height: 38, padding: '0 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)' }}>
          <Icon name="download" size={15} /> Plantilla
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={importBusy} style={{ height: 38, padding: '0 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)' }}>
          <Icon name="upload" size={15} /> {importBusy ? 'Leyendo…' : 'Importar Excel'}
        </button>
        <button onClick={() => setEdit((e) => !e)} style={{ height: 38, padding: '0 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, border: edit ? '1px solid transparent' : '1px solid var(--ink-200)', background: edit ? 'var(--indigo-600)' : 'var(--white)', color: edit ? '#fff' : 'var(--fg-1)' }}>
          <Icon name={edit ? 'check' : 'edit'} size={16} /> {edit ? 'Listo' : 'Editar tabla'}
        </button>
      </div>
      {importMsg && <div style={{ fontSize: 12.5, color: importMsg.startsWith('Importado') ? '#1a6b47' : 'var(--danger-500)', fontWeight: 600, marginTop: -4 }}>{importMsg}</div>}

      {showCfg && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '15px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Ajustes de calificación de esta clase</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.45 }}>Cada clase puede tener su propia escala y su propia ponderación. Se aplica al libro de notas, a las tareas y al análisis.</div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fg-3)', marginBottom: 6 }}>Escala</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {SCALE_PRESETS.map((p) => {
                  const on = scale.max === p.max;
                  return (
                    <button key={p.id} onClick={() => setScale(p)} style={{ height: 34, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, border: on ? '1px solid transparent' : '1px solid var(--ink-200)', background: on ? 'var(--indigo-600)' : 'var(--white)', color: on ? '#fff' : 'var(--fg-2)' }}>{p.label}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fg-3)', marginBottom: 6 }}>Nota mínima para aprobar</div>
              <input inputMode="decimal" value={scale.pass} onChange={(e) => setPass(e.target.value)} style={{ width: 90, height: 34, border: '1px solid var(--ink-200)', borderRadius: 9, padding: '0 10px', fontSize: 13, fontWeight: 700 }} />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fg-3)', margin: '16px 0 6px' }}>Peso de cada categoría (%)</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginBottom: 8, lineHeight: 1.45 }}>
            Ej. Parciales 40%, Talleres 30%, Tareas 30%. Si dejas todo en 0, la definitiva es el promedio simple de las categorías.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {gb.cats.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                <input inputMode="decimal" value={cat.peso ?? 0} onChange={(e) => setPeso(cat.id, e.target.value)} style={{ width: 72, height: 32, border: '1px solid var(--ink-200)', borderRadius: 8, padding: '0 10px', fontSize: 13, fontWeight: 700, textAlign: 'right' }} />
                <span style={{ fontSize: 12.5, color: 'var(--fg-3)', width: 14 }}>%</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, fontWeight: 700, color: !ponderado ? 'var(--fg-3)' : sumaPesos === 100 ? '#1a6b47' : '#92600A' }}>
            <Icon name={!ponderado || sumaPesos === 100 ? 'check' : 'alertTriangle'} size={15} />
            {!ponderado ? 'Sin ponderación — promedio simple' : sumaPesos === 100 ? 'Suma 100% — correcto' : `Suman ${sumaPesos}%. Se normaliza sobre ese total, pero lo habitual es que sumen 100%.`}
          </div>
        </div>
      )}

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
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800 }}>
                        {cat.name}
                        {ponderado && Number(cat.peso) > 0 && <span style={{ marginLeft: 5, fontSize: 10.5, fontWeight: 800, color: 'var(--indigo-600)', background: 'var(--indigo-50)', borderRadius: 999, padding: '1px 6px' }}>{cat.peso}%</span>}
                      </span>
                    )}
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
                      <td style={{ ...promCell, borderRight: '2px solid var(--ink-200)', color: color(catAvg(r.id, cat)), fontSize: 13 }}>{fmt(catAvg(r.id, cat))}</td>
                    </Fragment>
                  ))}
                  <td style={{ ...promCell, background: 'var(--indigo-50)', color: color(finalAvg(r.id)), fontSize: 14.5 }}>{fmt(finalAvg(r.id))}</td>
                  {edit && <td style={{ ...cell, borderRight: 0 }}><button onClick={() => setConfirmDel({ id: r.id, name: r.name })} style={{ border: 0, background: 'transparent', color: '#B42318', cursor: 'pointer', padding: 8, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={15} /></button></td>}
                </tr>
              ))}
              <tr>
                <td style={{ ...cell, ...stickyName, padding: '9px 10px', background: 'var(--paper-50)', fontSize: 11.5, fontWeight: 800, color: 'var(--fg-2)' }}>Promedio del curso</td>
                {gb.cats.map((cat) => (
                  <Fragment key={cat.id}>
                    {cat.cols.map((col) => <td key={col.id} style={{ ...cell, background: 'var(--paper-50)', fontSize: 11.5, fontWeight: 700, color: color(colClassAvg(col.id)) }}>{fmt(colClassAvg(col.id))}</td>)}
                    <td style={{ ...cell, background: 'var(--ink-100)', borderRight: '2px solid var(--ink-200)', fontSize: 12, fontWeight: 800, color: color(catClassAvg(cat)) }}>{fmt(catClassAvg(cat))}</td>
                  </Fragment>
                ))}
                <td style={{ ...cell, background: 'var(--indigo-100)', fontSize: 13, fontWeight: 800, color: color(finalClassAvg()) }}>{fmt(finalClassAvg())}</td>
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
