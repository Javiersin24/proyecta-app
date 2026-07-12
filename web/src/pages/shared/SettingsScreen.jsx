import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useLanguage } from '../../lib/LanguageContext.jsx';
import { TopBar, Avatar, Chip, SectionHeader, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} style={{ width: 44, height: 26, borderRadius: 999, border: 0, cursor: 'pointer', flexShrink: 0, background: on ? 'var(--indigo-500)' : 'var(--ink-300)', position: 'relative' }}>
    <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left 160ms', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
  </button>
);

export default function SettingsScreen({ roleLabel }) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const nav = useNavigate();
  const doLogout = async () => { await logout(); nav('/login'); };

  const [pass, setPass] = useState({ cur: '', nue: '', conf: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notif, setNotif] = useState({ tareas: true, chat: true, eventos: true, correo: false });
  const canSave = pass.cur && pass.nue.length >= 6 && pass.nue === pass.conf;

  const updatePassword = async () => {
    setError(''); setBusy(true);
    try {
      await post('/auth/change-password', { currentPassword: pass.cur, newPassword: pass.nue });
      setSaved(true); setPass({ cur: '', nue: '', conf: '' });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={t('Ajustes')} subtitle={t('Tu cuenta y preferencias')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 18px' }}>
          <Avatar name={user?.name} size={54} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{user?.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{user?.email}</div>
            <div style={{ marginTop: 5 }}><Chip variant="info">{t(roleLabel)}</Chip></div>
          </div>
        </div>

        <div>
          <SectionHeader>{t('Seguridad')}</SectionHeader>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Icon name="lock" size={16} color="var(--fg-2)" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{t('Cambiar contraseña')}</span>
            </div>
            <div><label style={labelStyle}>Contraseña actual</label><input type="password" style={inputStyle} value={pass.cur} onChange={(e) => { setPass({ ...pass, cur: e.target.value }); setSaved(false); }} placeholder="La que te dio el colegio" /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px' }}><label style={labelStyle}>Nueva contraseña</label><input type="password" style={inputStyle} value={pass.nue} onChange={(e) => { setPass({ ...pass, nue: e.target.value }); setSaved(false); }} placeholder="Mínimo 6 caracteres" /></div>
              <div style={{ flex: '1 1 150px' }}><label style={labelStyle}>Confirmar</label><input type="password" style={inputStyle} value={pass.conf} onChange={(e) => { setPass({ ...pass, conf: e.target.value }); setSaved(false); }} placeholder="Repite la nueva" /></div>
            </div>
            {pass.nue && pass.nue.length < 6 && <div style={{ fontSize: 12, color: 'var(--coral-600)' }}>La contraseña debe tener al menos 6 caracteres.</div>}
            {pass.conf && pass.nue !== pass.conf && <div style={{ fontSize: 12, color: 'var(--coral-600)' }}>Las contraseñas no coinciden.</div>}
            {error && <div style={{ fontSize: 12, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}
            <button disabled={!canSave || busy} onClick={updatePassword} style={{ marginTop: 2, height: 46, border: 0, borderRadius: 12, cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? 'var(--indigo-600)' : 'var(--ink-300)', color: '#fff', fontWeight: 700, fontSize: 14 }}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button>
            {saved && <div style={{ fontSize: 12.5, color: '#1a6b47', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><Icon name="check" size={14} /> Contraseña actualizada correctamente.</div>}
          </div>
        </div>

        <div>
          <SectionHeader>{t('Idioma del sistema')}</SectionHeader>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="globe" size={18} color="var(--fg-2)" />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{t('Idioma')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ height: 40, border: '1px solid var(--ink-300)', borderRadius: 10, padding: '0 12px', fontSize: 14, background: 'var(--white)', fontWeight: 600 }}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div>
          <SectionHeader>{t('Notificaciones')}</SectionHeader>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
            {[['tareas', 'Tareas y entregas'], ['chat', 'Mensajes del chat'], ['eventos', 'Eventos y recordatorios'], ['correo', 'Resumen por correo']].map(([k, l], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderTop: i ? '1px solid var(--ink-100)' : 'none' }}>
                <Icon name="bell" size={16} color="var(--fg-3)" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{l}</span>
                <Toggle on={notif[k]} onChange={(v) => setNotif({ ...notif, [k]: v })} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={doLogout} style={{ height: 48, border: '1px solid #f5c9a8', borderRadius: 13, cursor: 'pointer', background: 'var(--white)', color: 'var(--coral-600)', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="logout" size={17} /> {t('Cerrar sesión')}
        </button>
      </div>
    </div>
  );
}
