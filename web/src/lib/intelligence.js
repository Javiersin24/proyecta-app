// Centro de Inteligencia Académica — toda la analítica se calcula localmente
// a partir de datos que YA existen (calificaciones, asistencia, tareas) que
// llegan de GET /teacher/intelligence. No se inventan cifras.
import { GB_MAX, GB_PASS, gbFmt, buildDefaultGradebook } from './gradebook.js';

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

function riStudentCatAvg(gb, rowId, cat) {
  const xs = cat.cols.map((c) => {
    const v = parseFloat(gb.grades[`${rowId}::${c.id}`]);
    return Number.isFinite(v) ? Math.min(GB_MAX, Math.max(0, v)) : null;
  });
  return riAvg(xs);
}

function riStudentFinalAvg(gb, rowId, cats) {
  return riAvg(cats.map((cat) => riStudentCatAvg(gb, rowId, cat)));
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
function riRiskForStudent({ avg, attendanceRate, taskRate }) {
  const promedioNorm = avg != null ? Math.min(1, avg / GB_MAX) : 0.6;
  let prob = Math.round(100 * (0.55 * promedioNorm + 0.25 * attendanceRate + 0.20 * taskRate));
  if (avg != null && avg < GB_PASS) prob = Math.min(prob, 58);
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
  const attendance = riAttendanceByStudent(cls);
  const tasks = riTasksByStudent(cls);
  return gb.rows.map((row) => {
    const catAvgs = gb.cats.map((cat) => ({ id: cat.id, name: cat.name, avg: riStudentCatAvg(gb, row.id, cat) }));
    const avg = riStudentFinalAvg(gb, row.id, gb.cats);
    const att = attendance[row.name] || { rate: 1, ausentes: 0, tarde: 0, total: 0 };
    const tk = tasks[row.name] || { total: 0, entregadas: 0, pendientes: 0, tardias: 0 };
    const taskRate = tk.total ? tk.entregadas / tk.total : 1;
    const risk = riRiskForStudent({ avg, attendanceRate: att.rate, taskRate });
    const withAvg = catAvgs.filter((c) => c.avg != null);
    const fortaleza = withAvg.length ? withAvg.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
    const areaMejora = withAvg.length ? withAvg.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
    const motivos = [];
    if (avg != null && avg < GB_PASS) motivos.push('Promedio por debajo de la nota mínima');
    if (areaMejora && withAvg.length > 1 && areaMejora.avg < GB_PASS) motivos.push(`Bajo rendimiento en ${areaMejora.name}`);
    if (att.ausentes >= 2) motivos.push(`${att.ausentes} ausencias recientes`);
    if (tk.pendientes > 0) motivos.push(`${tk.pendientes} tarea${tk.pendientes > 1 ? 's' : ''} sin entregar`);
    return { id: row.id, name: row.name, avg, catAvgs, attendance: att, tasks: tk, risk, fortaleza, areaMejora, motivos };
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
  const students = analyzeClassStudents(cls);
  const avgs = students.map((s) => s.avg).filter((x) => x != null);
  const promedio = riAvg(avgs);
  const pctAprobados = avgs.length ? Math.round((100 * avgs.filter((a) => a >= GB_PASS).length) / avgs.length) : null;
  const enRiesgo = students.filter((s) => s.risk.level === 'alto').length;
  const pctRiesgo = students.length ? Math.round((100 * enRiesgo) / students.length) : 0;
  const attendanceAvg = riAvg(students.map((s) => s.attendance.rate));
  const pendientesTotal = students.reduce((sum, s) => sum + s.tasks.pendientes, 0);
  const gb = riGradebook(cls);
  const categorias = gb.cats.map((cat) => {
    const xs = students.map((s) => (s.catAvgs.find((c) => c.id === cat.id) || {}).avg).filter((x) => x != null);
    const avgPct = xs.length ? Math.round((100 * riAvg(xs)) / GB_MAX) : null;
    const status = avgPct == null ? 'Sin datos suficientes' : avgPct >= 85 ? 'Excelente desempeño' : avgPct >= 70 ? 'Desempeño aceptable' : 'Necesita refuerzo';
    return { name: cat.name, avgPct, status };
  });
  return { cls, students, promedio, pctAprobados, pctRiesgo, attendanceAvg, pendientesTotal, categorias };
}

export function generateClassRecomendaciones(a, cls) {
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
      ? { icon: 'trendUp', color: '#1a6b47', bg: 'var(--success-100)', title: 'Mejora sostenida', body: `El desempeño subió ${((trend / GB_MAX) * 100).toFixed(0)}% entre las primeras y últimas notas. La estrategia reciente está funcionando.` }
      : { icon: 'trendDown', color: '#B42318', bg: '#FEE2E2', title: 'Desempeño en caída', body: `El desempeño bajó ${Math.abs((trend / GB_MAX) * 100).toFixed(0)}% entre las primeras y últimas notas. Revisa la dificultad de las últimas evaluaciones.` });
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
  const pctAprobadosGeneral = conAvg.length ? Math.round((100 * conAvg.filter((s) => s.avg >= GB_PASS).length) / conAvg.length) : null;
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

  const catsOrden = [...a.categorias].filter((c) => c.avgPct != null).sort((x, y) => x.avgPct - y.avgPct);
  const peorCat = catsOrden[0] || null;
  const attTrend = attendanceTrend(cls);
  const trend = riCategoryTrend(cls); // delta en puntos (0-5) entre primeras y últimas notas

  // 1) Descenso de rendimiento
  if (trend != null && trend <= -0.15) {
    const dec = declineStats(cls);
    const pctBaja = Math.round((Math.abs(trend) / GB_MAX) * 100);
    const patrones = [];
    if (attTrend && attTrend.delta <= -0.05) patrones.push(`La asistencia bajó de ${Math.round(attTrend.early * 100)}% a ${Math.round(attTrend.late * 100)}% en el mismo periodo`);
    else if (attTrend) patrones.push(`La asistencia se mantuvo estable (${Math.round(attTrend.late * 100)}%)`);
    if (peorCat) patrones.push(`El desempeño más bajo se concentra en ${peorCat.name} (${peorCat.avgPct}%)`);
    if (a.pendientesTotal > 0) patrones.push(`Hay ${a.pendientesTotal} entrega${a.pendientesTotal > 1 ? 's' : ''} sin completar`);
    if (dec.counted) patrones.push(`${dec.declined} de ${dec.counted} estudiantes bajaron su nota entre la primera y la última evaluación`);

    const evidencia = [
      { ok: a.promedio != null, texto: `Promedio actual del grupo: ${gbFmt(a.promedio)}/5` },
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
      });
    }
  }

  return out.slice(0, 3);
}

// ── Insight de ESTUDIANTE ───────────────────────────────────────────────────
// Caso "presión en evaluaciones puntuales": asiste y entrega bien, pero baja
// justo en quizzes/exámenes frente al trabajo continuo.
export function detectStudentInsight(student) {
  const { puntualAvg, continuoAvg, nPuntual } = studentByEvalType(student);
  const att = student.attendance?.rate ?? 1;
  const taskRate = student.tasks?.total ? student.tasks.entregadas / student.tasks.total : 1;
  if (puntualAvg != null && continuoAvg != null && nPuntual >= 1 && continuoAvg - puntualAvg >= 0.6 && att >= 0.9 && taskRate >= 0.8) {
    const gap = continuoAvg - puntualAvg;
    return {
      id: `${student.id}-presion`, tono: 'warn', modulo: 'explicacion',
      titulo: `Posible causa del bajo desempeño de ${student.name.split(' ')[0]}`,
      hallazgo: `${student.name.split(' ')[0]} rinde bien en el trabajo continuo (${gbFmt(continuoAvg)}) pero baja en evaluaciones puntuales (${gbFmt(puntualAvg)}).`,
      narrativa: `${student.name.split(' ')[0]} entrega sus tareas (${Math.round(taskRate * 100)}%) y asiste de forma constante (${Math.round(att * 100)}%). Sin embargo, sus notas caen únicamente en las evaluaciones puntuales. Este patrón sugiere dificultades para gestionar la presión del examen más que una falta de comprensión del contenido.`,
      patrones: [
        `Trabajo continuo: ${gbFmt(continuoAvg)} · Evaluaciones puntuales: ${gbFmt(puntualAvg)}`,
        `Asistencia ${Math.round(att * 100)}% y entregas ${Math.round(taskRate * 100)}%: descarta desconexión o falta de estudio`,
      ],
      evidencia: [
        { ok: true, texto: `Asistencia: ${Math.round(att * 100)}%` },
        { ok: true, texto: `Tareas entregadas: ${Math.round(taskRate * 100)}%` },
        { ok: true, texto: `Promedio en trabajo continuo: ${gbFmt(continuoAvg)}` },
        { ok: false, texto: `Promedio en evaluaciones puntuales: ${gbFmt(puntualAvg)}` },
      ],
      confianza: mkConfidence({ volumen: Math.min(1, nPuntual / 3), magnitud: Math.min(1, gap / 2), consistencia: Math.min(1, (att + taskRate) / 2) }),
      acciones: [
        { prioridad: 'Alta', texto: 'Ofrecer condiciones de evaluación de menor presión (más tiempo, o evaluación en dos partes)' },
        { prioridad: 'Media', texto: 'Practicar con simulacros cortos para reducir la ansiedad ante el examen' },
      ],
      foco: {},
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
