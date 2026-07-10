import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, SectionHeader, Chip, EmptyState } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const Row = ({ cls, task, subtitle, statusChip, onClick }) => (
  <button onClick={onClick} style={{ width: '100%', padding: 14, border: '1px solid var(--border-subtle)', background: 'var(--white)', borderRadius: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center' }}><Icon name="clipboard" size={20} stroke={2} /></div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-600)', marginBottom: 2 }}>{cls.name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, lineHeight: 1.25 }}>{task.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 12, fontWeight: 600 }}>
        <span style={{ color: 'var(--fg-3)' }}>{task.due}</span>
        {subtitle && <><span style={{ color: 'var(--fg-3)' }}>·</span><span style={{ color: 'var(--fg-3)' }}>{subtitle}</span></>}
      </div>
    </div>
    {statusChip}
    <Icon name="chevron" size={18} color="var(--fg-3)" style={{ marginTop: 6 }} />
  </button>
);

export default function TeacherTasksOverview() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    get('/teacher/classes').then((d) => {
      const out = [];
      d.classes.forEach((cls) => {
        (cls.tasks || []).forEach((t) => {
          const subs = t.submissions || [];
          const entregadas = subs.filter((s) => s.status === 'done' || s.status === 'late');
          const revisadas = entregadas.filter((s) => s.grade != null);
          const done = subs.length > 0 && entregadas.length === revisadas.length && entregadas.length === subs.length;
          out.push({ cls, task: t, done, subtitle: `${revisadas.length}/${subs.length} calificadas` });
        });
      });
      setRows(out);
    });
  }, []);

  const pendientes = rows.filter((r) => !r.done);
  const completadas = rows.filter((r) => r.done);
  const open = (r) => nav(`/profesor/clases/${r.cls.id}/tareas/${r.task.id}`);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Tareas" subtitle="De todas tus clases" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>Pendientes</SectionHeader>
        {pendientes.map((r) => <Row key={r.cls.id + r.task.id} cls={r.cls} task={r.task} subtitle={r.subtitle} statusChip={<Chip variant="warning">Pendiente</Chip>} onClick={() => open(r)} />)}
        {!pendientes.length && <EmptyState icon="clipboard" title="Sin pendientes" body="Estás al día — no hay tareas pendientes." />}

        <SectionHeader>Completadas</SectionHeader>
        {completadas.map((r) => <Row key={r.cls.id + r.task.id} cls={r.cls} task={r.task} subtitle={r.subtitle} statusChip={<Chip variant="success">Completada</Chip>} onClick={() => open(r)} />)}
        {!completadas.length && <EmptyState icon="check" title="Aún nada completado" body="Las tareas entregadas o calificadas aparecerán aquí." />}
      </div>
    </div>
  );
}
