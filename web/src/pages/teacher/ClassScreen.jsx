import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { useProjecting } from '../../lib/ProjectingContext.jsx';
import Icon from '../../ui/Icon.jsx';
import { Tabs, Avatar, TopicAccordion, TaskRow, EmptyState } from '../../ui/kit.jsx';
import { useQuickProject } from '../shared/ProjectAction.jsx';
import ProjectingStrip from '../shared/ProjectingStrip.jsx';
import { ComposePostSheet, AddTopicSheet, AddMaterialSheet, AddTaskSheet, ConfirmDeleteClassSheet } from './sheets.jsx';

const PALETTE = [['#4F46E5', '#5C6FD9'], ['#0EA5A0', '#22C9C0'], ['#8B5CF6', '#A78BFA'], ['#F2994A', '#FF7A52'], ['#3730A3', '#6366F1']];

export default function TeacherClassScreen() {
  const { classId } = useParams();
  const nav = useNavigate();
  const { session } = useProjecting();
  const [cls, setCls] = useState(null);
  const [tab, setTab] = useState('feed');
  const [sheet, setSheet] = useState(null); // 'post' | 'topic' | 'task'
  const [addMaterialTopicId, setAddMaterialTopicId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = () => get(`/teacher/classes/${classId}`).then((d) => setCls(d.class));
  useEffect(() => { load(); }, [classId]);
  const { trigger: onProject, sheet: linkSheet, notice } = useQuickProject(cls, (p) => setCls((c) => ({ ...c, projector: p, projectorId: p?.id || null })));

  if (!cls) return null;
  const pal = PALETTE[cls.paletteIdx % PALETTE.length];
  const isProjecting = session?.fileName && cls.topics.some((t) => (cls.materials[t.id] || []).some((m) => m.name === session.fileName));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => nav(-1)} style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, width: 36, height: 36, border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icon name="back" size={20} stroke={2.2} />
        </button>
        <button onClick={() => setDeleteOpen(true)} aria-label="Eliminar clase" style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 36, height: 36, border: 0, borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Icon name="trash" size={17} stroke={2.2} />
        </button>
        <div style={{ background: `linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 100%)`, padding: '20px 18px 22px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78, marginBottom: 4 }}>{cls.section}</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', margin: 0 }}>{cls.name}</h1>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.18)', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{cls.code}</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>{cls.studentCount} estudiantes</span>
          </div>
        </div>
      </div>

      <Tabs tabs={[{ id: 'feed', label: 'Tablón' }, { id: 'topics', label: 'Temas' }, { id: 'tasks', label: 'Tareas' }]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
        {tab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setSheet('post')} style={{ background: 'var(--white)', border: '1px solid var(--ink-200)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <Avatar name={cls.teacher?.name} size={36} />
              <span style={{ color: 'var(--fg-3)', fontSize: 14 }}>Comparte algo con la clase…</span>
            </button>
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
            <button onClick={() => setSheet('topic')} style={{ padding: '12px 16px', border: '1.5px dashed var(--indigo-400)', background: 'var(--indigo-50)', color: 'var(--indigo-700)', borderRadius: 13, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="plus" size={18} stroke={2.2} /> Nuevo tema
            </button>
            {cls.topics.map((topic, i) => (
              <TopicAccordion key={topic.id} topic={topic} materials={cls.materials[topic.id]} isTeacher defaultOpen={i === 0}
                onPickMaterial={(m) => nav('/profesor/material', { state: { material: m, className: cls.name, classId } })}
                onProject={onProject}
                onAddMaterial={(tid) => setAddMaterialTopicId(tid)} />
            ))}
            {cls.topics.length === 0 && <EmptyState icon="folder" title="Aún no hay temas" body="Crea el primer tema para organizar tu material." />}
          </div>
        )}

        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setSheet('task')} style={{ padding: '12px 16px', border: '1.5px dashed var(--indigo-400)', background: 'var(--indigo-50)', color: 'var(--indigo-700)', borderRadius: 13, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="plus" size={18} stroke={2.2} /> Nueva tarea
            </button>
            {cls.tasks.map((t) => (
              <TaskRow key={t.id} task={t} onClick={() => nav(`/profesor/clases/${classId}/tareas/${t.id}`)} />
            ))}
            {cls.tasks.length === 0 && <EmptyState icon="clipboard" title="Sin tareas" body="Crea la primera tarea." />}
          </div>
        )}
      </div>

      {isProjecting && <ProjectingStrip />}
      {notice && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--ink-100)', color: 'var(--fg-2)', borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>{notice}</div>
      )}

      <ComposePostSheet classId={classId} open={sheet === 'post'} onClose={() => setSheet(null)} onCreated={() => { setSheet(null); load(); }} />
      <AddTopicSheet classId={classId} open={sheet === 'topic'} onClose={() => setSheet(null)} onCreated={() => { setSheet(null); load(); }} />
      <AddTaskSheet classId={classId} open={sheet === 'task'} onClose={() => setSheet(null)} onCreated={() => { setSheet(null); load(); }} />
      <AddMaterialSheet topicId={addMaterialTopicId} open={!!addMaterialTopicId} onClose={() => setAddMaterialTopicId(null)} onCreated={() => { setAddMaterialTopicId(null); load(); }} />
      {linkSheet}
      <ConfirmDeleteClassSheet cls={cls} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => nav('/profesor', { replace: true })} />
    </div>
  );
}
