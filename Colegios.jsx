import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { useProjecting } from '../../lib/ProjectingContext.jsx';
import Icon from '../../ui/Icon.jsx';
import { Tabs, Avatar, TopicAccordion, TaskRow, EmptyState } from '../../ui/kit.jsx';
import { useQuickProject } from '../shared/ProjectAction.jsx';
import ProjectingStrip from '../shared/ProjectingStrip.jsx';

const PALETTE = [['#4F46E5', '#5C6FD9'], ['#0EA5A0', '#22C9C0'], ['#8B5CF6', '#A78BFA'], ['#F2994A', '#FF7A52'], ['#3730A3', '#6366F1']];

export default function StudentClassScreen() {
  const { classId } = useParams();
  const nav = useNavigate();
  const { session } = useProjecting();
  const [cls, setCls] = useState(null);
  const [tab, setTab] = useState('feed');

  useEffect(() => { get(`/student/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);
  const { trigger: onProject, notice } = useQuickProject(cls);
  if (!cls) return null;
  const pal = PALETTE[cls.paletteIdx % PALETTE.length];
  const isProjecting = session?.fileName && cls.topics.some((t) => (cls.materials[t.id] || []).some((m) => m.name === session.fileName));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => nav(-1)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, width: 36, height: 36, border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icon name="back" size={20} stroke={2.2} />
        </button>
        <div style={{ background: `linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 100%)`, padding: '20px 18px 22px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78, marginBottom: 4 }}>{cls.section}</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', margin: 0 }}>{cls.name}</h1>
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>{cls.teacher?.name}</div>
        </div>
      </div>

      <Tabs tabs={[{ id: 'feed', label: 'Tablón' }, { id: 'topics', label: 'Temas' }, { id: 'tasks', label: 'Tareas' }]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cls.feed.map((p) => (
              <div key={p.id} style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar name={p.author} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.when}</div>
                  </div>
                  {p.kind === 'task' && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--info-100)', color: '#1c4b8f', fontSize: 11, fontWeight: 700 }}>Tarea</span>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{p.body}</div>
              </div>
            ))}
            {cls.feed.length === 0 && <EmptyState icon="bell" title="Tablón vacío" body="Las novedades de la clase aparecerán aquí." />}
          </div>
        )}

        {tab === 'topics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cls.topics.map((topic, i) => (
              <TopicAccordion key={topic.id} topic={topic} materials={cls.materials[topic.id]} canProject defaultOpen={i === 0}
                onPickMaterial={(m) => nav('/estudiante/material', { state: { material: m, className: cls.name, classId } })}
                onProject={onProject} />
            ))}
            {cls.topics.length === 0 && <EmptyState icon="folder" title="Sin temas todavía" body="Tu profe aún no ha publicado temas en esta clase." />}
          </div>
        )}

        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cls.tasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => nav(`/estudiante/clases/${classId}/tareas/${t.id}`)} />)}
            {cls.tasks.length === 0 && <EmptyState icon="clipboard" title="Sin tareas" body="No hay tareas pendientes." />}
          </div>
        )}
      </div>

      {isProjecting && <ProjectingStrip />}
      {notice && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--ink-100)', color: 'var(--fg-2)', borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>{notice}</div>
      )}
    </div>
  );
}
