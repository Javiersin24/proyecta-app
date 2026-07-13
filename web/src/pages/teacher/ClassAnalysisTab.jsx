// Pestaña "Análisis" dentro de una clase (solo profesor, Premium). Descarga el
// paquete de inteligencia y usa la clase correspondiente. Toda la analítica se
// calcula localmente a partir de notas/asistencia/tareas reales.
import { useEffect, useMemo, useState } from 'react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { SectionHeader, Chip, EmptyState, Avatar } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';
import { GB_MAX, GB_PASS, gbFmt } from '../../lib/gradebook.js';
import { analyzeClass, riCategoryTrend, generateClassRecomendaciones, RISK_META, detectClassInsights, detectStudentInsight } from '../../lib/intelligence.js';
import { InsightStatGrid, TONE_META, toneFor, RiskBadge, RecCard, StudentFichaModal, ReportModal, adminBtnGhost } from './intelligenceParts.jsx';
import { InsightCard } from './copilotParts.jsx';

export default function ClassAnalysisTab({ classId }) {
  const { user } = useAuth();
  const isPremium = !!user?.premium;
  const [cls, setCls] = useState(null);
  const [error, setError] = useState(null);
  const [fichaName, setFichaName] = useState(null);
  const [reporte, setReporte] = useState(null);

  useEffect(() => {
    if (!isPremium) return;
    let alive = true;
    get('/teacher/intelligence')
      .then((d) => { if (alive) setCls((d.classes || []).find((c) => String(c.id) === String(classId)) || null); })
      .catch((e) => { if (alive) setError(e.message || 'No se pudo cargar el análisis.'); });
    return () => { alive = false; };
  }, [isPremium, classId]);

  const a = useMemo(() => (cls ? analyzeClass(cls) : null), [cls]);
  const trend = useMemo(() => (cls ? riCategoryTrend(cls) : null), [cls]);

  if (!isPremium) {
    return (
      <div style={{ padding: '4px 2px' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--indigo-500) 0%, #7C5CFA 100%)', borderRadius: 18, padding: '22px 20px', color: '#fff', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
            <Icon name="sparkles" size={26} color="#fff" />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18 }}>Análisis con Inteligencia Académica</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6, lineHeight: 1.5 }}>Con Premium verás el desempeño del grupo, los estudiantes en riesgo y recomendaciones para esta clase.</div>
          <a href="mailto:tecnopcpty@gmail.com?subject=Quiero activar Premium en Proyecta" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, background: 'rgba(255,255,255,0.95)', color: 'var(--indigo-700)', borderRadius: 11, padding: '10px 18px', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', fontFamily: 'var(--font-sans)' }}>
            Actualizar a Premium
          </a>
        </div>
      </div>
    );
  }

  if (error) return <div style={{ padding: '12px 2px' }}><EmptyState icon="alertTriangle" title="No se pudo cargar" body={error} /></div>;
  if (!a) return null;

  if (!a.students.length) {
    return (
      <div style={{ padding: '12px 4px 40px' }}>
        <Chip variant="premium"><Icon name="sparkles" size={11} />Premium</Chip>
        <div style={{ marginTop: 10 }}>
          <EmptyState icon="sparkles" title="Aún sin estudiantes" body="Cuando se unan estudiantes a esta clase, verás aquí su análisis de rendimiento." />
        </div>
      </div>
    );
  }

  const sorted = [...a.students].sort((x, y) => x.risk.prob - y.risk.prob);
  const ficha = fichaName ? a.students.find((s) => s.name === fichaName) : null;

  // Explicaciones inteligentes de este grupo (patrones de clase + estudiante-caso).
  const classInsights = [...detectClassInsights(a)];
  for (const s of sorted) { const si = detectStudentInsight(s); if (si) { classInsights.push(si); break; } }
  const topInsights = classInsights.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 2px 4px', gap: 8, flexWrap: 'wrap' }}>
        <Chip variant="premium"><Icon name="sparkles" size={11} />Premium</Chip>
        <button onClick={() => setReporte({ tipo: 'grupo', a })} style={adminBtnGhost}><Icon name="download" size={14} />Reporte del grupo</button>
      </div>

      <InsightStatGrid stats={[
        { n: gbFmt(a.promedio), l: 'Promedio del salón', icon: 'chart', tone: toneFor(a.promedio, { good: GB_PASS + 0.5, warn: GB_PASS }) },
        { n: a.pctAprobados != null ? a.pctAprobados + '%' : '—', l: 'Aprobados', icon: 'check', tone: toneFor(a.pctAprobados, { good: 70, warn: 50 }) },
        { n: a.pctRiesgo + '%', l: 'En riesgo', icon: 'alertTriangle', tone: toneFor(a.pctRiesgo, { good: 15, warn: 30, higherIsBetter: false }) },
        { n: a.attendanceAvg != null ? Math.round(a.attendanceAvg * 100) + '%' : '—', l: 'Asistencia', icon: 'check', tone: toneFor(a.attendanceAvg != null ? Math.round(a.attendanceAvg * 100) : null, { good: 90, warn: 75 }) },
      ]} />

      {trend != null && Math.abs(trend) >= 0.1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: trend > 0 ? 'var(--success-100)' : '#FEE2E2', borderRadius: 12, padding: '10px 14px' }}>
          <Icon name={trend > 0 ? 'trendUp' : 'trendDown'} size={16} color={trend > 0 ? '#1a6b47' : '#B42318'} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: trend > 0 ? '#1a6b47' : '#B42318' }}>
            {trend > 0 ? `Mejora de ${((trend / GB_MAX) * 100).toFixed(0)}%` : `Bajó ${Math.abs((trend / GB_MAX) * 100).toFixed(0)}%`} entre las primeras y últimas notas registradas.
          </span>
        </div>
      )}

      {topInsights.length > 0 && (
        <>
          <SectionHeader>Explicaciones inteligentes</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topInsights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
          </div>
        </>
      )}

      <SectionHeader>Análisis por tema</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {a.categorias.map((c) => {
          const tone = toneFor(c.avgPct, { good: 85, warn: 70 });
          const t = TONE_META[tone];
          return (
            <div key={c.name} style={{ background: t.bg, borderRadius: 13, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700, color: t.fg }}>
                <span>{c.name}</span><span>{c.avgPct != null ? c.avgPct + '%' : '—'}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.65)', overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${c.avgPct || 0}%`, height: '100%', borderRadius: 999, background: t.icon }} />
              </div>
              <div style={{ fontSize: 11.5, color: t.fg, opacity: 0.8, marginTop: 4, fontWeight: 500 }}>{c.status}</div>
            </div>
          );
        })}
      </div>

      <SectionHeader>Estudiantes ({a.students.length})</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((s) => {
          const m = RISK_META[s.risk.level];
          return (
            <button key={s.id} onClick={() => setFichaName(s.name)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 13, border: 0, borderLeft: `4px solid ${m.color}`, background: m.bg, cursor: 'pointer', textAlign: 'left' }}>
              <Avatar name={s.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-1)' }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Promedio {gbFmt(s.avg)} · Asistencia {Math.round(s.attendance.rate * 100)}%</div>
              </div>
              <RiskBadge risk={s.risk} />
              <Icon name="chevron" size={16} color={m.color} />
            </button>
          );
        })}
      </div>

      <SectionHeader>Recomendaciones para este grupo</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {generateClassRecomendaciones(a, cls).map((r, i) => <RecCard key={i} r={r} />)}
      </div>

      {ficha && <StudentFichaModal cls={cls} student={ficha} onClose={() => setFichaName(null)} onReport={setReporte} />}
      {reporte && <ReportModal data={reporte} onClose={() => setReporte(null)} />}
    </div>
  );
}
