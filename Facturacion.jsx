import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, SectionHeader, Chip, Avatar, MaterialRow } from '../../ui/kit.jsx';
import { gbFmtIn } from '../../lib/gradebook.js';
import { useQuickProject } from '../shared/ProjectAction.jsx';
import Icon from '../../ui/Icon.jsx';

export default function TeacherTaskScreen() {
  const { classId, taskId } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);

  useEffect(() => { get(`/teacher/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);
  const { trigger: onProject, sheet: linkSheet, notice } = useQuickProject(cls, (p) => setCls((c) => ({ ...c, projector: p, projectorId: p?.id || null })));
  if (!cls) return null;
  const task = cls.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const scale = cls.gradeScale || { max: 5, pass: 3 };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Tarea" subtitle={cls.name} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {task.status === 'dueSoon' && <Chip variant="warning">Vence pronto</Chip>}
          {task.status === 'done' && <Chip variant="success">Completada</Chip>}
          {task.status === 'pending' && <Chip variant="muted">Pendiente</Chip>}
          {task.rubric && <Chip variant="info">Rúbrica · {task.rubric.reduce((s, c) => s + c.points, 0)} pts</Chip>}
        </div>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{task.title}</h1>
        <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>{task.due}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, margin: '0 0 18px' }}>{task.desc}</p>

        {task.files?.length > 0 && (
          <>
            <SectionHeader>Material adjunto</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {task.files.map((f) => <MaterialRow key={f.id} material={f} onProject={onProject} />)}
            </div>
          </>
        )}
        {notice && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--ink-100)', color: 'var(--fg-2)', borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>{notice}</div>
        )}

        <SectionHeader>Entregas · {task.submitted}/{task.total}</SectionHeader>
        <div style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 12, overflow: 'hidden' }}>
          {task.submissions.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
              <button onClick={() => nav(`/profesor/clases/${classId}/tareas/${taskId}/calificar/${s.id}`)} style={{
                flex: 1, minWidth: 0, padding: '12px 14px', border: 0, background: 'transparent', cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Avatar name={s.student} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.student}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.status === 'done' ? (s.file?.meta || 'Entregada') : s.status === 'late' ? 'Atrasada' : 'Pendiente'}</div>
                </div>
                {s.grade != null ? (
                  <div style={{ padding: '5px 10px', borderRadius: 999, background: 'var(--success-100)', color: '#1a6b47', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{gbFmtIn(s.grade, scale)}/{scale.max}</div>
                ) : s.status === 'done' || s.status === 'late' ? (
                  <Chip variant="info">Calificar</Chip>
                ) : (
                  <Chip variant="muted">Pendiente</Chip>
                )}
              </button>
              {s.file && (
                <button onClick={(e) => { e.stopPropagation(); onProject(s.file); }} title="Proyectar" style={{
                  width: 34, height: 34, flexShrink: 0, marginRight: 10, border: 0, borderRadius: 9,
                  background: 'var(--indigo-50)', color: 'var(--indigo-600)', cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="cast" size={15} />
                </button>
              )}
            </div>
          ))}
          {task.submissions.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>Nadie ha entregado todavía.</div>}
        </div>
      </div>
      {linkSheet}
    </div>
  );
}
