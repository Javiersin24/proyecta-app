import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { TopBar, SectionHeader, Chip, EmptyState } from '../../ui/kit.jsx';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
function diaDeHoy() {
  const idx = new Date().getDay();
  return idx >= 1 && idx <= 5 ? DIAS[idx - 1] : null;
}

export default function TeacherHorarioScreen() {
  const [slots, setSlots] = useState(null);
  useEffect(() => { get('/teacher/horario').then((d) => setSlots(d.horario)); }, []);
  if (!slots) return null;

  const hoy = diaDeHoy();
  const hoyClases = slots.filter((s) => s.dia === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const horas = [...new Set(slots.map((s) => s.hora))].sort();
  const findSlot = (dia, hora) => slots.find((s) => s.dia === dia && s.hora === hora);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Mi horario" subtitle={`${slots.length} clase${slots.length !== 1 ? 's' : ''} a la semana`} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!slots.length ? (
          <EmptyState icon="calendar" title="Sin clases asignadas" body="Cuando el colegio te asigne materias y grupos, verás aquí tu horario semanal." />
        ) : (
          <>
            <SectionHeader>{hoy ? `Clases de hoy · ${hoy}` : 'Hoy no tienes clases'}</SectionHeader>
            {hoy && hoyClases.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hoyClases.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '12px 14px' }}>
                    <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: 'var(--indigo-600)' }}>{s.hora}</div>
                    </div>
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--ink-200)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.materia}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.grupo} · {s.aula || 'Sin aula'}</div>
                    </div>
                    <Chip variant="info">{s.grupo}</Chip>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16, fontSize: 13, color: 'var(--fg-3)', textAlign: 'center' }}>
                {hoy ? 'No tienes clases programadas para hoy.' : 'Es fin de semana — disfruta el descanso.'}
              </div>
            )}

            <SectionHeader>Horario semanal</SectionHeader>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `58px repeat(${DIAS.length}, minmax(104px,1fr))`, gap: 1, background: 'var(--ink-200)', border: '1px solid var(--ink-200)', borderRadius: 14, overflow: 'hidden', minWidth: 560 }}>
                <div style={{ background: 'var(--paper-50)' }} />
                {DIAS.map((d) => <div key={d} style={{ background: d === hoy ? 'var(--indigo-50)' : 'var(--white)', padding: '8px 6px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: d === hoy ? 'var(--indigo-700)' : 'var(--fg-2)', textTransform: 'uppercase' }}>{d.slice(0, 3)}</div>)}
                {horas.map((hora) => (
                  <div key={hora} style={{ display: 'contents' }}>
                    <div style={{ background: 'var(--paper-50)', padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', fontWeight: 700 }}>{hora}</div>
                    {DIAS.map((dia) => {
                      const slot = findSlot(dia, hora);
                      return (
                        <div key={dia + hora} style={{ background: slot ? 'var(--indigo-50)' : 'var(--white)', padding: slot ? '6px 8px' : 0, minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          {slot && <><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo-700)' }}>{slot.materia}</div><div style={{ fontSize: 9.5, color: 'var(--fg-3)' }}>{slot.grupo} · {slot.aula || ''}</div></>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
