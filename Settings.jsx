import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../ui/Icon.jsx';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useIsWide, labelStyle, inputStyle } from '../../ui/kit.jsx';
import { HOME_BY_ROLE } from '../../lib/RequireRole.jsx';
import SignupForm from './SignupForm.jsx';

const ROLE_META = {
  teacher:     { label: 'Profesor',         icon: 'book',     color: 'var(--indigo-500)', shadow: 'rgba(79,70,229,0.32)',  email: 'laura.ramirez@colegio.edu' },
  student:     { label: 'Estudiante',       icon: 'users',    color: 'var(--coral-500)',  shadow: 'rgba(242,153,74,0.32)', email: 'ana.m@colegio.edu' },
  admin:       { label: 'Admin de colegio', icon: 'settings', color: '#8B5CF6',           shadow: 'rgba(139,92,246,0.32)', email: 'l.fernandez@sanmartin.edu' },
  superadmin:  { label: 'Súper-admin',      icon: 'award',    color: '#0EA5A0',           shadow: 'rgba(14,165,160,0.32)', email: 'tu@proyecta.app' },
};

export default function LoginPage() {
  const wide = useIsWide();
  const nav = useNavigate();
  const { login } = useAuth();
  const [roleHint, setRoleHint] = useState('teacher');
  const [email, setEmail] = useState(ROLE_META.teacher.email);
  const [pw, setPw] = useState('proyecta123');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const meta = ROLE_META[roleHint];

  const pickRole = (id) => { setRoleHint(id); setEmail(ROLE_META[id].email); setError(''); };

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const user = await login(email, pw);
      nav(HOME_BY_ROLE[user.role] || '/login');
    } catch (e) {
      setError(e.message || 'No se pudo iniciar sesión');
    } finally { setBusy(false); }
  };

  const form = (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {Object.keys(ROLE_META).map((id) => {
          const m = ROLE_META[id];
          const on = roleHint === id;
          return (
            <button key={id} onClick={() => pickRole(id)} style={{
              border: on ? `1.5px solid ${m.color}` : '1px solid var(--ink-200)',
              background: on ? `${m.color}14` : 'var(--white)',
              borderRadius: 13, padding: '12px 10px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              color: on ? m.color : 'var(--fg-2)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12.5,
            }}>
              <Icon name={m.icon} size={19} stroke={2} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={labelStyle}>Correo institucional</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Contraseña</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}

      <button onClick={submit} disabled={busy} style={{
        marginTop: 18, width: '100%', height: 54, border: 0, borderRadius: 14,
        background: meta.color, color: '#fff', fontFamily: 'var(--font-sans)',
        fontWeight: 700, fontSize: 16, cursor: busy ? 'default' : 'pointer',
        boxShadow: `0 10px 22px ${meta.shadow}`, opacity: busy ? 0.7 : 1,
      }}>{busy ? 'Entrando…' : `Entrar como ${meta.label.toLowerCase()}`}</button>

      <button style={{ marginTop: 10, height: 40, width: '100%', border: 0, background: 'transparent', color: 'var(--fg-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        ¿Olvidaste tu contraseña?
      </button>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>
        ¿Eres nuevo? <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); }} style={{ color: 'var(--indigo-600)', fontWeight: 700 }}>Crea tu cuenta</a>
      </div>
    </div>
  );

  const content = mode === 'signup' ? <SignupForm onBack={() => setMode('login')} /> : form;

  if (wide) {
    const bullets = [
      ['cast', 'Proyecta en un toque, sin cables'],
      ['book', 'Clases, tareas y material en un solo lugar'],
      ['settings', 'Un panel para administrar todo el colegio'],
    ];
    return (
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: '42%', minWidth: 340, maxWidth: 440, flexShrink: 0, color: '#fff',
          background: 'linear-gradient(160deg, var(--indigo-500), var(--indigo-800))',
          padding: '44px 40px', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden style={{ position: 'absolute', top: -100, right: -110, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -90, left: -70, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,153,74,0.22), transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.16)', display: 'grid', placeItems: 'center' }}>
                <Icon name="cast" size={16} />
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 17 }}>Proyecta</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, fontSize: 32, lineHeight: 1.18, letterSpacing: '-0.01em', margin: '32px 0 14px' }}>
              Todo tu colegio, en una sola pantalla.
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, opacity: 0.86, margin: 0, maxWidth: 280 }}>
              Clases, tareas y chat para profesores y estudiantes — con un panel para administrar todo el plantel.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
            {bullets.map(([icon, text]) => (
              <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={icon} size={14} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 500, opacity: 0.92 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--paper-50)', overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #FDFBF7 0%, #F8F4EB 100%)',
      padding: '40px 24px 24px', overflow: 'hidden', position: 'relative',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: -120, right: -120, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.18), transparent 70%)' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: -80, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,153,74,0.12), transparent 70%)' }} />

      <div style={{ marginTop: 28, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--indigo-500)', display: 'grid', placeItems: 'center' }}>
            <Icon name="cast" size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 16 }}>Proyecta</span>
        </div>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 36, lineHeight: 1.05, color: 'var(--fg-1)', letterSpacing: '-0.01em', margin: '24px 0 6px' }}>
          Bienvenido de vuelta
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.4, color: 'var(--fg-2)', margin: 0, maxWidth: 320 }}>
          Inicia sesión para entrar a tu colegio.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, overflowY: 'auto', paddingTop: 12 }}>
        {content}
      </div>
    </div>
  );
}
