// Centro de Inteligencia Académica — toda la analítica se calcula localmente
// a partir de datos que YA existen (calificaciones, asistencia, tareas) que
// llegan de GET /teacher/intelligence. No se inventan cifras.
import { GB_MAX, GB_PASS, gbFmtIn, gbScaleOf, gbFinalFromCats, buildDefaultGradebook } from './gradebook.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaDe = (iso) => { const d = new Date(iso + 'T00:00:00'); return DIAS[d.getDay()] || ''; };

export function riAvg(nums) {
  const xs = nums.filter((x) => x != null && Number.isFinite(x));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function riGradebook(cls) {
  const roster = (cls.students || []).map((s) => s.name);
  return cls.gradebook || buildDefaultGradebook(roster);
}

function riStudentCatAvg(gb, rowId, cat, scale = gbScaleOf(gb)) {
  const xs = cat.cols.map((c) => {
    const v = parseFloat(gb.grades[`${rowId}::${c.id}`]);
    return Number.isFinite(v) ? Math.min(scale.max, Math.max(0, v)) : null;
  });
  return riAvg(xs);
}

// Promedio final del estudiante: ponderado si la clase definió pesos por
// categoría (ej. Parciales 40% / Talleres 30%), o simple si no.
function riStudentFinalAvg(gb, rowId, cats, scale = gbScaleOf(gb)) {
  return gbFinalFromCats(gb, cats.map((cat) => riStudentCatAvg(gb, rowId, cat, scale)));
}

// Asistencia por estudiante a partir del historial real + registro de hoy.
// Si no hay registros, no se penaliza (rate neutro) en vez de inventar datos.
function riAttendanceByStudent(cls) {
  const roster = (cls.students || []).map((s) => s.name);
  const historial = cls.attendanceHistorial || [];
  const hoy = cls.asistencia || {};
  const out = {};
  roster.forEach((name) => {
    const regs = historial.map((h) => h.registros?.[name]).filter(Boolean);
    if (hoy[name]) regs.push(hoy[name]);
    const total = regs.length;
    if (!total) { out[name] = { rate: 1, ausentes: 0, tarde: 0, total: 0, sinDatos: true }; return; }
    const presentes = regs.filter((r) => r === 'Presente').length;
    const tarde = regs.filter((r) => r === 'Tarde').length;
    const ausentes = regs.filter((r) => r === 'Ausente').length;
    out[name] = { rate: (presentes + tarde * 0.5) / total, ausentes, tarde, total };
  });
  return out;
}

function riTasksByStudent(cls) {
  const roster = (cls.students || []).map((s) => s.name);
  const out = {};
  roster.forEach((name) => { out[name] = { total: 0, entregadas: 0, pendientes: 0, tardias: 0 }; });
  (cls.tasks || []).forEach((t) => {
    roster.forEach((name) => {
      out[name].total++;
      const sub = (t.submissions || []).find((s) => s.student === name);
      if (sub && (sub.status === 'done' || sub.status === 'late')) {
        out[name].entregadas++;
        if (sub.status === 'late') out[name].tardias++;
      } else {
        out[name].pendientes++;
      }
    });
  });
  return out;
}

// Probabilidad de aprobar (0-100): promedio + asistencia + entregas.
function riRiskForStudent({ avg, attendanceRate, taskRate, scale = { max: GB_MAX, pass: GB_PASS } }) {
  const promedioNorm = avg != null ? Math.min(1, avg / scale.max) : 0.6;
  let prob = Math.round(100 * (0.55 * promedioNorm + 0.25 * attendanceRate + 0.20 * taskRate));
  if (avg != null && avg < scale.pass) prob = Math.min(prob, 58);
  prob = Math.max(2, Math.min(98, prob));
  const level = prob >= 80 ? 'bajo' : prob >= 60 ? 'medio' : 'alto';
  return { prob, level };
}

export const RISK_META = {
  bajo: { label: 'Riesgo bajo', color: '#1a6b47', bg: 'var(--success-100)' },
  medio: { label: 'Atención', color: '#92600A', bg: '#FEF3C7' },
  alto: { label: 'Riesgo alto', color: '#B42318', bg: '#FEE2E2' },
};

export function analyzeClassStudents(cls) {
  const gb = riGradebook(cls);
  const scale = gbScaleOf(gb);
  const attendance = riAttendanceByStudent(cls);
  const tasks = riTasksByStudent(cls);
  return gb.rows.map((row) => {
    const catAvgs = gb.cats.map((cat) => ({ id: cat.id, name: cat.name, peso: Number(cat.peso) || 0, avg: riStudentCatAvg(gb, row.id, cat, scale) }));
    const avg = riStudentFinalAvg(gb, row.id, gb.cats, scale);
    const att = attendance[row.name] || { rate: 1, ausentes: 0, tarde: 0, total: 0 };
    const tk = tasks[row.name] || { total: 0, entregadas: 0, pendientes: 0, tardias: 0 };
    const taskRate = tk.total ? tk.entregadas / tk.total : 1;
    const risk = riRiskForStudent({ avg, attendanceRate: att.rate, taskRate, scale });
    const withAvg = catAvgs.filter((c) => c.avg != null);
    const fortaleza = withAvg.length ? withAvg.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
    const areaMejora = withAvg.length ? withAvg.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
    const motivos = [];
    if (avg != null && avg < scale.pass) motivos.push('Promedio por debajo de la nota mínima');
    if (areaMejora && withAvg.length > 1 && areaMejora.avg < scale.pass) motivos.push(`Bajo rendimiento en ${areaMejora.name}`);
    if (att.ausentes >= 2) motivos.push(`${att.ausentes} ausencias recientes`);
    if (tk.pendientes > 0) motivos.push(`${tk.pendientes} tarea${tk.pendientes > 1 ? 's' : ''} sin entregar`);
    return { id: row.id, name: row.name, avg, catAvgs, attendance: att, tasks: tk, risk, fortaleza, areaMejora, motivos, scale };
  });
}

export function riCategoryTrend(cls) {
  const gb = riGradebook(cls);
  const deltas = [];
  gb.cats.forEach((cat) => {
    if (cat.cols.length < 2) return;
    const first = cat.cols[0], last = cat.cols[cat.cols.length - 1];
    const fv = gb.rows.map((r) => { const v = parseFloat(gb.grades[`${r.id}::${first.id}`]); return Number.isFinite(v) ? v : null; }).filter((x) => x != null);
    const lv = gb.rows.map((r) => { const v = parseFloat(gb.grades[`${r.id}::${last.id}`]); return Number.isFinite(v) ? v : null; }).filter((x) => x != null);
    const a = riAvg(fv), b = riAvg(lv);
    if (a != null && b != null) deltas.push(b - a);
  });
  return deltas.length ? riAvg(deltas) : null;
}

export function analyzeClass(cls) {
  const gb = riGradebook(cls);
  const scale = gbScaleOf(gb);
  const students = analyzeClassStudents(cls);
  const avgs = students.map((s) => s.avg).filter((x) => x != null);
  const promedio = riAvg(avgs);
  const pctAprobados = avgs.length ? Math.round((100 * avgs.filter((a) => a >= scale.pass).length) / avgs.length) : null;
  const enRiesgo = students.filter((s) => s.risk.level === 'alto').length;
  const pctRiesgo = students.length ? Math.round((100 * enRiesgo) / students.length) : 0;
  const attendanceAvg = riAvg(students.map((s) => s.attendance.rate));
  const pendientesTotal = students.reduce((sum, s) => sum + s.tasks.pendientes, 0);
  const categorias = gb.cats.map((cat) => {
    const xs = students.map((s) => (s.catAvgs.find((c) => c.id === cat.id) || {}).avg).filter((x) => x != null);
    const avgPct = xs.length ? Math.round((100 * riAvg(xs)) / scale.max) : null;
    const status = avgPct == null ? 'Sin datos suficientes' : avgPct >= 85 ? 'Excelente desempeño' : avgPct >= 70 ? 'Desempeño aceptable' : 'Necesita refuerzo';
    return { name: cat.name, peso: Number(cat.peso) || 0, avgPct, status };
  });
  return { cls, students, promedio, pctAprobados, pctRiesgo, attendanceAvg, pendientesTotal, categorias, scale };
}

export function generateClassRecomendaciones(a, cls) {
  const scale = a.scale || gbScaleOf(riGradebook(cls));
  const recs = [];
  const peorCat = [...a.categorias].filter((c) => c.avgPct != null).sort((x, y) => x.avgPct - y.avgPct)[0];
  if (peorCat && peorCat.avgPct < 70) {
    recs.push({ icon: 'target', color: 'var(--coral-700)', bg: 'var(--coral-50)', title: `Refuerza ${peorCat.name}`, body: `El promedio en ${peorCat.name} es ${peorCat.avgPct}%. Considera un taller práctico antes de la próxima evaluación.` });
  }
  const faltas = a.students.filter((s) => s.attendance.ausentes >= 2);
  if (faltas.length) {
    recs.push({ icon: 'alertTriangle', color: '#B42318', bg: '#FEE2E2', title: 'Inasistencias frecuentes', body: `${faltas.map((s) => s.name).join(', ')} ${faltas.length > 1 ? 'han' : 'ha'} faltado 2 o más veces recientemente. Considera contactar a los acudientes.` });
  }
  const trend = riCategoryTrend(cls);
  if (trend != null && Math.abs(trend) >= 0.25) {
    recs.push(trend > 0
      ? { icon: 'trendUp', color: '#1a6b47', bg: 'var(--success-100)', title: 'Mejora sostenida', body: `El desempeño subió ${((trend / scale.max) * 100).toFixed(0)}% entre las primeras y últimas notas. La estrategia reciente está funcionando.` }
      : { icon: 'trendDown', color: '#B42318', bg: '#FEE2E2', title: 'Desempeño en caída', body: `El desempeño bajó ${Math.abs((trend / scale.max) * 100).toFixed(0)}% entre las primeras y últimas notas. Revisa la dificultad de las últimas evaluaciones.` });
  }
  if (a.pendientesTotal > 0) {
    recs.push({ icon: 'clipboard', color: 'var(--indigo-600)', bg: 'var(--indigo-50)', title: 'Tareas por revisar', body: `Hay ${a.pendientesTotal} entrega${a.pendientesTotal > 1 ? 's' : ''} pendiente${a.pendientesTotal > 1 ? 's' : ''} en este grupo.` });
  }
  if (!recs.length) recs.push({ icon: 'sparkles', color: 'var(--indigo-600)', bg: 'var(--indigo-50)', title: 'Todo en orden', body: 'No se detectan alertas relevantes para este grupo por ahora.' });
  return recs.slice(0, 5);
}

export function generateRecomendaciones(agg) {
  const all = [];
  agg.analyses.forEach((a) => {
    generateClassRecomendaciones(a, a.cls).forEach((r) => {
      if (r.title === 'Todo en orden') return;
      all.push({ ...r, title: `${a.cls.name}: ${r.title}` });
    });
  });
  if (!all.length) all.push({ icon: 'sparkles', color: 'var(--indigo-600)', bg: 'var(--indigo-50)', title: 'Todo en orden', body: 'No se detectan alertas relevantes en tus clases por ahora.' });
  return all.slice(0, 6);
}

export function generateTendencias(agg) {
  const t = [];
  if (agg.peorDia && agg.mejorDia && agg.peorDia.dia !== agg.mejorDia.dia && agg.mejorDia.rate - agg.peorDia.rate >= 0.05) {
    t.push(`Los ${agg.peorDia.dia}s la asistencia baja a ${Math.round(agg.peorDia.rate * 100)}%, la más baja de la semana.`);
  }
  if (agg.catAvgs.length >= 2) {
    const mejor = agg.catAvgs[0], peor = agg.catAvgs[agg.catAvgs.length - 1];
    if (mejor.avg - peor.avg >= 8) t.push(`${mejor.name} obtiene mejores resultados (${Math.round(mejor.avg)}%) que ${peor.name} (${Math.round(peor.avg)}%) en promedio.`);
  }
  if (agg.claseApoyo && agg.mejorClase && agg.claseApoyo.cls.id !== agg.mejorClase.cls.id) {
    t.push(`${agg.claseApoyo.cls.name} presenta más dificultad que el resto de tus grupos en este periodo.`);
  }
  if (!t.length) t.push('Aún no hay suficientes datos para detectar patrones — sigue registrando notas y asistencia.');
  return t;
}

// Agregado de todas las clases del profesor (la lista ya viene filtrada por el backend).
export function analyzeTeacherClasses(classes) {
  const misClases = classes || [];
  const analyses = misClases.map(analyzeClass);
  const promedioGeneral = riAvg(analyses.map((a) => a.promedio));
  const allStudents = analyses.flatMap((a) => a.students.map((s) => ({ ...s, className: a.cls.name, classId: a.cls.id })));
  const conAvg = allStudents.filter((s) => s.avg != null);
  const pctAprobadosGeneral = conAvg.length ? Math.round((100 * conAvg.filter((s) => s.avg >= (s.scale?.pass ?? GB_PASS)).length) / conAvg.length) : null;
  const pctRiesgoGeneral = allStudents.length ? Math.round((100 * allStudents.filter((s) => s.risk.level === 'alto').length) / allStudents.length) : 0;
  const asistenciaGeneral = riAvg(analyses.map((a) => a.attendanceAvg));
  const pendientesTotal = analyses.reduce((sum, a) => sum + a.pendientesTotal, 0);
  const conPromedio = analyses.filter((a) => a.promedio != null);
  const mejorClase = conPromedio.length ? conPromedio.reduce((a, b) => (b.promedio > a.promedio ? b : a)) : null;
  const claseApoyo = conPromedio.length > 1 ? conPromedio.reduce((a, b) => (b.promedio < a.promedio ? b : a)) : null;
  const conAsistencia = analyses.filter((a) => a.attendanceAvg != null);
  const mejorAsistencia = conAsistencia.length ? conAsistencia.reduce((a, b) => (b.attendanceAvg > a.attendanceAvg ? b : a)) : null;
  // Asistencia por día de la semana, derivada de las fechas reales del historial.
  const porDia = {};
  misClases.forEach((cls) => {
    const roster = (cls.students || []).map((s) => s.name);
    (cls.attendanceHistorial || []).forEach((h) => {
      const dia = diaDe(h.date);
      porDia[dia] = porDia[dia] || { presentes: 0, total: 0 };
      roster.forEach((name) => {
        const est = h.registros?.[name];
        if (!est) return;
        porDia[dia].total++;
        if (est !== 'Ausente') porDia[dia].presentes++;
      });
    });
  });
  const diasRates = Object.entries(porDia).filter(([, v]) => v.total).map(([dia, v]) => ({ dia, rate: v.presentes / v.total }));
  const peorDia = diasRates.length ? diasRates.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const mejorDia = diasRates.length ? diasRates.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const catTotals = {};
  analyses.forEach((a) => a.categorias.forEach((c) => { if (c.avgPct == null) return; catTotals[c.name] = catTotals[c.name] || []; catTotals[c.name].push(c.avgPct); }));
  const catAvgs = Object.entries(catTotals).map(([name, xs]) => ({ name, avg: riAvg(xs) })).sort((a, b) => b.avg - a.avg);
  return { misClases, analyses, promedioGeneral, pctAprobadosGeneral, pctRiesgoGeneral, asistenciaGeneral, pendientesTotal, mejorClase, claseApoyo, mejorAsistencia, allStudents, peorDia, mejorDia, catAvgs };
}

// ═══════════════════════════════════════════════════════════════════════════
// COPILOTO PEDAGÓGICO — Motor de Explicaciones
// El motor detecta patrones y CALCULA las cifras reales (nivel de confianza,
// magnitud, consistencia). La IA solo narra/profundiza; nunca inventa números.
// ═══════════════════════════════════════════════════════════════════════════

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Nivel de confianza REAL: combina cuánta evidencia hay (volumen), qué tan
// grande es la señal (magnitud) y qué tan consistente es entre estudiantes.
export function mkConfidence({ volumen = 0.5, magnitud = 0.5, consistencia = 0.5 } = {}) {
  const raw = 100 * (0.4 * clamp01(volumen) + 0.35 * clamp01(magnitud) + 0.25 * clamp01(consistencia));
  const pct = Math.max(35, Math.min(96, Math.round(raw)));
  const label = pct >= 85 ? 'Muy alta' : pct >= 70 ? 'Alta' : pct >= 55 ? 'Media' : 'Baja';
  return { pct, label, bars: Math.max(3, Math.round(pct / 10)) };
}

// Clasificación de categorías del libro de notas por tipo, a partir del nombre.
const PUNTUAL_RE = /quiz|examen|parcial|prueba|evaluaci|test/i;
const CONTINUO_RE = /tarea|taller|proyecto|ejercicio|laborator|trabajo|informe|expos/i;

// Asistencia promedio sobre un conjunto de días del historial.
function attendanceRateOverDays(cls, days) {
  const roster = (cls.students || []).map((s) => s.name);
  let present = 0, total = 0;
  days.forEach((h) => roster.forEach((name) => {
    const e = h.registros?.[name];
    if (!e) return; total++; if (e !== 'Ausente') present++;
  }));
  return total ? present / total : null;
}

// Tendencia de asistencia: compara la primera mitad del periodo con la segunda.
function attendanceTrend(cls) {
  const hist = [...(cls.attendanceHistorial || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (hist.length < 4) return null;
  const mid = Math.floor(hist.length / 2);
  const early = attendanceRateOverDays(cls, hist.slice(0, mid));
  const late = attendanceRateOverDays(cls, hist.slice(mid));
  if (early == null || late == null) return null;
  return { early, late, delta: late - early };
}

// Cuántos estudiantes bajaron entre su primera y su última nota (consistencia).
function declineStats(cls) {
  const gb = riGradebook(cls);
  const cols = gb.cats.flatMap((c) => c.cols);
  let declined = 0, counted = 0;
  gb.rows.forEach((r) => {
    const vals = cols.map((col) => { const v = parseFloat(gb.grades[`${r.id}::${col.id}`]); return Number.isFinite(v) ? v : null; }).filter((v) => v != null);
    if (vals.length < 2) return;
    counted++;
    if (vals[vals.length - 1] < vals[0]) declined++;
  });
  return { declined, counted, frac: counted ? declined / counted : 0 };
}

// Promedio por tipo de categoría (puntual vs continuo) para un estudiante.
function studentByEvalType(student) {
  const puntual = student.catAvgs.filter((c) => PUNTUAL_RE.test(c.name) && c.avg != null).map((c) => c.avg);
  const continuo = student.catAvgs.filter((c) => CONTINUO_RE.test(c.name) && c.avg != null).map((c) => c.avg);
  return { puntualAvg: riAvg(puntual), continuoAvg: riAvg(continuo), nPuntual: puntual.length, nContinuo: continuo.length };
}

// ── Insights de CLASE ───────────────────────────────────────────────────────
// Devuelve un arreglo de "explicaciones inteligentes" con hallazgo, patrones,
// evidencia, confianza (real) y acciones priorizadas.
export function detectClassInsights(a) {
  const cls = a.cls;
  const out = [];
  const nStudents = a.students.length;
  if (!nStudents) return out;

  const scale = a.scale || { max: GB_MAX, pass: GB_PASS };
  const catsOrden = [...a.categorias].filter((c) => c.avgPct != null).sort((x, y) => x.avgPct - y.avgPct);
  const peorCat = catsOrden[0] || null;
  const attTrend = attendanceTrend(cls);
  const trend = riCategoryTrend(cls); // delta en puntos (0-5) entre primeras y últimas notas

  // 1) Descenso de rendimiento
  if (trend != null && trend <= -0.15) {
    const dec = declineStats(cls);
    const pctBaja = Math.round((Math.abs(trend) / scale.max) * 100);
    const patrones = [];
    if (attTrend && attTrend.delta <= -0.05) patrones.push(`La asistencia bajó de ${Math.round(attTrend.early * 100)}% a ${Math.round(attTrend.late * 100)}% en el mismo periodo`);
    else if (attTrend) patrones.push(`La asistencia se mantuvo estable (${Math.round(attTrend.late * 100)}%)`);
    if (peorCat) patrones.push(`El desempeño más bajo se concentra en ${peorCat.name} (${peorCat.avgPct}%)`);
    if (a.pendientesTotal > 0) patrones.push(`Hay ${a.pendientesTotal} entrega${a.pendientesTotal > 1 ? 's' : ''} sin completar`);
    if (dec.counted) patrones.push(`${dec.declined} de ${dec.counted} estudiantes bajaron su nota entre la primera y la última evaluación`);

    const evidencia = [
      { ok: a.promedio != null, texto: `Promedio actual del grupo: ${gbFmtIn(a.promedio, scale)}/${scale.max}` },
      { ok: true, texto: `Caída de ${pctBaja}% entre las primeras y las últimas notas` },
      { ok: a.attendanceAvg != null, texto: `Asistencia promedio: ${Math.round((a.attendanceAvg || 0) * 100)}%` },
    ];
    if (peorCat) evidencia.push({ ok: false, texto: `Tema más débil: ${peorCat.name} (${peorCat.avgPct}%)` });

    const acciones = [];
    if (peorCat) acciones.push({ prioridad: 'Alta', texto: `Reforzar ${peorCat.name} con una actividad práctica antes de la próxima evaluación` });
    acciones.push({ prioridad: 'Media', texto: 'Aplicar un quiz diagnóstico corto para ubicar el punto exacto de dificultad' });
    if (attTrend && attTrend.delta <= -0.05) acciones.push({ prioridad: 'Baja', texto: 'Contactar a los acudientes de los estudiantes con más ausencias' });

    out.push({
      id: `${cls.id}-descenso`, tono: 'bad', modulo: 'explicacion',
      titulo: 'Posible causa del descenso del rendimiento',
      hallazgo: `El promedio del grupo bajó ${pctBaja}% entre las primeras y las últimas notas registradas.`,
      narrativa: `El rendimiento del grupo viene cayendo (${pctBaja}% entre las primeras y últimas notas).${peorCat ? ` La dificultad no parece general: se concentra en ${peorCat.name} (${peorCat.avgPct}%), muy por debajo del resto.` : ''}${attTrend && attTrend.delta <= -0.05 ? ' En el mismo periodo la asistencia también bajó, lo que puede estar amplificando el efecto.' : ' La asistencia se mantuvo estable, así que el problema apunta al contenido más que al ausentismo.'}`,
      patrones, evidencia,
      confianza: mkConfidence({ volumen: Math.min(1, dec.counted / 8), magnitud: Math.min(1, Math.abs(trend) / 1.0), consistencia: dec.frac }),
      acciones, foco: { catName: peorCat?.name || null },
      plan: {
        actividad: `Una clase de ejercicios cortos de aplicación de ${peorCat ? peorCat.name : 'el tema más débil'}, resueltos en parejas.`,
        evaluacion: 'Quiz diagnóstico breve (5–8 min) al cierre, para ubicar el punto exacto donde se rompe la comprensión.',
        seguimiento: 'Comparar el promedio del grupo en 7 días para confirmar si la estrategia funcionó.',
      },
    });
  }

  // 2) Concentración de dificultad en un tema
  if (peorCat && catsOrden.length >= 2 && peorCat.avgPct < 70) {
    const resto = riAvg(catsOrden.slice(1).map((c) => c.avgPct));
    const gap = resto != null ? Math.round(resto - peorCat.avgPct) : 0;
    if (gap >= 12) {
      // consistencia: fracción de estudiantes cuyo tema más débil es justo este
      let matches = 0, counted = 0;
      a.students.forEach((s) => {
        const withAvg = s.catAvgs.filter((c) => c.avg != null);
        if (withAvg.length < 2) return;
        counted++;
        const worst = withAvg.reduce((x, y) => (y.avg < x.avg ? y : x));
        if (worst.name === peorCat.name) matches++;
      });
      const frac = counted ? matches / counted : 0;
      out.push({
        id: `${cls.id}-tema-${peorCat.name}`, tono: 'warn', modulo: 'explicacion',
        titulo: `Dificultad concentrada en ${peorCat.name}`,
        hallazgo: `El bajo desempeño se concentra en ${peorCat.name} (${peorCat.avgPct}%), ${gap} puntos por debajo del resto de temas.`,
        narrativa: `Mientras el resto de temas promedia ${Math.round(resto)}%, ${peorCat.name} se queda en ${peorCat.avgPct}%. ${matches} de ${counted} estudiantes tienen aquí su nota más baja, así que es una dificultad compartida del grupo, no de unos pocos.`,
        patrones: [
          `${peorCat.name}: ${peorCat.avgPct}% vs. ${Math.round(resto)}% en el resto de temas`,
          `${matches} de ${counted} estudiantes tienen su peor desempeño en ${peorCat.name}`,
        ],
        evidencia: [
          { ok: false, texto: `${peorCat.name}: ${peorCat.avgPct}%` },
          { ok: true, texto: `Resto de temas: ${Math.round(resto)}%` },
          { ok: true, texto: `Brecha: ${gap} puntos porcentuales` },
        ],
        confianza: mkConfidence({ volumen: Math.min(1, counted / 8), magnitud: Math.min(1, gap / 30), consistencia: frac }),
        acciones: [
          { prioridad: 'Alta', texto: `Dedicar una sesión de refuerzo específica a ${peorCat.name}` },
          { prioridad: 'Media', texto: `Reevaluar ${peorCat.name} con un formato distinto para confirmar el avance` },
        ],
        foco: { catName: peorCat.name },
        plan: {
          actividad: `Trabajo colaborativo enfocado únicamente en ${peorCat.name} (grupos de 3, un problema guiado).`,
          evaluacion: `Quiz corto solo de ${peorCat.name}, distinto al formato anterior.`,
          seguimiento: `Volver a medir ${peorCat.name} en 7 días y comparar contra ${peorCat.avgPct}%.`,
        },
      });
    }
  }

  return out.slice(0, 3);
}

// ── Insight de ESTUDIANTE ───────────────────────────────────────────────────
// Caso "presión en evaluaciones puntuales": asiste y entrega bien, pero baja
// justo en quizzes/exámenes frente al trabajo continuo.
export function detectStudentInsight(student) {
  const scale = student.scale || { max: GB_MAX, pass: GB_PASS };
  const { puntualAvg, continuoAvg, nPuntual } = studentByEvalType(student);
  const att = student.attendance?.rate ?? 1;
  const taskRate = student.tasks?.total ? student.tasks.entregadas / student.tasks.total : 1;
  if (puntualAvg != null && continuoAvg != null && nPuntual >= 1 && continuoAvg - puntualAvg >= 0.6 && att >= 0.9 && taskRate >= 0.8) {
    const gap = continuoAvg - puntualAvg;
    return {
      id: `${student.id}-presion`, tono: 'warn', modulo: 'explicacion',
      titulo: `Posible causa del bajo desempeño de ${student.name.split(' ')[0]}`,
      hallazgo: `${student.name.split(' ')[0]} rinde bien en el trabajo continuo (${gbFmtIn(continuoAvg, scale)}) pero baja en evaluaciones puntuales (${gbFmtIn(puntualAvg, scale)}).`,
      narrativa: `${student.name.split(' ')[0]} entrega sus tareas (${Math.round(taskRate * 100)}%) y asiste de forma constante (${Math.round(att * 100)}%). Sin embargo, sus notas caen únicamente en las evaluaciones puntuales. Este patrón sugiere dificultades para gestionar la presión del examen más que una falta de comprensión del contenido.`,
      patrones: [
        `Trabajo continuo: ${gbFmtIn(continuoAvg, scale)} · Evaluaciones puntuales: ${gbFmtIn(puntualAvg, scale)}`,
        `Asistencia ${Math.round(att * 100)}% y entregas ${Math.round(taskRate * 100)}%: descarta desconexión o falta de estudio`,
      ],
      evidencia: [
        { ok: true, texto: `Asistencia: ${Math.round(att * 100)}%` },
        { ok: true, texto: `Tareas entregadas: ${Math.round(taskRate * 100)}%` },
        { ok: true, texto: `Promedio en trabajo continuo: ${gbFmtIn(continuoAvg, scale)}` },
        { ok: false, texto: `Promedio en evaluaciones puntuales: ${gbFmtIn(puntualAvg, scale)}` },
      ],
      confianza: mkConfidence({ volumen: Math.min(1, nPuntual / 3), magnitud: Math.min(1, gap / 2), consistencia: Math.min(1, (att + taskRate) / 2) }),
      acciones: [
        { prioridad: 'Alta', texto: 'Ofrecer condiciones de evaluación de menor presión (más tiempo, o evaluación en dos partes)' },
        { prioridad: 'Media', texto: 'Practicar con simulacros cortos para reducir la ansiedad ante el examen' },
      ],
      foco: {},
      plan: {
        actividad: `Simulacros cortos y cronometrados de baja presión con ${student.name.split(' ')[0]}, subiendo el tiempo de a poco.`,
        evaluacion: 'Una evaluación en dos partes o con tiempo extendido, para separar comprensión de ansiedad.',
        seguimiento: 'Revisar su nota en la próxima evaluación puntual y comparar.',
      },
    };
  }
  return null;
}

// ── Simulador de Impacto: rangos fundamentados en los datos del grupo ────────
// Devuelve una estimación acotada (no una promesa) que la IA usará tal cual.
export function buildImpactBounds(a, catName) {
  const cat = a.categorias.find((c) => c.name === catName) || [...a.categorias].filter((c) => c.avgPct != null).sort((x, y) => x.avgPct - y.avgPct)[0];
  if (!cat || cat.avgPct == null) return null;
  const otras = a.categorias.filter((c) => c.avgPct != null && c.name !== cat.name).map((c) => c.avgPct);
  const referencia = otras.length ? Math.round(riAvg(otras)) : 80;
  const gap = Math.max(0, referencia - cat.avgPct);
  // El refuerzo puede cerrar entre ~25% y ~55% de la brecha con el resto de temas.
  const lo = Math.max(2, Math.round(gap * 0.25));
  const hi = Math.max(lo + 2, Math.round(gap * 0.55));
  const confianza = mkConfidence({ volumen: Math.min(1, a.students.length / 8), magnitud: Math.min(1, gap / 30), consistencia: 0.6 });
  return { catName: cat.name, actual: cat.avgPct, referencia, gap, lo, hi, confianza };
}

// ── Regla: "todos fallan lo mismo" → probable problema de la explicación ──────
// Si una columna concreta la falla la mayoría del grupo, el problema rara vez
// es de los estudiantes: apunta al concepto o a la consigna.
export function detectUniformFailure(cls) {
  const gb = riGradebook(cls);
  const scale = gbScaleOf(gb);
  const nStudents = gb.rows.length;
  if (nStudents < 4) return null;
  let worst = null;
  gb.cats.forEach((cat) => cat.cols.forEach((col) => {
    const vals = gb.rows.map((r) => { const v = parseFloat(gb.grades[`${r.id}::${col.id}`]); return Number.isFinite(v) ? v : null; }).filter((v) => v != null);
    if (vals.length < Math.max(4, Math.ceil(nStudents * 0.6))) return;
    const frac = vals.filter((v) => v < scale.pass).length / vals.length;
    const avg = riAvg(vals);
    if (frac >= 0.7 && avg < scale.pass && (!worst || frac > worst.frac)) worst = { cat: cat.name, col: col.label, frac, avg, n: vals.length };
  }));
  if (!worst) return null;
  const pct = Math.round(worst.frac * 100);
  return {
    id: `${cls.id}-uniforme-${worst.col}`, tono: 'warn', modulo: 'explicacion',
    titulo: `Dificultad generalizada en "${worst.col}"`,
    hallazgo: `El ${pct}% del grupo tuvo bajo desempeño en ${worst.col} (${worst.cat}).`,
    narrativa: `Cuando casi todo el grupo falla exactamente lo mismo (${pct}% en ${worst.col}), el problema rara vez es de los estudiantes: suele apuntar a que ese concepto o la consigna de esa evaluación necesita reforzarse o reformularse. Conviene revisar cómo se presentó ${worst.col} antes de avanzar.`,
    patrones: [
      `${pct}% del grupo por debajo de la nota mínima en ${worst.col}`,
      `Promedio de ${worst.col}: ${gbFmtIn(worst.avg, scale)} sobre ${worst.n} estudiantes`,
    ],
    evidencia: [
      { ok: false, texto: `${worst.col}: ${gbFmtIn(worst.avg, scale)} de promedio` },
      { ok: false, texto: `${pct}% del grupo bajo la nota mínima` },
      { ok: true, texto: `Basado en ${worst.n} estudiantes evaluados` },
    ],
    confianza: mkConfidence({ volumen: Math.min(1, worst.n / 8), magnitud: Math.min(1, worst.frac), consistencia: worst.frac }),
    acciones: [
      { prioridad: 'Alta', texto: `Reexplicar ${worst.col} con un ejemplo distinto antes de continuar` },
      { prioridad: 'Media', texto: `Reevaluar ${worst.col} con una consigna más clara` },
    ],
    foco: { catName: worst.cat },
    plan: {
      actividad: `Reexplicación de ${worst.col} con un ejemplo nuevo y un ejercicio guiado en el tablero.`,
      evaluacion: `Reevaluar solo ${worst.col}, con la consigna reformulada.`,
      seguimiento: 'Verificar si el porcentaje de dificultad baja tras la reexplicación.',
    },
  };
}

// ── Regla: estudiante que mejora (refuerzo positivo) ─────────────────────────
export function detectImprovement(cls) {
  const gb = riGradebook(cls);
  const scale = gbScaleOf(gb);
  const cols = gb.cats.flatMap((c) => c.cols);
  if (cols.length < 3) return null;
  let best = null;
  gb.rows.forEach((r) => {
    const withV = cols.map((col) => { const v = parseFloat(gb.grades[`${r.id}::${col.id}`]); return Number.isFinite(v) ? v : null; }).filter((v) => v != null);
    if (withV.length < 3) return;
    const half = Math.floor(withV.length / 2);
    const early = riAvg(withV.slice(0, half));
    const late = riAvg(withV.slice(half));
    if (early == null || late == null) return;
    const delta = late - early;
    if (delta >= (scale.max / 8) && late >= scale.pass && (!best || delta > best.delta)) best = { name: r.name, early, late, delta };
  });
  if (!best) return null;
  const pct = Math.round((best.delta / scale.max) * 100);
  const nombre = best.name.split(' ')[0];
  return {
    id: `${cls.id}-mejora-${best.name}`, tono: 'good', modulo: 'refuerzo',
    titulo: `${nombre} está mejorando`,
    hallazgo: `${nombre} subió su desempeño ${pct}% (de ${gbFmtIn(best.early, scale)} a ${gbFmtIn(best.late, scale)}) en las últimas evaluaciones.`,
    narrativa: `El avance de ${nombre} es de los más claros del grupo. Reconocerlo en clase refuerza su motivación, y su forma de resolver puede servir de ejemplo para el resto.`,
    patrones: [`De ${gbFmtIn(best.early, scale)} a ${gbFmtIn(best.late, scale)} entre las primeras y las últimas notas`],
    evidencia: [
      { ok: true, texto: `Nota inicial: ${gbFmtIn(best.early, scale)}` },
      { ok: true, texto: `Nota reciente: ${gbFmtIn(best.late, scale)}` },
      { ok: true, texto: `Mejora: +${pct}%` },
    ],
    confianza: mkConfidence({ volumen: 0.7, magnitud: Math.min(1, best.delta / 2), consistencia: 0.7 }),
    acciones: [{ prioridad: 'Media', texto: `Reconocer el avance de ${nombre} y, si se puede, usar su trabajo como ejemplo` }],
    foco: {},
    plan: {
      actividad: `Invitar a ${nombre} a compartir cómo resolvió un ejercicio reciente.`,
      evaluacion: 'Ninguna adicional — es refuerzo positivo.',
      seguimiento: 'Mantener el acompañamiento para sostener el avance.',
    },
  };
}

// ── Módulo predictivo: cuántos podrían reprobar el próximo examen ────────────
export function predictiveAtRisk(a) {
  const scale = a.scale || { max: GB_MAX, pass: GB_PASS };
  const enRiesgo = a.students.filter((s) => s.risk.level === 'alto');
  if (enRiesgo.length < 1) return null;
  const nombres = enRiesgo.slice(0, 4).map((s) => s.name.split(' ')[0]);
  const plural = enRiesgo.length > 1;
  return {
    id: `${a.cls.id}-prediccion`, tono: 'bad', modulo: 'prediccion',
    titulo: 'Riesgo de reprobación en el próximo examen',
    hallazgo: `Si el ritmo continúa, aproximadamente ${enRiesgo.length} estudiante${plural ? 's' : ''} está${plural ? 'n' : ''} en riesgo de reprobar el próximo examen.`,
    narrativa: `Combinando notas, asistencia y entregas, ${enRiesgo.length} estudiante${plural ? 's' : ''} (${nombres.join(', ')}${enRiesgo.length > nombres.length ? '…' : ''}) tiene${plural ? 'n' : ''} hoy baja probabilidad de aprobar. Una actividad de refuerzo esta semana podría reducir ese riesgo antes de la evaluación.`,
    patrones: enRiesgo.slice(0, 4).map((s) => `${s.name.split(' ')[0]}: ${s.risk.prob}% de probabilidad de aprobar`),
    evidencia: [
      { ok: false, texto: `${enRiesgo.length} estudiante(s) en riesgo alto` },
      { ok: a.promedio != null, texto: `Promedio del grupo: ${gbFmtIn(a.promedio, scale)}` },
      { ok: a.attendanceAvg != null, texto: `Asistencia: ${Math.round((a.attendanceAvg || 0) * 100)}%` },
    ],
    confianza: mkConfidence({ volumen: Math.min(1, a.students.length / 8), magnitud: Math.min(1, enRiesgo.length / Math.max(1, a.students.length)), consistencia: 0.6 }),
    acciones: [
      { prioridad: 'Alta', texto: 'Programar una actividad de refuerzo esta semana, antes del examen' },
      { prioridad: 'Media', texto: 'Dar retroalimentación individual a los estudiantes en riesgo' },
    ],
    foco: {},
    plan: {
      actividad: 'Taller de refuerzo dirigido a los estudiantes en riesgo, en el mismo horario de clase.',
      evaluacion: 'Mini-evaluación de práctica antes del examen real.',
      seguimiento: 'Recalcular el riesgo después del refuerzo para confirmar que baja.',
    },
  };
}

// ── Resumen proactivo: "Hoy detecté N oportunidades de mejora" ───────────────
// Junta los hallazgos más accionables de TODAS las clases del profesor.
export function detectOpportunities(agg) {
  const ops = [];
  agg.analyses.forEach((a) => {
    const pred = predictiveAtRisk(a);
    if (pred) ops.push({ ...pred, className: a.cls.name });
    detectClassInsights(a).slice(0, 1).forEach((i) => ops.push({ ...i, className: a.cls.name }));
    const uf = detectUniformFailure(a.cls);
    if (uf) ops.push({ ...uf, className: a.cls.name });
    const mej = detectImprovement(a.cls);
    if (mej) ops.push({ ...mej, className: a.cls.name });
  });
  const rank = { bad: 0, warn: 1, neutral: 2, good: 3 };
  ops.sort((x, y) => (rank[x.tono] ?? 2) - (rank[y.tono] ?? 2));
  // dedup por id
  const seen = new Set();
  return ops.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true))).slice(0, 5);
}

// Todos los insights detallados de una clase (para las tarjetas del Copiloto).
export function allClassInsights(a) {
  const list = [...detectClassInsights(a)];
  const uf = detectUniformFailure(a.cls);
  if (uf) list.push(uf);
  const pred = predictiveAtRisk(a);
  if (pred) list.push(pred);
  const mej = detectImprovement(a.cls);
  if (mej) list.push(mej);
  for (const s of [...a.students].sort((x, y) => x.risk.prob - y.risk.prob)) {
    const si = detectStudentInsight(s);
    if (si) { list.push(si); break; }
  }
  return list;
}
