import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { Screen } from '../../ui/Screen.jsx';
import { ClassCard, SectionHeader, EmptyState, useIsWide, IconButton } from '../../ui/kit.jsx';
import { analyzeTeacherClasses, detectOpportunities } from '../../lib/intelligence.js';
import Icon from '../../ui/Icon.jsx';
import CreateClassSheet from './CreateClassSheet.jsx';

export default function TeacherHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const wide = useIsWide();
  const [classes, setClasses] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [opps, setOpps] = useState([]);

  const load = () => get('/teacher/classes').then((d) => setClasses(d.classes));
  useEffect(() => { load(); }, []);

  // Copiloto proactivo: si el profesor es Premium, detectamos oportunidades y
  // se las mostramos al entrar (no tiene que preguntar nada).
  useEffect(() => {
    if (!user?.premium) return;
    let alive = true;
    get('/teacher/intelligence')
      .then((d) => { if (alive) setOpps(detectOpportunities(analyzeTeacherClasses(d.classes || []))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.premium]);

  return (
    <Screen>
      {!wide && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Hola</div>
            <div className="h2">{user?.name?.split(' ')[0]}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}><Icon name="bell" size={20} color="var(--fg-3)" /></div>
        </div>
      )}
      {opps.length > 0 && (
        <button onClick={() => nav('/profesor/inteligencia')} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, var(--indigo-500) 0%, #7C5CFA 100%)', border: 0, borderRadius: 16, padding: '15px 16px', marginBottom: 16, cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="sparkles" size={20} color="#fff" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{`Hoy detecté ${opps.length} oportunidad${opps.length !== 1 ? 'es' : ''} de mejora`}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>{opps[0].hallazgo}</div>
          </div>
          <Icon name="chevron" size={18} color="#fff" />
        </button>
      )}

      <SectionHeader action={
        <button onClick={() => setShowCreate(true)} style={{
          border: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', borderRadius: 9,
          padding: '7px 12px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}><Icon name="plus" size={14} stroke={2.4} /> Crear clase</button>
      }>Mis clases</SectionHeader>

      {classes == null ? null : classes.length === 0 ? (
        <EmptyState icon="book" title="Aún no tienes clases" body="Crea tu primera clase para empezar a compartir material y tareas." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(auto-fill, minmax(260px,1fr))' : '1fr', gap: 12 }}>
          {classes.map((c) => (
            <ClassCard key={c.id} cls={c} onClick={() => nav(`/profesor/clases/${c.id}`)} />
          ))}
        </div>
      )}

      <CreateClassSheet open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
    </Screen>
  );
}
