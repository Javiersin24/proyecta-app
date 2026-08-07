import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { TopBar, Avatar, EmptyState, IconButton, useIsWide } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const ROLE_LABEL = { teacher: 'Profesor', student: 'Estudiante', admin: 'Admin' };

// Modal para iniciar una conversación nueva: lista los contactos disponibles
// (según el rol, el backend decide con quién puede hablar) y crea/abre la DM.
function NewChatModal({ onClose, onStarted }) {
  const [contacts, setContacts] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { get('/chat/contacts').then((d) => setContacts(d.contacts)); }, []);

  const start = async (peerId) => {
    if (busy) return;
    setBusy(true);
    try { const { chat } = await post('/chat/dm', { peerId }); onStarted(chat.id); }
    finally { setBusy(false); }
  };
  const filtered = (contacts || []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,20,32,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--paper-50)', borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 14px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>Nuevo chat</div>
          <IconButton name="x" ariaLabel="Cerrar" onClick={onClose} />
        </div>
        <div style={{ padding: '10px 14px' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…" style={{ width: '100%', height: 40, border: '1px solid var(--ink-200)', borderRadius: 10, padding: '0 12px', fontSize: 13.5, fontFamily: 'var(--font-sans)' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {contacts == null ? null : filtered.length === 0 ? (
            <EmptyState icon="users" title="Sin contactos" body={contacts.length ? 'Nadie coincide con tu búsqueda.' : 'Cuando tengas estudiantes en tus clases, aparecerán aquí.'} />
          ) : filtered.map((c) => (
            <button key={c.id} onClick={() => start(c.id)} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 12 }}>
              <Avatar name={c.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{ROLE_LABEL[c.role] || c.role}</div>
              </div>
              <Icon name="chevron" size={16} color="var(--fg-3)" />
            </button>
          ))}
        </div>
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

function ChatListPane({ chats, activeId, onPick, bare }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: bare ? '6px 8px 24px' : '6px 6px 24px' }}>
      {chats == null ? null : chats.length === 0 ? (
        <EmptyState icon="chat" title="Sin conversaciones" body="Tus chats aparecerán aquí." />
      ) : chats.map((c) => (
        <button key={c.id} onClick={() => onPick(c.id)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', border: 0,
          background: c.id === activeId ? 'var(--indigo-50)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 12,
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
  );
}

function ChatThreadPane({ chatId, onBack }) {
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { setChat(null); get(`/chat/${chatId}`).then((d) => setChat(d.chat)); }, [chatId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [chat?.messages?.length]);

  const send = async () => {
    if (!text.trim()) return;
    const t = text; setText('');
    const { chat } = await post(`/chat/${chatId}/messages`, { text: t });
    setChat(chat);
  };

  if (!chat) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={chat.peerName} subtitle={chat.className} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chat.messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '76%', padding: '9px 13px', borderRadius: m.from === 'me' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
              background: m.from === 'me' ? 'var(--indigo-500)' : 'var(--ink-100)', color: m.from === 'me' ? '#fff' : 'var(--fg-1)',
              fontSize: 13.5, lineHeight: 1.4,
            }}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ flexShrink: 0, padding: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escribe un mensaje…" style={{
          flex: 1, height: 42, padding: '0 14px', border: '1px solid var(--ink-300)', borderRadius: 21, outline: 'none', fontSize: 14, fontFamily: 'var(--font-sans)',
        }} />
        <button onClick={send} style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: 'var(--indigo-500)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}

// En escritorio, lista + hilo lado a lado (como Gmail/WhatsApp Web); en móvil,
// una pantalla a la vez (la lista, o el hilo con botón de volver).
export default function ChatSplitScreen({ basePath }) {
  const { chatId } = useParams();
  const nav = useNavigate();
  const wide = useIsWide();
  const [chats, setChats] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = () => get('/chat').then((d) => setChats(d.chats));
  useEffect(() => { load(); }, []);

  const pick = (id) => nav(`${basePath}/${id}`);
  const back = () => nav(basePath);
  const onStarted = (id) => { setShowNew(false); load(); nav(`${basePath}/${id}`); };
  const newBtn = <IconButton name="plus" ariaLabel="Nuevo chat" onClick={() => setShowNew(true)} />;

  if (wide) {
    return (
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar title="Chat" trailing={newBtn} />
          <ChatListPane chats={chats} activeId={chatId} onPick={pick} />
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {chatId ? <ChatThreadPane chatId={chatId} onBack={back} /> : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState icon="chat" title="Selecciona una conversación" body="Elige un chat de la lista, o toca + para empezar uno nuevo." />
            </div>
          )}
        </div>
        {showNew && <NewChatModal onClose={() => setShowNew(false)} onStarted={onStarted} />}
      </div>
    );
  }

  if (chatId) return <ChatThreadPane chatId={chatId} onBack={back} />;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Chat" trailing={newBtn} />
      <ChatListPane chats={chats} activeId={chatId} onPick={pick} bare />
      {showNew && <NewChatModal onClose={() => setShowNew(false)} onStarted={onStarted} />}
    </div>
  );
}
