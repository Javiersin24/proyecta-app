import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useIsWide, Chip, IconButton } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

export default function MatriculaPortalPage() {
  const wide = useIsWide();
  const nav = useNavigate();
  const { user, logout, refreshMe } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => get('/matricula/me').then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  const pagar = async () => { setBusy(true); try { await post('/matricula/pay'); await load(); } finally { setBusy(false); } };
  const entrar = async () => { setBusy(true); try { await post('/matricula/enter'); await refreshMe(); nav('/estudiante'); } finally { setBusy(false); } };
  const doLogout = async () => { await logout(); nav('/login'); };

  if (!data) return null;
  const { enrollment: m, grupo } = data;

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper-50)', overflow: 'hidden' }}>
      <div style={{ height: 56, background: 'var(--white)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--indigo-500)', display: 'grid', placeItems: 'center' }}>
          <Icon name="cast" size={13} color="#fff" />
        </div>
        <span style={{ marginLeft: 10, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14 }}>Matrícula</span>
        <div style={{ marginLeft: 'auto' }}><IconButton name="logout" onClick={doLogout} ariaLabel="Cerrar sesión" /></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 20 }}>Hola, {m.name.split(' ')[0]}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2, marginBottom: 20 }}>Grado {m.grado} · Acudiente: {m.acudiente}</div>

          {m.status !== 'Asignado' ? (
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '22px 20px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Estado de tu matrícula</div>
              <Chip variant={m.status === 'Pagado' ? 'info' : 'warning'}>{m.status === 'Pagado' ? 'Pagada · esperando asignación de grupo' : 'Pago pendiente'}</Chip>
              {m.status === 'Pendiente' && (
                <>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-2)', margin: '14px 0' }}>Puedes pagar la matrícula en línea ahora, o acercarte a tesorería del colegio.</p>
                  <button onClick={pagar} disabled={busy} style={{
                    width: '100%', height: 50, border: 0, borderRadius: 12, background: 'var(--indigo-500)', color: '#fff',
                    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
                  }}>{busy ? 'Procesando…' : 'Pagar matrícula en línea'}</button>
                </>
              )}
              {m.status === 'Pagado' && (
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-2)', margin: '14px 0 0' }}>Tu pago quedó registrado. Cuando el colegio cierre la matrícula de tu grado, te asignaremos grupo, aula y profesores — lo verás aquí mismo.</p>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '22px 20px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Ya tienes grupo asignado</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'var(--font-sans)' }}>{m.grupoNombre}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Grupo {m.grupoNombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{grupo ? grupo.aula : ''}</div>
                </div>
              </div>
              {grupo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {grupo.horario.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '7px 10px', background: 'var(--ink-50)', borderRadius: 8 }}>
                      <span style={{ fontWeight: 600 }}>{h.materia}</span>
                      <span style={{ color: 'var(--fg-3)' }}>{h.profesor} · {h.dia} {h.hora}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={entrar} disabled={busy} style={{
                width: '100%', height: 50, border: 0, borderRadius: 12, background: 'var(--coral-500)', color: '#fff',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
              }}>{busy ? 'Entrando…' : 'Entrar al panel de estudiante'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
