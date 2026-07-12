import { useLocation, useNavigate } from 'react-router-dom';
import { TopBar, EmptyState, MATERIAL_VISUAL, StatusDot } from '../../ui/kit.jsx';
import { useProjecting } from '../../lib/ProjectingContext.jsx';
import Icon from '../../ui/Icon.jsx';
import ProjectSheet from '../shared/ProjectSheet.jsx';
import { useState } from 'react';

// Vista de un solo material: previsualización + acción "Proyectar en el aula".
// Este es el único punto donde se dispara la proyección al abrir un documento
// (la lista también permite proyectar rápido, pero aquí se ve el detalle completo).
export default function TeacherMaterialViewerScreen() {
  const nav = useNavigate();
  const loc = useLocation();
  const { session } = useProjecting();
  const [projectOpen, setProjectOpen] = useState(false);
  const material = loc.state?.material;
  const className = loc.state?.className;

  if (!material) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Material" onBack={() => nav(-1)} />
        <EmptyState icon="folder" title="No hay nada que mostrar" body="Abre este material desde una clase o tema." />
      </div>
    );
  }

  const v = MATERIAL_VISUAL[material.kind] || MATERIAL_VISUAL.pdf;
  const isProjectingThis = session?.fileName === material.name;

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

        {isProjectingThis && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--coral-50)', color: 'var(--coral-600)', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
            <StatusDot status="live" /> Proyectando ahora en {session.projectorName}
          </div>
        )}

        <button onClick={() => setProjectOpen(true)} style={{
          height: 52, border: 0, borderRadius: 14, cursor: 'pointer', background: 'var(--indigo-600)', color: '#fff',
          fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        }}>
          <Icon name="cast" size={19} /> Proyectar en el aula
        </button>
      </div>
      <ProjectSheet material={material} open={projectOpen} onClose={() => setProjectOpen(false)} />
    </div>
  );
}
