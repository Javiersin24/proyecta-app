import { useState } from 'react';
import { post } from '../../lib/api.js';
import { Sheet } from '../../ui/Screen.jsx';
import { PrimaryButton, labelStyle, inputStyle } from '../../ui/kit.jsx';

export default function JoinClassSheet({ open, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { await post('/student/classes/join', { code }); setCode(''); onJoined(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Unirme a una clase">
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>Pide a tu profesor el código de la clase.</div>
      <label style={labelStyle}>Código</label>
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="7XK-P2M" style={{ ...inputStyle, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' }} />
      {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
      <PrimaryButton onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 14 }}>{busy ? 'Uniéndote…' : 'Unirme'}</PrimaryButton>
    </Sheet>
  );
}
