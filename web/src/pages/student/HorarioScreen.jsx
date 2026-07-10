import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { TopBar, SectionHeader, Avatar, EmptyState } from '../../ui/kit.jsx';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function StudentHorarioScreen() {
  const [data, setData] = useState(null);
  const [califs, setCalifs] = useState([]);

  useEffect(() => {
    get('/student/horario').then(setData);
    get('/student/calificaciones').then((d) => setCalifs(d.calificaciones || []));
  }, []);

  if (!data) return null;
  if (!data.grupo) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Mi horario" subtitle="Horario, profesores y notas" />
        <div style={{ padding: '4px 16px 24px' }}>
          <EmptyState icon="calendar" title="Sin grupo asignado" body="Cuando el colegio te asigne un grupo, verás aquí tu horario y calificaciones." />
        </div>
      </div>
    );
  }

  const horas = [...new Set(data.horario.map((h) => h.hora))].sort();
  const findSlot = (dia, hora) => data.horario.find((h) => h.dia === dia && h.hora === hora);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Mi horario" subtitle={`${data.grupo.nombre} · ${data.grupo.aula || ''}`} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader>Horario semanal</SectionHeader>
        {!data.horario.length ? (
          <EmptyState icon="calendar" title="Sin clases programadas" body="Tu horario aparecerá aquí cuando el colegio lo publique." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `58px repeat(${DIAS.length}, minmax(96px,1fr))`, gap: 1, background: 'var(--ink-200)', border: '1px solid var(--ink-200)', borderRadius: 14, overflow: 'hidden', minWidth: 520 }}>
              <div style={{ background: 'var(--paper-50)' }} />
              {DIAS.map((d) => <div key={d} style={{ background: 'var(--white)', padding: '8px 6px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: 'var(--fg-2)', textTransform: 'uppercase' }}>{d.slice(0, 3)}</div>)}
              {horas.map((hora) => (
                <div key={hora} style={{ display: 'contents' }}>
                  <div style={{ background: 'var(--paper-50)', padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', fontWeight: 700 }}>{hora}</div>
                  {DIAS.map((dia) => {
                    const slot = findSlot(dia, hora);
                    return (
                      <div key={dia + hora} style={{ background: slot ? 'var(--indigo-50)' : 'var(--white)', padding: slot ? '6px 8px' : 0, minHeight: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {slot && <><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo-700)' }}>{slot.materia}</div><div style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>{slot.profesor || 'Sin asignar'}</div></>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <SectionHeader>Profesores por materia</SectionHeader>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
          {data.profesores.map((p, i) => (
            <div key={p.materia} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
              <Avatar name={p.nombre} size={32} />
              <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.materia}</div><div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{p.nombre}</div></div>
            </div>
          ))}
          {!data.profesores.length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Aún no hay materias asignadas.</div>}
        </div>

        <SectionHeader>Calificaciones del semestre</SectionHeader>
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
          {califs.map((c, i) => (
            <div key={c.materia} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{c.materia}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--indigo-600)' }}>{c.valor}</span>
            </div>
          ))}
          {!califs.length && <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--fg-3)' }}>Aún no hay calificaciones registradas.</div>}
        </div>
      </div>
    </div>
  );
}
