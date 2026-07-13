// Pantalla principal de Inteligencia Académica (Premium). Si el profesor no
// tiene Premium ve una pantalla de actualización; si lo tiene, se descarga el
// paquete de datos de todas sus clases (GET /teacher/intelligence) y se corre
// la analítica localmente. No se inventan cifras.
import { useEffect, useMemo, useState } from 'react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { TopBar, SectionHeader, Chip, EmptyState, Avatar, IconButton } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';
import { GB_MAX, GB_PASS, gbFmt } from '../../lib/gradebook.js';
import { analyzeTeacherClasses, generateRecomendaciones, generateTendencias, RISK_META, detectClassInsights, detectStudentInsight } from '../../lib/intelligence.js';
import {
  InsightStatGrid, TONE_META, toneFor, RiskBadge, RecCard, CompareCard,
  StudentFichaModal, ReportModal, AIAssistantPanel, adminBtnGhost,
} from './intelligenceParts.jsx';
import { InsightCard, ImpactSimulatorPanel } from './copilotParts.jsx';

// ── Pantalla de actualización a Premium (profesor sin acceso) ────────────────
function PremiumUpsell() {
  const BENEFITS = [
    { icon: 'chart', title: 'Análisis automático de tus clases', body: 'Promedios, aprobados, asistencia y estudiantes en riesgo, calculados solos a partir de tus notas y asistencia.' },
    { icon: 'alertTriangle', title: 'Detección temprana de riesgo', body: 'Sabe qué estudiantes necesitan apoyo antes de que sea tarde, con su probabilidad de aprobar.' },
    { icon: 'sparkles', title: 'Asistente con Inteligencia Artificial', body: 'Pregúntale sobre el rendimiento de tus clases y recibe recomendaciones concretas.' },
    { icon: 'download', title: 'Reportes en PDF', body: 'Genera reportes por clase o por estudiante, listos para imprimir o compartir.' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Inteligencia académica" subtitle="Función Premium" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--indigo-500) 0%, #7C5CFA 100%)', borderRadius: 20, padding: '26px 22px', color: '#fff', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <Icon name="sparkles" size={30} color="#fff" />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Desbloquea la Inteligencia Académica</div>
          <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 6, lineHeight: 1.5 }}>Convierte tus notas y asistencia en información que te ayuda a enseñar mejor.</div>
        </div>

        <SectionHeader>Qué incluye</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BENEFITS.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={b.icon} size={20} color="var(--indigo-600)" /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>{b.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-2)', marginTop: 2, lineHeight: 1.4 }}>{b.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '18px 18px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            Para activar Premium en tu cuenta, escríbenos a{' '}
            <a href="mailto:tecnopcpty@gmail.com" style={{ color: 'var(--indigo-600)', fontWeight: 700, textDecoration: 'none' }}>tecnopcpty@gmail.com</a>.
          </div>
          <a href="mailto:tecnopcpty@gmail.com?subject=Quiero activar Premium en Proyecta" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, width: '100%', boxSizing: 'border-box', border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 12, padding: '13px 16px', fontWeight: 800, fontSize: 14.5, textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
            <Icon name="sparkles" size={17} color="#fff" />Solicitar activación
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard completo (profesor Premium) ────────────────────────────────────
export default function IntelligenceScreen() {
  const { user } = useAuth();
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [reporte, setReporte] = useState(null);
  const [asistente, setAsistente] = useState(false);
  const [simulador, setSimulador] = useState(false);

  const isPremium = !!user?.premium;

  useEffect(() => {
    if (!isPremium) return;
    let alive = true;
    get('/teacher/intelligence')
      .then((d) => { if (alive) setClasses(d.classes || []); })
      .catch((e) => { if (alive) setError(e.message || 'No se pudo cargar el análisis.'); });
    return () => { alive = false; };
  }, [isPremium]);

  const agg = useMemo(() => (classes ? analyzeTeacherClasses(classes) : null), [classes]);

  if (!isPremium) return <PremiumUpsell />;

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Inteligencia académica" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          <EmptyState icon="alertTriangle" title="No se pudo cargar" body={error} />
        </div>
      </div>
    );
  }

  if (!agg) return null;

  if (!agg.misClases.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Inteligencia académica" subtitle="Análisis de tus clases" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          <EmptyState icon="sparkles" title="Sin datos aún" body="Cuando crees clases y registres notas o asistencia, verás aquí el análisis completo." />
        </div>
      </div>
    );
  }

  const topRiesgo = [...agg.allStudents].sort((a, b) => a.risk.prob - b.risk.prob).slice(0, 5);
  const fichaCls = ficha ? agg.misClases.find((c) => c.id === ficha.classId) : null;

  // Explicaciones inteligentes: patrones de clase + el estudiante-caso más claro.
  const insights = [];
  agg.analyses.forEach((a) => detectClassInsights(a).forEach((i) => insights.push(i)));
  for (const s of [...agg.allStudents].sort((a, b) => a.risk.prob - b.risk.prob)) {
    const si = detectStudentInsight(s);
    if (si) { insights.push(si); break; }
  }
  const topInsights = insights.slice(0, 4);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Inteligencia académica" subtitle={`${agg.misClases.length} clase${agg.misClases.length !== 1 ? 's' : ''} analizada${agg.misClases.length !== 1 ? 's' : ''}`}
        trailing={<IconButton name="sparkles" ariaLabel="Preguntar a la IA" onClick={() => setAsistente(true)} />} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '8px 2px 0' }}>
          <Chip variant="premium"><Icon name="sparkles" size={11} />Función Premium</Chip>
        </div>

        <button onClick={() => setAsistente(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--indigo-500)', border: 0, borderRadius: 16, padding: '16px 18px', marginTop: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="sparkles" size={21} color="#fff" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>Copiloto Pedagógico</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 1 }}>Pregúntale sobre tus clases: "¿Qué estudiantes necesitan más apoyo?"…</div>
          </div>
          <Icon name="chevron" size={18} color="#fff" />
        </button>

        <button onClick={() => setSimulador(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '14px 16px', marginTop: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="target" size={19} color="var(--indigo-600)" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg-1)' }}>Simulador de Impacto</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 1 }}>"¿Qué pasaría si hago un taller de refuerzo?"</div>
          </div>
          <Icon name="chevron" size={18} color="var(--fg-3)" />
        </button>

        {topInsights.length > 0 && (
          <>
            <SectionHeader>Explicaciones inteligentes</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topInsights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
            </div>
          </>
        )}

        <SectionHeader>Resumen general</SectionHeader>
        <InsightStatGrid stats={[
          { n: gbFmt(agg.promedioGeneral), l: 'Promedio general', icon: 'chart', tone: toneFor(agg.promedioGeneral, { good: GB_PASS + 0.5, warn: GB_PASS }) },
          { n: agg.pctAprobadosGeneral != null ? agg.pctAprobadosGeneral + '%' : '—', l: 'Estudiantes aprobando', icon: 'check', tone: toneFor(agg.pctAprobadosGeneral, { good: 70, warn: 50 }) },
          { n: agg.pctRiesgoGeneral + '%', l: 'En riesgo académico', icon: 'alertTriangle', tone: toneFor(agg.pctRiesgoGeneral, { good: 15, warn: 30, higherIsBetter: false }) },
          { n: agg.asistenciaGeneral != null ? Math.round(agg.asistenciaGeneral * 100) + '%' : '—', l: 'Asistencia promedio', icon: 'check', tone: toneFor(agg.asistenciaGeneral != null ? Math.round(agg.asistenciaGeneral * 100) : null, { good: 90, warn: 75 }) },
          { n: agg.pendientesTotal, l: 'Entregas pendientes', icon: 'clock', tone: toneFor(agg.pendientesTotal, { good: 0, warn: 3, higherIsBetter: false }) },
        ]} />

        <SectionHeader>Promedio por clase</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agg.analyses.map((a) => {
            const tone = toneFor(a.promedio, { good: GB_PASS + 0.5, warn: GB_PASS });
            const t = TONE_META[tone];
            return (
              <div key={a.cls.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.bg, borderRadius: 13, padding: '12px 16px' }}>
                <div style={{ width: 110, fontSize: 12.5, fontWeight: 700, color: t.fg, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.cls.name}</div>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.65)', overflow: 'hidden' }}>
                  <div style={{ width: `${a.promedio != null ? Math.round((a.promedio / GB_MAX) * 100) : 0}%`, height: '100%', borderRadius: 999, background: t.icon }} />
                </div>
                <div style={{ width: 34, textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: t.fg }}>{gbFmt(a.promedio)}</div>
              </div>
            );
          })}
        </div>

        {(agg.mejorClase || agg.claseApoyo || agg.mejorAsistencia) && (
          <>
            <SectionHeader>Comparativas entre tus clases</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
              {agg.mejorClase && <CompareCard icon="award" color="#1a6b47" bg="var(--success-100)" label="Mejor promedio" value={agg.mejorClase.cls.name} sub={`Promedio ${gbFmt(agg.mejorClase.promedio)}`} />}
              {agg.claseApoyo && <CompareCard icon="alertTriangle" color="var(--coral-700)" bg="var(--coral-50)" label="Necesita más apoyo" value={agg.claseApoyo.cls.name} sub={`Promedio ${gbFmt(agg.claseApoyo.promedio)}`} />}
              {agg.mejorAsistencia && agg.mejorAsistencia.attendanceAvg != null && <CompareCard icon="check" color="var(--indigo-600)" bg="var(--indigo-50)" label="Mejor asistencia" value={agg.mejorAsistencia.cls.name} sub={`${Math.round(agg.mejorAsistencia.attendanceAvg * 100)}% presente`} />}
            </div>
          </>
        )}

        <SectionHeader>Tendencias detectadas</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {generateTendencias(agg).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="chart" size={15} color="var(--indigo-600)" /></div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45, paddingTop: 5 }}>{t}</div>
            </div>
          ))}
        </div>

        <SectionHeader>Recomendaciones</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {generateRecomendaciones(agg).map((r, i) => <RecCard key={i} r={r} />)}
        </div>

        {topRiesgo.length > 0 && (
          <>
            <SectionHeader>Estudiantes en mayor riesgo</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topRiesgo.map((s) => {
                const m = RISK_META[s.risk.level];
                return (
                  <button key={s.classId + s.id} onClick={() => setFicha(s)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 13, border: 0, borderLeft: `4px solid ${m.color}`, background: m.bg, cursor: 'pointer', textAlign: 'left' }}>
                    <Avatar name={s.name} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{s.className} · Promedio {gbFmt(s.avg)}</div>
                    </div>
                    <RiskBadge risk={s.risk} />
                    <Icon name="chevron" size={16} color={m.color} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <SectionHeader action={<button onClick={() => setReporte({ tipo: 'general', agg })} style={adminBtnGhost}><Icon name="download" size={14} />PDF</button>}>Reportes</SectionHeader>
        <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>Genera un reporte con el resumen de todas tus clases. Para reportes por grupo o por estudiante, entra a una clase → pestaña <b>Análisis</b>.</div>
      </div>

      {asistente && <AIAssistantPanel agg={agg} onClose={() => setAsistente(false)} />}
      {simulador && <ImpactSimulatorPanel agg={agg} onClose={() => setSimulador(false)} />}
      {ficha && fichaCls && <StudentFichaModal cls={fichaCls} student={ficha} onClose={() => setFicha(null)} onReport={setReporte} />}
      {reporte && <ReportModal data={reporte} onClose={() => setReporte(null)} />}
    </div>
  );
}
