// Copiloto Pedagógico — piezas visuales de los módulos que razonan junto al
// profesor: Explicación Inteligente (hipótesis + evidencia + confianza +
// acciones priorizadas) y Simulador de Impacto. Todas las CIFRAS provienen del
// motor de analítica (web/src/lib/intelligence.js); la IA solo narra/estima
// dentro de los límites que el motor le entrega — nunca inventa números.
import { useEffect, useRef, useState } from 'react';
import { post } from '../../lib/api.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { IconButton, MarkdownLite } from '../../ui/kit.jsx';
import { buildImpactBounds } from '../../lib/intelligence.js';
import { TONE_META, adminBtnGhost } from './intelligenceParts.jsx';
import Icon from '../../ui/Icon.jsx';

const PRIO_META = {
  Alta: { bg: '#FEE2E2', fg: '#B42318' },
  Media: { bg: '#FEF3C7', fg: '#92600A' },
  Baja: { bg: 'var(--indigo-50)', fg: 'var(--indigo-700)' },
};

const MODULO_META = {
  explicacion: { label: 'Explicación inteligente', icon: 'sparkles' },
  prediccion: { label: 'Predicción', icon: 'trendDown' },
  refuerzo: { label: 'Refuerzo positivo', icon: 'trendUp' },
};

// Cadena del motor pedagógico: Actividad → Evaluación → Seguimiento.
const PlanChain = ({ plan }) => {
  const pasos = [
    { k: 'Actividad sugerida', v: plan.actividad, icon: 'target' },
    { k: 'Evaluación sugerida', v: plan.evaluacion, icon: 'clipboard' },
    { k: 'Seguimiento', v: plan.seguimiento, icon: 'clock' },
  ].filter((p) => p.v);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {pasos.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={p.icon} size={13} color="var(--indigo-600)" /></div>
            {i < pasos.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 14, background: 'var(--ink-200)' }} />}
          </div>
          <div style={{ paddingBottom: i < pasos.length - 1 ? 12 : 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-3)' }}>{p.k}</div>
            <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45, marginTop: 1 }}>{p.v}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Barra de nivel de confianza (segmentada, estilo del diseño).
export const ConfidenceBar = ({ confianza }) => {
  if (!confianza) return null;
  const { pct, label, bars } = confianza;
  const color = pct >= 85 ? 'var(--success-500)' : pct >= 70 ? 'var(--indigo-500)' : pct >= 55 ? 'var(--warning-500)' : 'var(--danger-500)';
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{pct}%</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confianza {label}</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < bars ? color : 'var(--ink-100)' }} />
        ))}
      </div>
    </div>
  );
};

// Tarjeta compacta para el resumen proactivo "Hoy detecté N oportunidades".
const OP_ICON = { bad: 'alertTriangle', warn: 'target', good: 'trendUp', neutral: 'sparkles' };
export const OpportunityCard = ({ op }) => {
  const t = TONE_META[op.tono] || TONE_META.neutral;
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${t.icon}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: t.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={OP_ICON[op.tono] || 'sparkles'} size={15} color={t.icon} /></div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.4, fontWeight: 600 }}>{op.hallazgo}</div>
        {op.className && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{op.className}</div>}
      </div>
    </div>
  );
};

const EvidenceList = ({ evidencia }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {evidencia.map((e, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--fg-2)' }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', background: e.ok ? 'var(--success-100)' : '#FEE2E2', color: e.ok ? '#1a6b47' : '#B42318' }}>
          <Icon name={e.ok ? 'check' : 'alertTriangle'} size={10} />
        </span>
        {e.texto}
      </div>
    ))}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', marginTop: 14, marginBottom: 7 }}>{children}</div>
);

// Prompt para que la IA PROFUNDICE en una explicación ya calculada. Le pasamos
// las cifras reales y le pedimos ampliar, sin inventar nuevos números.
function buildDeepenSystem(insight, teacherName) {
  return [
    `Eres el Motor de Explicaciones del Copiloto Pedagógico de Proyecta, para ${teacherName || 'el profesor'}. Responde en español, tono profesional y cercano.`,
    `El motor de analítica ya detectó este hallazgo (las cifras son reales, NO las cambies ni inventes otras):`,
    `Hallazgo: ${insight.hallazgo}`,
    `Patrones: ${insight.patrones.join(' | ')}`,
    `Evidencia: ${insight.evidencia.map((e) => e.texto).join(' | ')}`,
    `Nivel de confianza calculado: ${insight.confianza.pct}% (${insight.confianza.label}).`,
    `Tu tarea: en máximo 90 palabras, profundiza en la hipótesis y da un siguiente paso concreto y accionable para el profesor. Evita lo obvio: aporta un ángulo, causa alternativa o técnica pedagógica específica que el profesor probablemente no había considerado, no una repetición genérica de la recomendación. Puedes usar **negrita** para resaltar lo clave y listas ("-" o "1.") si ayudan a organizar pasos. Sin encabezados ni tablas. Preséntalo como una hipótesis ("esto sugiere…", "podría deberse a…"), nunca como un hecho absoluto. No inventes porcentajes nuevos.`,
  ].join('\n');
}

// Chip compacto de confianza (para los mosaicos).
const confColor = (pct) => (pct >= 85 ? 'var(--success-500)' : pct >= 70 ? 'var(--indigo-500)' : pct >= 55 ? 'var(--warning-500)' : 'var(--danger-500)');

// Mosaico compacto: poco texto. Al tocarlo se abre el detalle completo.
export const InsightTile = ({ insight, onClick }) => {
  const t = TONE_META[insight.tono] || TONE_META.neutral;
  const mod = MODULO_META[insight.modulo] || MODULO_META.explicacion;
  const c = insight.confianza;
  return (
    <button onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${t.icon}`, borderRadius: 14, padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 116 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: t.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={mod.icon} size={14} color={t.icon} /></div>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.fg, opacity: 0.9 }}>{mod.label}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--fg-1)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{insight.titulo}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        {c && <span style={{ fontSize: 11, fontWeight: 800, color: confColor(c.pct), background: 'var(--paper-100)', borderRadius: 999, padding: '2px 8px' }}>{c.pct}% confianza</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700, color: 'var(--indigo-600)' }}>Ver<Icon name="chevron" size={12} color="var(--indigo-600)" /></span>
      </div>
    </button>
  );
};

// Modal con el detalle completo de un insight (hipótesis, evidencia, plan…).
export const InsightDetailModal = ({ insight, onClose }) => {
  const { user } = useAuth();
  const t = TONE_META[insight.tono] || TONE_META.neutral;
  const mod = MODULO_META[insight.modulo] || MODULO_META.explicacion;
  const [deep, setDeep] = useState(null);
  const [loading, setLoading] = useState(false);

  const profundizar = async () => {
    if (loading) return;
    setLoading(true); setDeep(null);
    try {
      const { reply } = await post('/ai/assistant', {
        system: buildDeepenSystem(insight, user?.name),
        messages: [{ role: 'user', content: 'Profundiza en esta explicación y dame el siguiente paso concreto.' }],
      });
      setDeep(reply || 'No obtuve respuesta.');
    } catch (e) {
      setDeep(e.message || 'No pude conectarme con la IA en este momento.');
    } finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 78, background: 'rgba(15,20,32,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', background: 'var(--paper-50)', borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '16px 16px 14px', background: t.bg, position: 'sticky', top: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={mod.icon} size={17} color={t.icon} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.fg, opacity: 0.85 }}>{mod.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg-1)', marginTop: 1 }}>{insight.titulo}</div>
          </div>
          <IconButton name="x" ariaLabel="Cerrar" onClick={onClose} />
        </div>

        <div style={{ padding: '14px 18px 24px' }}>
          <div style={{ fontSize: 13.5, color: 'var(--fg-1)', lineHeight: 1.5 }}>{insight.narrativa}</div>
          <ConfidenceBar confianza={insight.confianza} />

          {insight.patrones?.length > 0 && (
            <>
              <Label>Patrones detectados</Label>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                {insight.patrones.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </>
          )}

          <Label>Evidencia utilizada</Label>
          <EvidenceList evidencia={insight.evidencia} />

          <Label>Acciones recomendadas</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {insight.acciones.map((ac, i) => {
              const pm = PRIO_META[ac.prioridad] || PRIO_META.Baja;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pm.bg, color: pm.fg, flexShrink: 0, whiteSpace: 'nowrap' }}>{ac.prioridad}</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45 }}>{ac.texto}</span>
                </div>
              );
            })}
          </div>

          {insight.plan && (<><Label>Plan sugerido</Label><PlanChain plan={insight.plan} /></>)}

          {deep && (
            <div style={{ marginTop: 14, background: 'var(--indigo-50)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--indigo-700)', marginBottom: 5 }}>Copiloto · análisis ampliado</div>
              <MarkdownLite text={deep} />
            </div>
          )}

          <button onClick={profundizar} disabled={loading} style={{ ...adminBtnGhost, marginTop: 16, width: '100%', justifyContent: 'center' }}>
            <Icon name="sparkles" size={14} />{loading ? 'Analizando…' : 'Profundizar con el Copiloto'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Cuadrícula de mosaicos + modal de detalle. Es lo que usan las pantallas.
export const InsightGrid = ({ insights }) => {
  const [sel, setSel] = useState(null);
  if (!insights.length) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {insights.map((ins) => <InsightTile key={ins.id} insight={ins} onClick={() => setSel(ins)} />)}
      </div>
      {sel && <InsightDetailModal insight={sel} onClose={() => setSel(null)} />}
    </>
  );
};

// ── Simulador de Impacto ─────────────────────────────────────────────────────
// Presets calculados a partir de la clase con más dificultad. Cada respuesta se
// estima DENTRO de los rangos que el motor entrega; se muestra como estimación.
function buildSimulateSystem(agg, teacherName) {
  const lines = [];
  lines.push(`Eres el Simulador de Impacto del Copiloto Pedagógico de Proyecta, para ${teacherName || 'el profesor'}. Responde en español, máximo ~90 palabras. Puedes usar **negrita** para lo clave y listas ("-" o "1.") si ayudan a organizar. Sin encabezados ni tablas.`);
  lines.push('Datos reales de las clases del profesor (NO inventes cifras nuevas):');
  agg.analyses.forEach((a) => {
    lines.push(`\nClase "${a.cls.name}" — promedio ${gbFmtSafe(a.promedio)}/5, aprobados ${a.pctAprobados ?? '—'}%, en riesgo ${a.pctRiesgo}%, asistencia ${Math.round((a.attendanceAvg || 0) * 100)}%. Temas: ${a.categorias.map((c) => `${c.name} ${c.avgPct ?? '—'}%`).join(', ')}.`);
    const b = buildImpactBounds(a);
    if (b) lines.push(`Rango de impacto estimado si se refuerza "${b.catName}" (actual ${b.actual}%): entre +${b.lo} y +${b.hi} puntos porcentuales, confianza ${b.confianza.pct}%.`);
  });
  lines.push('\nReglas: (1) Toda estimación es una HIPÓTESIS, no una promesa — dilo. (2) Si el escenario es "reforzar un tema" y hay un rango arriba para ese tema, usa EXACTAMENTE ese rango y esa confianza. (3) Para otros escenarios sin rango dado, responde de forma direccional (sube/baja/estable) apoyándote en los datos, con un nivel de confianza cualitativo (alta/media/baja), sin inventar porcentajes exactos. (4) Cierra con una recomendación breve.');
  return lines.join('\n');
}

function gbFmtSafe(n) { return n == null ? '—' : n.toFixed(1); }

export const ImpactSimulatorPanel = ({ agg, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Soy el Simulador de Impacto. Dime una decisión que estés pensando y estimo su efecto probable en tus clases, antes de aplicarla. Toda estimación es una hipótesis basada en tus datos.' },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Presets a partir de la clase con más dificultad.
  const claseApoyo = agg.claseApoyo || agg.mejorClase || agg.analyses[0];
  const peorCat = claseApoyo ? [...claseApoyo.categorias].filter((c) => c.avgPct != null).sort((x, y) => x.avgPct - y.avgPct)[0] : null;
  const SUGERENCIAS = [
    peorCat ? `¿Qué pasaría si hago un taller de refuerzo de ${peorCat.name} en ${claseApoyo.cls.name}?` : '¿Qué pasaría si hago un taller de refuerzo?',
    '¿Qué pasa si dejo menos tareas esta semana?',
    '¿Qué pasa si hago un examen la próxima semana?',
  ];

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? draft).trim();
    if (!q || loading) return;
    const history = messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setDraft(''); setLoading(true);
    try {
      const { reply } = await post('/ai/assistant', { system: buildSimulateSystem(agg, user?.name), messages: [...history, { role: 'user', content: q }] });
      setMessages((m) => [...m, { role: 'assistant', text: reply || 'No obtuve respuesta. Intenta de nuevo.' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: e.message || 'No pude conectarme en este momento.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(15,20,32,0.55)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, height: '100%', background: 'var(--paper-50)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(15,20,32,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--indigo-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="target" size={19} color="var(--indigo-600)" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Simulador de Impacto</div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Estima el efecto de una decisión antes de aplicarla</div>
          </div>
          <IconButton name="x" ariaLabel="Cerrar" onClick={onClose} />
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
              <div style={{ background: m.role === 'user' ? 'var(--indigo-500)' : 'var(--white)', color: m.role === 'user' ? '#fff' : 'var(--fg-1)', border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)', borderRadius: 16, padding: '10px 14px', fontSize: 13.5, lineHeight: 1.5 }}>
                {m.role === 'user' ? m.text : <MarkdownLite text={m.text} />}
              </div>
            </div>
          ))}
          {loading && <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: 'var(--fg-3)', padding: '4px 6px' }}>Estimando impacto…</div>}
          {messages.length === 1 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {SUGERENCIAS.map((q) => (
                <button key={q} onClick={() => send(q)} style={{ textAlign: 'left', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--indigo-600)', cursor: 'pointer' }}>{q}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--white)' }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="¿Qué pasaría si…?" style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--ink-200)', padding: '0 14px', fontSize: 13.5, fontFamily: 'var(--font-sans)' }} />
          <button onClick={() => send()} disabled={loading || !draft.trim()} style={{ width: 42, height: 42, borderRadius: 12, border: 0, background: draft.trim() ? 'var(--indigo-500)' : 'var(--ink-200)', color: '#fff', display: 'grid', placeItems: 'center', cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
            <Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
