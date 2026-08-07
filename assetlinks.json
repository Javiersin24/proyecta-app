import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, MaterialRow, EmptyState } from '../../ui/kit.jsx';
import { useQuickProject } from '../shared/ProjectAction.jsx';

export default function StudentTopicScreen() {
  const { classId, topicId } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);

  useEffect(() => { get(`/student/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);
  const { trigger: onProject, notice } = useQuickProject(cls);
  if (!cls) return null;
  const topic = cls.topics.find((t) => t.id === topicId);
  const materials = cls.materials[topicId] || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={topic?.name} subtitle={cls.name} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {materials.map((m) => (
          <MaterialRow key={m.id} material={m}
            onClick={() => nav('/estudiante/material', { state: { material: m, className: cls.name, classId } })}
            onProject={onProject} />
        ))}
        {materials.length === 0 && <EmptyState icon="folder" title="Sin material" body="Tu profe aún no ha subido material a este tema." />}
        {notice && (
          <div style={{ padding: '10px 14px', background: 'var(--ink-100)', color: 'var(--fg-2)', borderRadius: 12, fontSize: 12.5, fontWeight: 600 }}>{notice}</div>
        )}
      </div>
    </div>
  );
}
