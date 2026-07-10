import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { TopBar } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

export default function ChatThreadScreen() {
  const { chatId } = useParams();
  const nav = useNavigate();
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const load = () => get(`/chat/${chatId}`).then((d) => setChat(d.chat));
  useEffect(() => { load(); }, [chatId]);
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
      <TopBar title={chat.peerName} subtitle={chat.className} onBack={() => nav(-1)} />
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
