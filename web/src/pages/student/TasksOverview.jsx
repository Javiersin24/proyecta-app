import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, SectionHeader, Chip, EmptyState } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const Row = ({ r, statusChip, onClick }) => (
  <button onClick={onClick} style={{ width: '100%', padding: 14, border: '1px solid var(--border-subtle)', background: 'var(--white)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center' }}><Icon name="clipboard" size={20} stroke={2} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-600)', marginBottom: 2 }}>{r.className}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>{r.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 12, fontWeight: 600 }}>
        <span style={{ color: 'var(--fg-3)' }}>{r.due}</span>
        <span style={{ color: 'var(--fg-3)' }}>·</span>
        <span style={{ color: 'var(--fg-3)' }}>{r.grade != null ? `Calificada · ${r.grade}/100` : r.status === 'late' ? 'Entregada tarde' : r.status === 'done' ? 'Entregada' : 'Sin entregar'}</span>
      </div>
    </div>
    {statusChip}
    <Icon name="chevron" size={18} color="var(--fg-3)" style={{ marginTop: 6 }} />
  </button>
);

export default function StudentTasksOverview() {
  const nav = useNavigate();
  const [data, setData] = useState({ pendientes: [], completadas: [] });

  useEffect(() => { get('/student/tasks').then(setData); }, []);
  const open = (r) => nav(`/estudiante/clases/${r.classId}/tareas/${r.taskId}`);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Tareas" subtitle="De todos tus cursos" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>Pendientes</SectionHeader>
        {data.pendientes.map((r) => <Row key={r.classId + r.taskId} r={r} statusChip={<Chip variant="warning">Pendiente</Chip>} onClick={() => open(r)} />)}
        {!data.pendientes.length && <EmptyState icon="clipboard" title="Sin pendientes" body="Estás al día — no hay tareas pendientes." />}

        <SectionHeader>Completadas</SectionHeader>
        {data.completadas.map((r) => <Row key={r.classId + r.taskId} r={r} statusChip={<Chip variant="success">Completada</Chip>} onClick={() => open(r)} />)}
        {!data.completadas.length && <EmptyState icon="check" title="Aún nada completado" body="Las tareas entregadas aparecerán aquí." />}
      </div>
    </div>
  );
}
