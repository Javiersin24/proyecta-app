// Centro de Inteligencia Académica — toda la analítica se calcula localmente
// a partir de datos que YA existen (calificaciones, asistencia, tareas) que
// llegan de GET /teacher/intelligence. No se inventan cifras.
import { GB_MAX, GB_PASS, buildDefaultGradebook } from './gradebook.js';

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
