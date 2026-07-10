import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, patch } from '../../lib/api.js';
import { TopBar, SectionHeader, Avatar } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

export default function TeacherGradeScreen() {
  const { classId, taskId, subId } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { get(`/teacher/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);

  const task = cls?.tasks.find((t) => t.id === taskId);
  const sub = task?.submissions.find((s) => s.id === subId);
  const rubric = task?.rubric || [];

  useEffect(() => {
    if (!sub) return;
    setScores(Object.fromEntries(rubric.map((c) => [c.id, Math.round(c.points * ((sub.grade ?? 70) / 100))])));
    setComment(sub.comment || '');
  }, [sub?.id]);

  if (!cls || !task || !sub) return null;

  const total = rubric.reduce((s, c) => s + (scores[c.id] || 0), 0);
  const max = rubric.reduce((s, c) => s + c.points, 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : (sub.grade ?? 0);

  const save = async () => {
    setBusy(true);
    try {
      await patch(`/teacher/tasks/${taskId}/submissions/${sub.id}`, { grade: pct, comment });
      nav(-1);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <TopBar title="Calificar entrega" subtitle={sub.student} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={sub.student} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.student}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{sub.file?.name || 'Sin archivo'}</div>
            </div>
          </div>
        </div>

        {rubric.length > 0 ? (
          <>
            <SectionHeader>Rúbrica</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rubric.map((c) => {
                const v = scores[c.id] || 0;
                const ratio = v / c.points;
                return (
                  <div key={c.id} style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: ratio >= 0.7 ? 'var(--success-500)' : ratio >= 0.4 ? 'var(--warning-500)' : 'var(--danger-500)' }}>{v}/{c.points}</div>
                    </div>
                    {c.desc && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>{c.desc}</div>}
                    <input type="range" min="0" max={c.points} value={v} onChange={(e) => setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--indigo-500)' }} />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <SectionHeader>Nota (0-100)</SectionHeader>
            <input type="range" min="0" max="100" value={pct} onChange={(e) => setScores({ manual: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--indigo-500)' }} />
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--fg-2)', textTransform: 'uppercase', marginBottom: 6 }}>Comentario para el estudiante</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Buen trabajo en la introducción, revisa el procedimiento del ejercicio 4…" style={{
            width: '100%', boxSizing: 'border-box', minHeight: 80, padding: 12, border: '1px solid var(--ink-300)',
            borderRadius: 12, background: 'var(--white)', fontFamily: 'var(--font-sans)', fontSize: 14, resize: 'vertical',
          }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--paper-50)', borderTop: '1px solid var(--ink-200)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Nota final</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {rubric.length > 0 ? pct : (scores.manual ?? pct)}<span style={{ fontSize: 16, color: 'var(--fg-3)', fontWeight: 600 }}>/100</span>
          </div>
        </div>
        <button onClick={save} disabled={busy} style={{
          height: 50, padding: '0 22px', background: 'var(--indigo-500)', color: '#fff', border: 0, borderRadius: 13,
          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
        }}><Icon name="check" size={18} stroke={2.4} /> {busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
}
