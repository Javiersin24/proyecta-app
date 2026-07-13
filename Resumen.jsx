const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function diasHasta(iso) {
  if (!iso) return null;
  const hoy = new Date();
  const t = new Date(iso);
  return Math.round((t - hoy) / 86400000);
}

export function fmtCOP(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString('es-CO') + ' K';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
