import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, Avatar, EmptyState } from '../../ui/kit.jsx';

export default function ChatListScreen({ basePath }) {
  const nav = useNavigate();
  const [chats, setChats] = useState(null);

  useEffect(() => { get('/chat').then((d) => setChats(d.chats)); }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Chat" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 24px' }}>
        {chats == null ? null : chats.length === 0 ? (
          <EmptyState icon="chat" title="Sin conversaciones" body="Tus chats aparecerán aquí." />
        ) : chats.map((c) => (
          <button key={c.id} onClick={() => nav(`${basePath}/${c.id}`)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', border: 0,
            background: 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 12,
          }}>
            <Avatar name={c.peerName} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.peerName}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>{fmtWhen(c.lastWhen)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.className ? `${c.className} · ` : ''}{c.last}</span>
                {c.unread > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'var(--coral-500)', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{c.unread}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
