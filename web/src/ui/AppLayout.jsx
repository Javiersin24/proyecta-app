// Cascarón responsive compartido por los 4 módulos: TabBar+TopBar en móvil,
// SideNav+AccountBar en escritorio (misma regla que el prototipo, useIsWide).
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useIsWide, TabBar, SideNav, AccountBar, IconButton } from './kit.jsx';
import Icon from './Icon.jsx';

export default function AppLayout({ navItems, brand = 'Proyecta', roleLabel, showLogoutTopBar = false }) {
  const wide = useIsWide();
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();

  const activeId = navItems.find((it) => loc.pathname.startsWith(it.to))?.id;
  const goTo = (id) => { const item = navItems.find((it) => it.id === id); if (item) nav(item.to); };

  const doLogout = async () => { await logout(); nav('/login'); };

  if (wide) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex' }}>
        <SideNav
          items={navItems}
          active={activeId}
          onChange={goTo}
          footer={<AccountBar name={user?.name || ''} subtitle={roleLabel} onLogout={doLogout} />}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 56, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--indigo-500)', display: 'grid', placeItems: 'center' }}>
              <Icon name="cast" size={13} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15 }}>{brand}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-app)' }}>
      {showLogoutTopBar && (
        <div style={{ height: 'var(--header-h)', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15 }}>{brand}</span>
          <div style={{ marginLeft: 'auto' }}><IconButton name="logout" onClick={doLogout} ariaLabel="Cerrar sesión" /></div>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
      <TabBar items={navItems} active={activeId} onChange={goTo} />
    </div>
  );
}
