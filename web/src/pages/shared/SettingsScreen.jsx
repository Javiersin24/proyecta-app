import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { TopBar, Avatar } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

export default function SettingsScreen({ roleLabel }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const doLogout = async () => { await logout(); nav('/login'); };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Ajustes" />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <Avatar name={user?.name} size={52} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{user?.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{user?.email}</div>
            <div style={{ fontSize: 11.5, color: 'var(--indigo-600)', fontWeight: 700, marginTop: 2 }}>{roleLabel}</div>
          </div>
        </div>
        <button onClick={doLogout} style={{
          width: '100%', height: 48, border: '1px solid var(--danger-100)', background: 'var(--danger-100)', color: 'var(--danger-500)',
          borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}><Icon name="logout" size={17} /> Cerrar sesión</button>
      </div>
    </div>
  );
}
