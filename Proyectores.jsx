import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, patch } from '../../lib/api.js';
import { TopBar, SectionHeader, Avatar, MaterialRow, EmptyState } from '../../ui/kit.jsx';
import { gbFmtIn, gbColorIn, gbStep, pctToScale, scaleToPct } from '../../lib/gradebook.js';
import { useQuickProject } from '../shared/ProjectAction.jsx';
import Icon from '../../ui/Icon.jsx';

export default function TeacherGradeScreen() {
  const { classId, taskId, subId } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);
  const [scores, setScores] = useState({});   // puntaje por criterio de rúbrica
  const [nota, setNota] = useState('');       // nota directa (sin rúbrica), en la escala de la clase
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  // Una entrega ya calificada arranca BLOQUEADA: hay que tocar "Editar nota"
  // para modificarla. Así no se cambia una nota por accidente.
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => { get(`/teacher/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);
  const { trigger: onProject, sheet: linkSheet, notice } = useQuickProject(cls, (p) => setCls((c) => ({ ...c, projector: p, projectorId: p?.id || null })));

  const task = cls?.tasks.find((t) => t.id === taskId);
  const sub = task?.submissions.find((s) => s.id === subId);
  const rubric = task?.rubric || [];
  const scale = cls?.gradeScale || { max: 5, pass: 3 };
  const yaCalificada = sub?.grade != null;

  useEffect(() => {
    if (!sub) return;
    setComment(sub.comment || '');
    setUnlocked(sub.grade == null); // sin nota previa → editable de una vez
    if (rubric.length) {
      // Reparte la nota existente proporcionalmente entre los criterios.
      const pct = sub.grade != null ? scaleToPct(sub.grade, scale) : null;
      setScores(Object.fromEntries(rubric.map((c) => [c.id, pct == null ? 0 : Math.round(c.points * (pct / 100))])));
    } else {
      setNota(sub.grade != null ? String(sub.grade) : '');
    }
  }, [sub?.id, cls?.id]);

  if (!cls || !task || !sub) return null;

  // Con rúbrica la nota sale de los criterios; sin rúbrica, del campo directo.
  const maxPuntos = rubric.reduce((s, c) => s + c.points, 0);
  const totalPuntos = rubric.reduce((s, c) => s + (scores[c.id] || 0), 0);
  const notaFinal = rubric.length
    ? (maxPuntos > 0 ? pctToScale((totalPuntos / maxPuntos) * 100, scale) : null)
    : (() => { const v = parseFloat(String(nota).replace(',', '.')); return Number.isFinite(v) ? Math.min(scale.max, Math.max(0, v)) : null; })();

  const puedeGuardar = unlocked && notaFinal != null && !busy;
  const save = async () => {
    if (!puedeGuardar) return;
    setBusy(true);
    try {
      await patch(`/teacher/tasks/${taskId}/submissions/${sub.id}`, { grade: Number(notaFinal.toFixed(2)), comment });
      nav(-1);
    } finally { setBusy(false); }
  };

  const inputBase = { height: 46, border: '1px solid var(--ink-300)', borderRadius: 12, padding: '0 14px', fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-sans)', background: 'var(--white)' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <TopBar title="Calificar entrega" subtitle={sub.student} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 140px' }}>
        {/* Estudiante + lo que entregó */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={sub.student} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.student}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {sub.status === 'late' ? 'Entregada con retraso' : sub.status === 'done' ? 'Entregada' : 'Sin entregar'}
              </div>
            </div>
            {yaCalificada && (
              <div style={{ padding: '5px 11px', borderRadius: 999, background: 'var(--success-100)', color: '#1a6b47', fontWeight: 800, fontSize: 12.5, flexShrink: 0 }}>
                {gbFmtIn(sub.grade, scale)}/{scale.max}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fg-3)', marginBottom: 7 }}>Archivo entregado</div>
            {sub.file
              ? <MaterialRow material={sub.file} onProject={onProject} />
              : <div style={{ fontSize: 12.5, color: 'var(--fg-3)', background: 'var(--paper-100)', borderRadius: 10, padding: '10px 12px' }}>El estudiante no adjuntó ningún archivo.</div>}
          </div>

          {task.files?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fg-3)', marginBottom: 7 }}>Material de la tarea</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {task.files.map((f) => <MaterialRow key={f.id} material={f} onProject={onProject} />)}
              </div>
            </div>
          )}
        </div>

        {notice && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--ink-100)', color: 'var(--fg-2)', borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>{notice}</div>
        )}

        {/* Aviso de bloqueo cuando ya tiene nota */}
        {yaCalificada && !unlocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FEF3C7', color: '#92600A', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <Icon name="lock" size={17} />
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>Esta entrega ya está calificada. Para cambiar la nota, desbloquéala.</div>
            <button onClick={() => setUnlocked(true)} style={{ height: 34, padding: '0 12px', borderRadius: 9, border: 0, background: '#92600A', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', flexShrink: 0 }}>Editar nota</button>
          </div>
        )}

        {rubric.length > 0 ? (
          <>
            <SectionHeader>Rúbrica</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rubric.map((c) => {
                const v = scores[c.id] || 0;
                const ratio = c.points > 0 ? v / c.points : 0;
                return (
                  <div key={c.id} style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 12, padding: 14, opacity: unlocked ? 1 : 0.65 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <input
                        inputMode="decimal" disabled={!unlocked} value={v}
                        onChange={(e) => { const n = parseFloat(e.target.value); setScores((s) => ({ ...s, [c.id]: Number.isFinite(n) ? Math.min(c.points, Math.max(0, n)) : 0 })); }}
                        style={{ ...inputBase, width: 78, height: 38, fontSize: 15, textAlign: 'right', color: ratio >= 0.7 ? '#1a6b47' : ratio >= 0.4 ? '#92600A' : '#B42318' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 700, flexShrink: 0 }}>/ {c.points}</span>
                    </div>
                    {c.desc && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.desc}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 10 }}>Total de rúbrica: <b>{totalPuntos}</b> / {maxPuntos} puntos</div>
          </>
        ) : (
          <>
            <SectionHeader>Nota (0 – {scale.max === 5 ? '5.0' : scale.max})</SectionHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                inputMode="decimal" disabled={!unlocked} value={nota} onChange={(e) => setNota(e.target.value)}
                placeholder={scale.max === 5 ? 'Ej. 4.2' : 'Ej. 85'} step={gbStep(scale)}
                style={{ ...inputBase, width: 140, opacity: unlocked ? 1 : 0.65, color: gbColorIn(notaFinal, scale) }}
              />
              <span style={{ fontSize: 15, color: 'var(--fg-3)', fontWeight: 700 }}>/ {scale.max}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 7 }}>
              Escribe la nota en la escala de esta clase. Puedes cambiarla en Calificaciones → Ajustes.
            </div>
          </>
        )}

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--fg-2)', textTransform: 'uppercase', marginBottom: 6 }}>Comentario para el estudiante</div>
          <textarea value={comment} disabled={!unlocked} onChange={(e) => setComment(e.target.value)} placeholder="Buen trabajo en la introducción, revisa el procedimiento del ejercicio 4…" style={{
            width: '100%', boxSizing: 'border-box', minHeight: 80, padding: 12, border: '1px solid var(--ink-300)',
            borderRadius: 12, background: 'var(--white)', fontFamily: 'var(--font-sans)', fontSize: 14, resize: 'vertical', opacity: unlocked ? 1 : 0.65,
          }} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--paper-50)', borderTop: '1px solid var(--ink-200)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--fg-3)', textTransform: 'uppercase' }}>Nota final</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1, color: gbColorIn(notaFinal, scale) }}>
            {gbFmtIn(notaFinal, scale)}<span style={{ fontSize: 16, color: 'var(--fg-3)', fontWeight: 600 }}>/{scale.max}</span>
          </div>
        </div>
        <button onClick={save} disabled={!puedeGuardar} style={{
          height: 50, padding: '0 22px', background: puedeGuardar ? 'var(--indigo-500)' : 'var(--ink-300)', color: '#fff', border: 0, borderRadius: 13,
          cursor: puedeGuardar ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
        }}><Icon name="check" size={18} stroke={2.4} /> {busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
      {linkSheet}
    </div>
  );
}
