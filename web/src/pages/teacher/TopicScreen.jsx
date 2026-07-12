import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, MaterialRow, EmptyState } from '../../ui/kit.jsx';
import ProjectSheet from '../shared/ProjectSheet.jsx';
import { AddMaterialSheet } from './sheets.jsx';
import Icon from '../../ui/Icon.jsx';

export default function TeacherTopicScreen() {
  const { classId, topicId } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState(null);
  const [projectMaterial, setProjectMaterial] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => get(`/teacher/classes/${classId}`).then((d) => setCls(d.class));
  useEffect(() => { load(); }, [classId]);

  if (!cls) return null;
  const topic = cls.topics.find((t) => t.id === topicId);
  const materials = cls.materials[topicId] || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={topic?.name} subtitle={cls.name} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setAddOpen(true)} style={{ padding: '12px 16px', border: '1.5px dashed var(--indigo-400)', background: 'var(--indigo-50)', color: 'var(--indigo-700)', borderRadius: 13, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="plus" size={18} stroke={2.2} /> Agregar material
        </button>
        {materials.map((m) => (
          <MaterialRow key={m.id} material={m}
            onClick={() => nav('/profesor/material', { state: { material: m, className: cls.name } })}
            onProject={(mat) => setProjectMaterial(mat)} />
        ))}
        {materials.length === 0 && <EmptyState icon="folder" title="Sin material" body="Agrega el primer archivo de este tema." />}
      </div>
      <AddMaterialSheet topicId={topicId} open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); load(); }} />
      <ProjectSheet material={projectMaterial} open={!!projectMaterial} onClose={() => setProjectMaterial(null)} />
    </div>
  );
}
