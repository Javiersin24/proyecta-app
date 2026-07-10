import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { Screen } from '../../ui/Screen.jsx';
import { ClassCard, SectionHeader, EmptyState, useIsWide, IconButton } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';
import CreateClassSheet from './CreateClassSheet.jsx';

export default function TeacherHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const wide = useIsWide();
  const [classes, setClasses] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => get('/teacher/classes').then((d) => setClasses(d.classes));
  useEffect(() => { load(); }, []);

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
