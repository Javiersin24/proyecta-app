// Helpers compartidos del libro de notas (usados por Calificaciones, la
// pantalla de calificar y la Inteligencia Académica).
//
// Cada CLASE define su propia escala y el peso (%) de cada categoría dentro
// del libro de notas, porque no todos los colegios/universidades califican
// igual: unos usan 0–5.0 y otros 0–100, y unos ponderan "Parciales 40% /
// Talleres 30% / Tareas 30%" mientras otros promedian todo por igual.

// Escala por defecto (la de siempre) cuando una clase aún no configuró la suya.
export const DEFAULT_SCALE = { max: 5, pass: 3 };
export const GB_MAX = DEFAULT_SCALE.max;
export const GB_PASS = DEFAULT_SCALE.pass;

// Escalas que el profesor puede elegir.
export const SCALE_PRESETS = [
  { id: '5', label: '0 – 5.0', max: 5, pass: 3 },
  { id: '100', label: '0 – 100', max: 100, pass: 60 },
];

// Escala efectiva de un libro de notas (o de una clase ya serializada).
export function gbScaleOf(gb) {
  const s = gb?.scale;
  const max = Number(s?.max);
  if (!Number.isFinite(max) || max <= 0) return DEFAULT_SCALE;
  const pass = Number(s?.pass);
  return { max, pass: Number.isFinite(pass) ? pass : max * 0.6 };
}

// Formato de una nota dentro de una escala: 0–5 con un decimal, 0–100 entero.
export function gbFmtIn(n, scale = DEFAULT_SCALE) {
  if (n == null || !Number.isFinite(n)) return '—';
  return scale.max > 10 ? String(Math.round(n)) : n.toFixed(1);
}
export const gbFmt = (n) => gbFmtIn(n, DEFAULT_SCALE);

export function gbColorIn(n, scale = DEFAULT_SCALE) {
  if (n == null) return 'var(--fg-3)';
  return n >= scale.pass ? '#1a6b47' : '#B42318';
}
export const gbColor = (n) => gbColorIn(n, DEFAULT_SCALE);

// Paso sugerido para los campos de nota según la escala.
export const gbStep = (scale = DEFAULT_SCALE) => (scale.max > 10 ? 1 : 0.1);

// Convierte un porcentaje (0-100) a la escala de la clase, y al revés.
export const pctToScale = (pct, scale = DEFAULT_SCALE) => (pct == null ? null : (pct / 100) * scale.max);
export const scaleToPct = (v, scale = DEFAULT_SCALE) => (v == null ? null : (v / scale.max) * 100);

// Promedio simple de una lista de números (ignora vacíos).
export function gbAvg(nums) {
  const xs = (nums || []).filter((x) => x != null && Number.isFinite(x));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// ¿La clase usa ponderación por categoría? (algún peso > 0)
export function gbHasWeights(gb) {
  return (gb?.cats || []).some((c) => Number(c.peso) > 0);
}

// Promedio final a partir de los promedios por categoría. Si la clase definió
// pesos, se ponderan (normalizando sobre las categorías CON datos, para que la
// nota siga siendo válida aunque un tema aún no se haya evaluado); si no,
// promedio simple — el comportamiento de siempre.
export function gbFinalFromCats(gb, catAvgs) {
  const pairs = (gb?.cats || []).map((cat, i) => ({ peso: Number(cat.peso) || 0, avg: catAvgs[i] }))
    .filter((p) => p.avg != null && Number.isFinite(p.avg));
  if (!pairs.length) return null;
  const totalPeso = pairs.reduce((s, p) => s + p.peso, 0);
  if (!gbHasWeights(gb) || totalPeso <= 0) return gbAvg(pairs.map((p) => p.avg));
  return pairs.reduce((s, p) => s + p.avg * p.peso, 0) / totalPeso;
}

let seq = 0;
export const gbId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// Estructura por defecto cuando una clase todavía no tiene libro de notas.
export function buildDefaultGradebook(roster) {
  return {
    scale: { ...DEFAULT_SCALE },
    cats: [
      { id: gbId('cat'), name: 'Talleres', peso: 0, cols: [{ id: gbId('c'), label: 'Taller 1' }, { id: gbId('c'), label: 'Taller 2' }] },
      { id: gbId('cat'), name: 'Tareas', peso: 0, cols: [{ id: gbId('c'), label: 'Tarea 1' }, { id: gbId('c'), label: 'Tarea 2' }] },
      { id: gbId('cat'), name: 'Quizes', peso: 0, cols: [{ id: gbId('c'), label: 'Quiz 1' }] },
      { id: gbId('cat'), name: 'Ejercicios', peso: 0, cols: [{ id: gbId('c'), label: 'Ejercicio 1' }] },
    ],
    rows: roster.map((name) => ({ id: gbId('r'), name })),
    grades: {},
  };
}
