import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { get } from '../../lib/api.js';
import { TopBar, EmptyState, MATERIAL_VISUAL } from '../../ui/kit.jsx';
import ProjectAction from '../shared/ProjectAction.jsx';
import Icon from '../../ui/Icon.jsx';

// Vista de un solo material: previsualización + acción "Proyectar en el aula".
// Este es el único punto donde se dispara la proyección al abrir un documento
// (la lista también permite proyectar rápido, pero aquí se ve el detalle completo).
export default function TeacherMaterialViewerScreen() {
  const nav = useNavigate();
  const loc = useLocation();
  const material = loc.state?.material;
  const className = loc.state?.className;
  const classId = loc.state?.classId;
  const [cls, setCls] = useState(null);

  useEffect(() => { if (classId) get(`/teacher/classes/${classId}`).then((d) => setCls(d.class)); }, [classId]);

  if (!material) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Material" onBack={() => nav(-1)} />
        <EmptyState icon="folder" title="No hay nada que mostrar" body="Abre este material desde una clase o tema." />
      </div>
    );
  }

  const v = MATERIAL_VISUAL[material.kind] || MATERIAL_VISUAL.pdf;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title={material.name} subtitle={className} onBack={() => nav(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: v.bg, borderRadius: 18, padding: '48px 20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 12, textAlign: 'center',
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.55)', color: v.color, display: 'grid', placeItems: 'center' }}>
            <Icon name={v.icon} size={34} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--fg-1)' }}>{material.name}</div>
          {material.meta && <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{material.meta}</div>}
        </div>

        {cls && <ProjectAction cls={cls} material={material} onLinked={(p) => setCls((c) => ({ ...c, projector: p, projectorId: p?.id || null }))} />}
      </div>
    </div>
  );
}
