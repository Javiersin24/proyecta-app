import { useState } from 'react';
import { post } from '../../lib/api.js';
import { Sheet } from '../../ui/Screen.jsx';
import { Field, PrimaryButton, labelStyle, inputStyle } from '../../ui/kit.jsx';

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

const KINDS = [
  { id: 'pdf', label: 'PDF' }, { id: 'slides', label: 'Presentación' }, { id: 'docx', label: 'Word' },
  { id: 'youtube', label: 'Video de YouTube' }, { id: 'video', label: 'Video' }, { id: 'image', label: 'Imagen' },
  { id: 'link', label: 'Enlace' }, { id: 'canva', label: 'Canva' },
];

export function AddMaterialSheet({ topicId, open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('pdf');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await post(`/teacher/topics/${topicId}/materials`, { name, kind, url: url || undefined }); setName(''); setUrl(''); onCreated(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Agregar material">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Capítulo 4 · Funciones.pdf" />
        <div>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        {(kind === 'youtube' || kind === 'link' || kind === 'canva') && (
          <Field label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        )}
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? 'Agregando…' : 'Agregar material'}</PrimaryButton>
      </div>
    </Sheet>
  );
}

export function AddTaskSheet({ classId, open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('');
  const [points, setPoints] = useState(100);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try { await post(`/teacher/classes/${classId}/tasks`, { title, desc, due, points: Number(points) }); setTitle(''); setDesc(''); setDue(''); onCreated(); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nueva tarea">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ejercicios capítulo 4" />
        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inputStyle, height: 80, padding: 10, resize: 'vertical' }} />
        </div>
        <Field label="Fecha de entrega (texto libre)" value={due} onChange={(e) => setDue(e.target.value)} placeholder="Vence viernes · 18:00" />
        <Field label="Puntos" type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear tarea'}</PrimaryButton>
      </div>
    </Sheet>
  );
}
