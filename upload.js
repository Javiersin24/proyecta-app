// Límite de intentos en memoria, con ventana deslizante.
//
// Se usa para frenar la fuerza bruta contra el login y la enumeración de
// códigos de proyector. Es en memoria a propósito: no añade dependencias ni
// otro servicio que mantener. Su límite conocido es que se reinicia cuando se
// reinicia el proceso y que no se comparte entre varias instancias — si algún
// día Proyecta corre en más de un servidor, esto debe mudarse a Redis o a la
// base de datos.
const buckets = new Map(); // clave -> [marcas de tiempo]

// Limpieza periódica para que el mapa no crezca sin control.
const CLEANUP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of buckets) {
    const vivos = arr.filter((t) => now - t < CLEANUP_MS);
    if (vivos.length) buckets.set(k, vivos); else buckets.delete(k);
  }
}, CLEANUP_MS).unref();

/**
 * Registra un intento y dice si se pasó del límite.
 * @returns {{limited: boolean, retryAfter: number}} segundos que faltan para poder reintentar
 */
export function hit(key, { max, windowMs }) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { limited: false, retryAfter: 0 };
}

// Borra el contador (p. ej. tras un login correcto).
export function reset(key) {
  buckets.delete(key);
}

// IP real del cliente. Detrás de nginx llega en X-Forwarded-For.
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'desconocida';
}

/** Middleware listo para usar en una ruta. */
export function limit({ max, windowMs, keyFn, message }) {
  return (req, res, next) => {
    const { limited, retryAfter } = hit(keyFn(req), { max, windowMs });
    if (limited) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message || 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' });
    }
    next();
  };
}
