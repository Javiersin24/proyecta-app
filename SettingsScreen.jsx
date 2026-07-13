// Helpers compartidos del libro de notas (usados por Calificaciones e Inteligencia).
export const GB_MAX = 5;
export const GB_PASS = 3;
export const gbFmt = (n) => (n == null ? '—' : n.toFixed(1));
export const gbColor = (n) => (n == null ? 'var(--fg-3)' : n >= GB_PASS ? '#1a6b47' : '#B42318');

let seq = 0;
export const gbId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// Estructura por defecto cuando una clase todavía no tiene libro de notas.
export function buildDefaultGradebook(roster) {
  return {
    cats: [
      { id: gbId('cat'), name: 'Talleres', cols: [{ id: gbId('c'), label: 'Taller 1' }, { id: gbId('c'), label: 'Taller 2' }] },
      { id: gbId('cat'), name: 'Tareas', cols: [{ id: gbId('c'), label: 'Tarea 1' }, { id: gbId('c'), label: 'Tarea 2' }] },
      { id: gbId('cat'), name: 'Quizes', cols: [{ id: gbId('c'), label: 'Quiz 1' }] },
      { id: gbId('cat'), name: 'Ejercicios', cols: [{ id: gbId('c'), label: 'Ejercicio 1' }] },
    ],
    rows: roster.map((name) => ({ id: gbId('r'), name })),
    grades: {},
  };
}
