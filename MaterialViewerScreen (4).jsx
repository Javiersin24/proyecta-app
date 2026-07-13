import { useEffect, useState } from 'react';
import { get, put } from '../../lib/api.js';
import { TopBar, EmptyState, Avatar } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const PALETTE = ['var(--indigo-500)', 'var(--coral-500)', '#0EA5A0', '#8B5CF6', '#D99400'];
const ORDER = ['Presente', 'Tarde', 'Ausente'];
const chipColor = (s) => (s === 'Presente' ? { bg: 'var(--success-100)', fg: '#1a6b47' } : s === 'Tarde' ? { bg: '#FEF3C7', fg: '#92600A' } : { bg: '#FEE2E2', fg: '#B42318' });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtFecha = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; };

export default function TeacherAsistenciaScreen() {
  const [classes, setClasses] = useState(null);
  const [selId, setSelId] = useState(null);
  const [vista, setVista] = useState('hoy');
  const [draft, setDraft] = useState({}); // selección en curso (sin guardar aún)
  const [historial, setHistorial] = useState([]);
  const [guardado, setGuardado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { get('/teacher/classes').then((d) => setClasses(d.classes)); }, []);

  const clase = classes?.find((c) => c.id === selId);

  // Precarga lo que ya se haya guardado hoy (para poder corregir), sin inventar "Presente".
  const loadHoy = (classId) => get(`/teacher/classes/${classId}/asistencia`).then((d) => setDraft(d.asistencia || {}));
  const loadHistorial = (classId) => get(`/teacher/classes/${classId}/asistencia/historial`).then((d) => setHistorial(d.historial));

  useEffect(() => {
    if (!selId) return;
    setGuardado(false); setVista('hoy');
    loadHoy(selId);
  }, [selId]);

  useEffect(() => { if (selId && vista === 'historial') loadHistorial(selId); }, [selId, vista]);

  if (!classes) return null;

  if (!classes.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Asistencia" subtitle="Toma de asistencia por clase" />
        <div style={{ padding: '4px 16px 24px' }}><EmptyState icon="check" title="Sin clases" body="Cuando crees una clase, podrás tomar su asistencia aquí." /></div>
      </div>
    );
  }

  if (!clase) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Asistencia" subtitle="Elige una clase" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>Selecciona una de tus clases para tomar la asistencia de hoy.</div>
          {classes.map((c) => {
            const color = PALETTE[(c.paletteIdx || 0) % PALETTE.length];
            const n = (c.students || []).length || c.studentCount || 0;
            return (
              <button key={c.id} onClick={() => setSelId(c.id)} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '13px 15px', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: color, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0, fontWeight: 800, fontSize: 15 }}>{c.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{c.section} · {n} estudiantes</div></div>
                <Icon name="chevron" size={18} color="var(--fg-3)" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const roster = (clase.students || []).map((s) => s.name);
  const setVal = (st, val) => { setDraft((d) => ({ ...d, [st]: val })); setGuardado(false); };
  const markAllPresent = () => { setDraft(Object.fromEntries(roster.map((st) => [st, 'Presente']))); setGuardado(false); };
  const count = (v) => roster.filter((st) => draft[st] === v).length;
  const marcados = roster.filter((st) => draft[st]).length;
  const sinMarcar = roster.length - marcados;

  const guardar = async () => {
    const registros = {};
    roster.forEach((st) => { if (draft[st]) registros[st] = draft[st]; });
    if (!Object.keys(registros).length || saving) return;
    setSaving(true);
    try { await put(`/teacher/classes/${clase.id}/asistencia/bulk`, { registros }); setGuardado(true); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Asistencia" subtitle={`${clase.name} · ${clase.section}`} onBack={() => setSelId(null)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--ink-100)', borderRadius: 12, padding: 4 }}>
          {[['hoy', 'Hoy'], ['historial', 'Historial']].map(([id, lbl]) => (
            <button key={id} onClick={() => setVista(id)} style={{ flex: 1, height: 36, border: 0, borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: vista === id ? 'var(--white)' : 'transparent', color: vista === id ? 'var(--indigo-700)' : 'var(--fg-3)' }}>{lbl}</button>
          ))}
        </div>

        {vista === 'hoy' ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Presente', 'var(--success-500)'], ['Tarde', '#D99400'], ['Ausente', 'var(--danger-500)']].map(([lbl, c]) => (
                <div key={lbl} style={{ flex: 1, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: c }}>{count(lbl)}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>{lbl}s</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 12.5, color: sinMarcar ? 'var(--coral-700)' : 'var(--fg-3)', fontWeight: 600 }}>
                {sinMarcar ? `${sinMarcar} sin marcar` : 'Todos marcados'}
              </div>
              <button onClick={markAllPresent} style={{ height: 30, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)' }}>Marcar todos presentes</button>
            </div>
            <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
              {roster.map((st, i) => {
                const val = draft[st]; // sin marcar por defecto
                return (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
                    <Avatar name={st} size={34} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{st}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {ORDER.map((o) => {
                        const on = val === o; const c = chipColor(o);
                        return <button key={o} onClick={() => setVal(st, o)} style={{ height: 30, padding: '0 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, border: on ? '1px solid transparent' : '1px solid var(--ink-200)', background: on ? c.bg : 'var(--white)', color: on ? c.fg : 'var(--fg-3)' }}>{o}</button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={guardar} disabled={saving || marcados === 0} style={{ height: 48, border: 0, borderRadius: 12, cursor: saving || marcados === 0 ? 'default' : 'pointer', background: marcados === 0 ? 'var(--ink-300)' : guardado ? 'var(--success-500)' : 'var(--indigo-600)', color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? 'Guardando…' : guardado ? <><Icon name="check" size={18} stroke={2.6} /> Asistencia guardada</> : `Guardar asistencia${marcados ? ` (${marcados})` : ''}`}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.length === 0 && <EmptyState icon="check" title="Sin historial" body="Aún no hay registros de asistencia para esta clase." />}
            {historial.map((d) => {
              const regs = d.registros;
              const presentes = Object.values(regs).filter((v) => v === 'Presente').length;
              return (
                <div key={d.date} style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 13, padding: '12px 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{fmtFecha(d.date)}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{presentes}/{Object.keys(regs).length} presentes</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {Object.entries(regs).map(([name, estado]) => { const c = chipColor(estado); return <span key={name} title={name} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: c.bg, color: c.fg }}>{name.split(' ')[0]}</span>; })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
