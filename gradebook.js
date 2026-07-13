import { useState } from 'react';
import { uploadFile } from '../lib/api.js';
import { MATERIAL_VISUAL, inputStyle } from './kit.jsx';
import Icon from './Icon.jsx';

const isYoutube = (u) => /youtu\.?be/i.test(u);
const nameFromUrl = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'Enlace'; } };

// Adjuntar un archivo real (subido) o un enlace — sin preguntar "qué tipo de
// archivo es" (se infiere solo). El nombre para mostrar es editable pero
// opcional: siempre queda prellenado con algo razonable.
export default function FilePicker({ value, onChange }) {
  const [mode, setMode] = useState('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setError('');
    try {
      const up = await uploadFile(f);
      onChange({ id: up.url, name: up.name, kind: up.kind, url: up.url, meta: `${up.sizeKB} KB` });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onChange({ id: url, name: nameFromUrl(url), kind: isYoutube(url) ? 'youtube' : 'link', url, meta: 'Enlace' });
    setLinkUrl('');
  };

  if (value) {
    const v = MATERIAL_VISUAL[value.kind] || MATERIAL_VISUAL.pdf;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: v.bg, color: v.color, display: 'grid', placeItems: 'center' }}>
          <Icon name={v.icon} size={17} />
        </div>
        <input style={{ ...inputStyle, flex: 1, height: 38 }} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Nombre para mostrar" />
        <button onClick={() => onChange(null)} style={{ width: 34, height: 34, flexShrink: 0, border: 0, borderRadius: 9, background: 'var(--coral-50)', color: 'var(--coral-600)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icon name="trash" size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => setMode('upload')} style={tabStyle(mode === 'upload')}>Subir archivo</button>
        <button type="button" onClick={() => setMode('link')} style={tabStyle(mode === 'link')}>Agregar enlace</button>
      </div>
      {error && <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
      {mode === 'upload' ? (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, border: '1.5px dashed var(--ink-300)', borderRadius: 11, cursor: busy ? 'default' : 'pointer', color: 'var(--fg-2)', fontSize: 13.5, fontWeight: 600 }}>
          <Icon name="upload" size={16} /> {busy ? 'Subiendo…' : 'Elegir archivo del dispositivo'}
          <input type="file" style={{ display: 'none' }} disabled={busy} onChange={pick} />
        </label>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLink()} />
          <button onClick={addLink} disabled={!linkUrl.trim()} style={{
            border: 0, borderRadius: 9, padding: '0 16px', fontWeight: 700, cursor: linkUrl.trim() ? 'pointer' : 'not-allowed',
            background: linkUrl.trim() ? 'var(--indigo-600)' : 'var(--ink-300)', color: '#fff',
          }}>Agregar</button>
        </div>
      )}
    </div>
  );
}

const tabStyle = (active) => ({
  border: 0, borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
  background: active ? 'var(--indigo-600)' : 'var(--ink-100)', color: active ? '#fff' : 'var(--fg-2)',
});
