import { useState } from 'react';
import { post, del } from '../../lib/api.js';
import { Sheet } from '../../ui/Screen.jsx';
import { Field, PrimaryButton, MaterialRow, labelStyle, inputStyle } from '../../ui/kit.jsx';
import FilePicker from '../../ui/FilePicker.jsx';
import Icon from '../../ui/Icon.jsx';

const uid = () => Math.random().toString(36).slice(2, 10);

export function ComposePostSheet({ classId, open, onClose, onCreated }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { await post(`/teacher/classes/${classId}/posts`, { body }); setBody(''); onCreated(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Compartir con la clase">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe un anuncio para tus estudiantes…" style={{
        width: '100%', boxSizing: 'border-box', minHeight: 100, padding: 12, border: '1px solid var(--ink-300)',
        borderRadius: 12, background: 'var(--white)', fontFamily: 'var(--font-sans)', fontSize: 14, resize: 'vertical',
      }} />
      <PrimaryButton onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 12 }}>{busy ? 'Publicando…' : 'Publicar'}</PrimaryButton>
    </Sheet>
  );
}

export function AddTopicSheet({ classId, open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await post(`/teacher/classes/${classId}/topics`, { name }); setName(''); onCreated(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nuevo tema">
      <Field label="Nombre del tema" value={name} onChange={(e) => setName(e.target.value)} placeholder="Funciones cuadráticas" />
      <PrimaryButton onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 12 }}>{busy ? 'Creando…' : 'Crear tema'}</PrimaryButton>
    </Sheet>
  );
}

export function AddMaterialSheet({ topicId, open, onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try { await post(`/teacher/topics/${topicId}/materials`, { name: file.name, kind: file.kind, url: file.url, meta: file.meta }); setFile(null); onCreated(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Agregar material">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FilePicker value={file} onChange={setFile} />
        <PrimaryButton onClick={submit} disabled={busy || !file}>{busy ? 'Agregando…' : 'Agregar material'}</PrimaryButton>
      </div>
    </Sheet>
  );
}

// Fecha + hora de entrega: alimenta tanto el texto legible ("Vence...") como
// el dueDate (YYYY-MM-DD) que usa el Organizador para ubicar la tarea en el calendario.
function DueDateField({ dueDate, time, onChange }) {
  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  return (
    <div>
      <label style={labelStyle}>Fecha de entrega</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="date" style={{ ...inputStyle, flex: '1 1 160px' }} value={dueDate} onChange={(e) => onChange(e.target.value, time)} />
        <input type="time" style={{ ...inputStyle, flex: '0 1 120px' }} value={time} onChange={(e) => onChange(dueDate, e.target.value)} />
      </div>
      {dueDate && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 6 }}>Vence el {fmt(dueDate)}{time ? ` · ${time}` : ''}</div>}
    </div>
  );
}

// Rúbrica de calificación: lista de criterios con puntaje, opcional a la tarea.
function RubricField({ rubric, onChange }) {
  const total = rubric.reduce((s, c) => s + (Number(c.points) || 0), 0);
  const addRow = () => onChange([...rubric, { id: uid(), name: '', desc: '', points: 10 }]);
  const updateRow = (id, patch) => onChange(rubric.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeRow = (id) => onChange(rubric.filter((c) => c.id !== id));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Rúbrica (opcional)</label>
        {rubric.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{total} pts</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rubric.map((c) => (
          <div key={c.id} style={{ border: '1px solid var(--ink-200)', borderRadius: 11, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, height: 38, flex: 1 }} placeholder="Criterio (ej. Ortografía)" value={c.name} onChange={(e) => updateRow(c.id, { name: e.target.value })} />
              <input type="number" style={{ ...inputStyle, height: 38, width: 70 }} value={c.points} onChange={(e) => updateRow(c.id, { points: e.target.value })} />
              <button onClick={() => removeRow(c.id)} style={{ width: 38, height: 38, flexShrink: 0, border: 0, borderRadius: 9, background: 'var(--coral-50)', color: 'var(--coral-600)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Icon name="trash" size={15} />
              </button>
            </div>
            <input style={{ ...inputStyle, height: 34, fontSize: 12.5 }} placeholder="Descripción breve (opcional)" value={c.desc} onChange={(e) => updateRow(c.id, { desc: e.target.value })} />
          </div>
        ))}
        <button onClick={addRow} style={{ padding: '9px 12px', border: '1.5px dashed var(--ink-300)', background: 'transparent', borderRadius: 11, cursor: 'pointer', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Icon name="plus" size={15} stroke={2.2} /> Agregar criterio
        </button>
      </div>
    </div>
  );
}

// Archivos de apoyo adjuntos a la tarea (guía, plantilla, enlace de referencia…).
function TaskFilesField({ files, onChange }) {
  const add = (f) => onChange([...files, { ...f, id: uid() }]);
  const remove = (id) => onChange(files.filter((f) => f.id !== id));
  return (
    <div>
      <label style={labelStyle}>Archivos de apoyo (opcional)</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {files.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}><MaterialRow material={f} compact /></div>
            <button onClick={() => remove(f.id)} style={{ width: 34, height: 34, flexShrink: 0, border: 0, borderRadius: 9, background: 'var(--coral-50)', color: 'var(--coral-600)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
      <FilePicker value={null} onChange={add} />
    </div>
  );
}

export function AddTaskSheet({ classId, open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [time, setTime] = useState('');
  const [points, setPoints] = useState(100);
  const [rubric, setRubric] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(''); setDesc(''); setDueDate(''); setTime(''); setPoints(100); setRubric([]); setFiles([]); };

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const due = dueDate ? `Vence ${new Date(dueDate + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}${time ? ` · ${time}` : ''}` : '';
    try {
      await post(`/teacher/classes/${classId}/tasks`, {
        title, desc, due, dueDate: dueDate || undefined, points: Number(points),
        rubric: rubric.length ? rubric.map((c) => ({ ...c, points: Number(c.points) || 0 })) : undefined,
        files: files.length ? files : undefined,
      });
      reset(); onCreated();
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nueva tarea">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ejercicios capítulo 4" />
        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inputStyle, height: 80, padding: 10, resize: 'vertical' }} />
        </div>
        <DueDateField dueDate={dueDate} time={time} onChange={(d, t) => { setDueDate(d); setTime(t); }} />
        <Field label="Puntos" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
        <TaskFilesField files={files} onChange={setFiles} />
        <RubricField rubric={rubric} onChange={setRubric} />
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear tarea'}</PrimaryButton>
      </div>
    </Sheet>
  );
}

// Confirmación destructiva antes de borrar una clase completa (temas, tareas,
// entregas y calificaciones se pierden — se pide escribir el nombre exacto).
export function ConfirmDeleteClassSheet({ cls, open, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const canDelete = cls && confirm.trim() === cls.name;
  const submit = async () => {
    if (!canDelete) return;
    setBusy(true);
    try { await del(`/teacher/classes/${cls.id}`); setConfirm(''); onDeleted(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Eliminar clase">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg-2)' }}>
          Esto elimina <strong>{cls?.name}</strong> junto con sus temas, materiales, tareas, entregas y calificaciones. No se puede deshacer.
        </div>
        <div>
          <label style={labelStyle}>Escribe "{cls?.name}" para confirmar</label>
          <input style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={cls?.name} />
        </div>
        <button onClick={submit} disabled={!canDelete || busy} style={{
          height: 46, border: 0, borderRadius: 12, cursor: canDelete ? 'pointer' : 'not-allowed',
          background: canDelete ? 'var(--danger-500)' : 'var(--ink-300)', color: '#fff', fontWeight: 700, fontSize: 14,
        }}>{busy ? 'Eliminando…' : 'Eliminar clase definitivamente'}</button>
      </div>
    </Sheet>
  );
}
