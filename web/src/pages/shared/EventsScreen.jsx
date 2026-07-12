import { useEffect, useState } from 'react';
import { get, post, del } from '../../lib/api.js';
import { TopBar, IconButton, EmptyState, labelStyle, inputStyle } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const EVENT_TIPOS = {
  Académico: { bg: 'var(--indigo-50)', fg: 'var(--indigo-700)' },
  Reunión: { bg: '#FEF3C7', fg: '#92600A' },
  Salida: { bg: '#DCFCE7', fg: '#1a6b47' },
  General: { bg: 'var(--ink-100)', fg: 'var(--fg-2)' },
};
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function fmtFechaLarga(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_CORTO[dt.getDay()]} ${d} de ${MESES_LARGO[m - 1]}`;
}

export default function EventsScreen({ isTeacher }) {
  const [eventos, setEventos] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => get('/events').then((d) => setEventos(d.events));
  useEffect(() => { load(); }, []);
  if (!eventos) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const sorted = [...eventos].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const proximos = sorted.filter((e) => e.date >= hoy);
  const pasados = sorted.filter((e) => e.date < hoy);

  const crear = async () => {
    if (!form?.title || !form?.date) return;
    await post('/events', { title: form.title, date: form.date, time: form.time, desc: form.desc, tipo: form.tipo || 'General' });
    setForm(null); load();
  };
  const eliminar = async (id) => { await del(`/events/${id}`); load(); };

  const Card = ({ e, past }) => {
    const c = EVENT_TIPOS[e.tipo] || EVENT_TIPOS.General;
    const [, m, d] = e.date.split('-').map(Number);
    return (
      <div style={{ display: 'flex', gap: 14, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 16px', opacity: past ? 0.62 : 1 }}>
        <div style={{ width: 52, flexShrink: 0, textAlign: 'center', background: c.bg, borderRadius: 12, padding: '8px 4px', alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: c.fg, textTransform: 'uppercase' }}>{MESES_LARGO[m - 1].slice(0, 3)}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.fg, lineHeight: 1 }}>{d}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: c.fg, background: c.bg, padding: '2px 8px', borderRadius: 999 }}>{e.tipo}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Icon name="clock" size={13} /> {fmtFechaLarga(e.date)}{e.time ? ` · ${e.time}` : ''}</div>
          {e.desc && <div style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>{e.desc}</div>}
        </div>
        {isTeacher && <button onClick={() => eliminar(e.id)} title="Eliminar" style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-3)', alignSelf: 'flex-start', padding: 2 }}><Icon name="trash" size={16} /></button>}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Eventos" subtitle={isTeacher ? 'Anuncia y programa actividades' : 'Actividades y anuncios del colegio'}
        trailing={isTeacher ? <IconButton name="plus" ariaLabel="Nuevo evento" onClick={() => setForm(form ? null : { title: '', date: '', time: '', desc: '', tipo: 'Académico' })} /> : null} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isTeacher && form && (
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Nuevo evento</div>
            <div><label style={labelStyle}>Título</label><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Entrega de proyectos" /></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 130px' }}><label style={labelStyle}>Fecha</label><input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div style={{ flex: '1 1 100px' }}><label style={labelStyle}>Hora</label><input type="time" style={inputStyle} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              <div style={{ flex: '1 1 130px' }}><label style={labelStyle}>Tipo</label><select style={inputStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{Object.keys(EVENT_TIPOS).map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div><label style={labelStyle}>Descripción</label><textarea style={{ ...inputStyle, height: 74, padding: '10px 13px', resize: 'vertical' }} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Detalles del evento…" /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={crear} disabled={!form.title || !form.date} style={{ flex: 1, height: 46, border: 0, borderRadius: 12, cursor: form.title && form.date ? 'pointer' : 'not-allowed', background: form.title && form.date ? 'var(--indigo-600)' : 'var(--ink-300)', color: '#fff', fontWeight: 700, fontSize: 14 }}>Publicar evento</button>
              <button onClick={() => setForm(null)} style={{ height: 46, padding: '0 16px', border: '1px solid var(--ink-200)', borderRadius: 12, cursor: 'pointer', background: 'var(--white)', color: 'var(--fg-2)', fontWeight: 700, fontSize: 14 }}>Cancelar</button>
            </div>
          </div>
        )}
        {!isTeacher && (
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 7, background: 'var(--paper-50)', border: '1px solid var(--ink-100)', borderRadius: 12, padding: '10px 13px' }}>
            <Icon name="megaphone" size={15} /> Aquí ves los eventos que publican tus profesores y el colegio.
          </div>
        )}
        <div className="eyebrow">Próximos</div>
        {proximos.length ? proximos.map((e) => <Card key={e.id} e={e} />) : <EmptyState icon="calendar" title="Sin eventos próximos" body={isTeacher ? 'Toca + para anunciar un evento.' : 'Cuando haya un evento programado, aparecerá aquí.'} />}
        {pasados.length > 0 && <><div className="eyebrow">Pasados</div>{pasados.map((e) => <Card key={e.id} e={e} past />)}</>}
      </div>
    </div>
  );
}
