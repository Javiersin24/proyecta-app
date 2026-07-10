import { useState } from 'react';
import { post } from '../../lib/api.js';
import { Sheet } from '../../ui/Screen.jsx';
import { Field, PrimaryButton } from '../../ui/kit.jsx';

export default function CreateClassSheet({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Ponle un nombre a la clase'); return; }
    setBusy(true); setError('');
    try {
      await post('/teacher/classes', { name, section });
      setName(''); setSection('');
      onCreated();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear clase">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nombre de la clase" value={name} onChange={(e) => setName(e.target.value)} placeholder="Matemáticas 10°B" />
        <Field label="Sección (opcional)" value={section} onChange={(e) => setSection(e.target.value)} placeholder="Semestre 1" />
        {error && <div style={{ fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
        <PrimaryButton onClick={submit} disabled={busy} style={{ width: '100%' }}>{busy ? 'Creando…' : 'Crear clase'}</PrimaryButton>
      </div>
    </Sheet>
  );
}
