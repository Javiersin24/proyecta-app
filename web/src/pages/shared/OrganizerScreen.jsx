import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, patch, del } from '../../lib/api.js';
import { TopBar, EmptyState } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function fmtFechaLarga(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_CORTO[dt.getDay()]} ${d} de ${MESES_LARGO[m - 1]}`;
}
const todayISO = () => new Date().toISOString().slice(0, 10);

const DayItem = ({ color, icon, title, meta, done, onClick }) => (
  <button onClick={onClick} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 13, padding: '11px 14px', cursor: 'pointer', width: '100%' }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: done ? 'var(--fg-3)' : 'var(--fg-1)', textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{meta}</div>
    </div>
    <Icon name={icon} size={15} color="var(--fg-3)" />
  </button>
);

export default function OrganizerScreen({ basePath, isTeacher }) {
  const nav = useNavigate();
  const [subtab, setSubtab] = useState('calendario');
  const hoyISO = todayISO();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDay, setSelDay] = useState(hoyISO);
  const [nuevoRec, setNuevoRec] = useState('');
  const [nuevoRecFecha, setNuevoRecFecha] = useState('');

  const [eventos, setEventos] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [tareas, setTareas] = useState([]);

  const loadReminders = () => get('/reminders').then((d) => setReminders(d.reminders));

  useEffect(() => {
    get('/events').then((d) => setEventos(d.events));
    loadReminders();
    if (isTeacher) {
      get('/teacher/classes').then((d) => {
        const out = [];
        d.classes.forEach((cls) => (cls.tasks || []).forEach((t) => {
          const subs = t.submissions || [];
          const ent = subs.filter((s) => s.status === 'done' || s.status === 'late');
          const rev = ent.filter((s) => s.grade != null);
          const done = subs.length > 0 && ent.length === rev.length && ent.length === subs.length;
          if (!done) out.push({ classId: cls.id, className: cls.name, taskId: t.id, title: t.title, date: t.dueDate || '' });
        }));
        setTareas(out);
      });
    } else {
      get('/student/tasks').then((d) => setTareas(d.pendientes.map((t) => ({ classId: t.classId, className: t.className, taskId: t.taskId, title: t.title, date: t.dueDate || '' }))));
    }
  }, [isTeacher]);

  const marks = {};
  const addMark = (date, kind) => { if (!date) return; (marks[date] = marks[date] || []).push(kind); };
  eventos.forEach((e) => addMark(e.date, 'evento'));
  tareas.forEach((t) => addMark(t.date, 'tarea'));
  reminders.forEach((r) => !r.done && addMark(r.date, 'recordatorio'));

  const tabs = [['calendario', 'Calendario', 'calendar'], ['tareas', 'Tareas', 'clipboard'], ['recordatorios', 'Recordatorios', 'check']];

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const iso = (d) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const shift = (n) => setCursor((c) => { let m = c.m + n, y = c.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });
  const markColor = { evento: 'var(--indigo-500)', tarea: 'var(--coral-500)', recordatorio: '#0EA5A0' };

  const dayEventos = eventos.filter((e) => e.date === selDay);
  const dayTareas = tareas.filter((t) => t.date === selDay);
  const dayRec = reminders.filter((r) => r.date === selDay);

  const addRec = async () => {
    if (!nuevoRec.trim()) return;
    await post('/reminders', { text: nuevoRec.trim(), date: nuevoRecFecha || undefined });
    setNuevoRec(''); setNuevoRecFecha(''); loadReminders();
  };
  const toggleRec = async (id, done) => { await patch(`/reminders/${id}`, { done: !done }); loadReminders(); };
  const removeRec = async (id) => { await del(`/reminders/${id}`); loadReminders(); };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Organizador" subtitle="Tu calendario, tareas y recordatorios" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--ink-100)', padding: 4, borderRadius: 13, marginBottom: 14 }}>
          {tabs.map(([id, label, icon]) => (
            <button key={id} onClick={() => setSubtab(id)} style={{ flex: 1, height: 38, border: 0, borderRadius: 10, cursor: 'pointer', background: subtab === id ? 'var(--white)' : 'transparent', color: subtab === id ? 'var(--indigo-700)' : 'var(--fg-2)', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name={icon} size={15} /> {label}</button>
          ))}
        </div>

        {subtab === 'calendario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
                <button onClick={() => shift(-1)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-2)', padding: 6 }}><Icon name="back" size={18} /></button>
                <span style={{ fontSize: 15.5, fontWeight: 800, textTransform: 'capitalize' }}>{MESES_LARGO[cursor.m]} {cursor.y}</span>
                <button onClick={() => shift(1)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-2)', padding: 6, transform: 'scaleX(-1)' }}><Icon name="back" size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {DIAS_CORTO.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: 'var(--fg-3)', padding: '2px 0 6px' }}>{d}</div>)}
                {cells.map((d, i) => {
                  if (d === null) return <div key={i} />;
                  const dISO = iso(d);
                  const isToday = dISO === hoyISO;
                  const isSel = dISO === selDay;
                  const dm = marks[dISO] || [];
                  return (
                    <button key={i} onClick={() => setSelDay(dISO)} style={{ aspectRatio: '1', border: 0, borderRadius: 10, cursor: 'pointer', position: 'relative', background: isSel ? 'var(--indigo-500)' : isToday ? 'var(--indigo-50)' : 'transparent', color: isSel ? '#fff' : isToday ? 'var(--indigo-700)' : 'var(--fg-1)', fontSize: 13.5, fontWeight: isToday || isSel ? 800 : 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {d}
                      {dm.length > 0 && <span style={{ position: 'absolute', bottom: 5, left: 0, right: 0, display: 'flex', gap: 2, justifyContent: 'center' }}>{[...new Set(dm)].slice(0, 3).map((k, j) => <span key={j} style={{ width: 4, height: 4, borderRadius: 999, background: isSel ? 'rgba(255,255,255,0.9)' : markColor[k] }} />)}</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-100)', flexWrap: 'wrap' }}>
                {[['Eventos', 'evento'], ['Tareas', 'tarea'], ['Recordatorios', 'recordatorio']].map(([l, k]) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--fg-3)', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: markColor[k] }} /> {l}</div>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg-2)', marginBottom: 8, textTransform: 'capitalize' }}>{fmtFechaLarga(selDay)}</div>
              {dayEventos.length + dayTareas.length + dayRec.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg-3)', background: 'var(--white)', border: '1px dashed var(--ink-200)', borderRadius: 14, padding: 18, textAlign: 'center' }}>Nada programado este día.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEventos.map((e) => <DayItem key={e.id} color={markColor.evento} icon="calendar" title={e.title} meta={e.time || 'Evento'} onClick={() => nav(`${basePath}/eventos`)} />)}
                  {dayTareas.map((t) => <DayItem key={t.taskId} color={markColor.tarea} icon="clipboard" title={t.title} meta={t.className} onClick={() => nav(`${basePath}/clases/${t.classId}/tareas/${t.taskId}`)} />)}
                  {dayRec.map((r) => <DayItem key={r.id} color={markColor.recordatorio} icon="check" title={r.text} meta="Recordatorio" done={r.done} onClick={() => toggleRec(r.id, r.done)} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {subtab === 'tareas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{tareas.length} {tareas.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}.</div>
            {tareas.length ? [...tareas].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((t) => (
              <button key={t.classId + t.taskId} onClick={() => nav(`${basePath}/clases/${t.classId}/tareas/${t.taskId}`)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '13px 15px', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FEF1E7', color: 'var(--coral-600)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="clipboard" size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div><div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{t.className}{t.date ? ` · vence ${fmtFechaLarga(t.date)}` : ''}</div></div>
                <Icon name="chevron" size={16} color="var(--fg-3)" />
              </button>
            )) : <EmptyState icon="check" title="Todo al día" body="No tienes tareas pendientes." />}
          </div>
        )}

        {subtab === 'recordatorios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <input value={nuevoRec} onChange={(e) => setNuevoRec(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRec()} placeholder="Agregar un recordatorio…" style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1px solid var(--ink-300)', borderRadius: 11, padding: '0 13px', fontSize: 14.5, background: 'var(--white)' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={nuevoRecFecha} onChange={(e) => setNuevoRecFecha(e.target.value)} style={{ flex: 1, boxSizing: 'border-box', height: 42, border: '1px solid var(--ink-300)', borderRadius: 11, padding: '0 12px', fontSize: 13.5, background: 'var(--white)' }} />
                <button onClick={addRec} disabled={!nuevoRec.trim()} style={{ height: 42, padding: '0 18px', border: 0, borderRadius: 11, cursor: nuevoRec.trim() ? 'pointer' : 'not-allowed', background: nuevoRec.trim() ? 'var(--indigo-600)' : 'var(--ink-300)', color: '#fff', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="plus" size={16} /> Agregar</button>
              </div>
            </div>
            {(() => {
              const pend = reminders.filter((r) => !r.done);
              const hechos = reminders.filter((r) => r.done);
              const Row = ({ r }) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 13, padding: '12px 15px' }}>
                  <button onClick={() => toggleRec(r.id, r.done)} style={{ width: 22, height: 22, borderRadius: 7, cursor: 'pointer', flexShrink: 0, border: r.done ? '0' : '2px solid var(--ink-300)', background: r.done ? '#0EA5A0' : 'transparent', display: 'grid', placeItems: 'center' }}>{r.done && <Icon name="check" size={14} color="#fff" stroke={3} />}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: r.done ? 'var(--fg-3)' : 'var(--fg-1)', textDecoration: r.done ? 'line-through' : 'none' }}>{r.text}</div>
                    {r.date && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={12} /> {fmtFechaLarga(r.date)}</div>}
                  </div>
                  <button onClick={() => removeRec(r.id)} title="Eliminar" style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-3)', padding: 2 }}><Icon name="trash" size={15} /></button>
                </div>
              );
              return (
                <>
                  {pend.length ? pend.map((r) => <Row key={r.id} r={r} />) : <EmptyState icon="check" title="Sin recordatorios" body="Agrega uno arriba para no olvidar nada." />}
                  {hechos.length > 0 && <><div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fg-3)', textTransform: 'uppercase', marginTop: 6 }}>Completados · {hechos.length}</div>{hechos.map((r) => <Row key={r.id} r={r} />)}</>}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
