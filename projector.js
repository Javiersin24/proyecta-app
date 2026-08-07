// Autenticación por JWT + middlewares de autorización por rol.
import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

// El secreto con el que se firman las sesiones. En producción NO puede tener
// un valor por defecto: si el .env no lo define, cualquiera que lea este
// repositorio podría fabricar tokens válidos para cualquier usuario, incluido
// el súper-admin. Por eso el servidor se niega a arrancar en vez de usar uno
// conocido. En desarrollo sí se permite, para no estorbar.
const SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('\n✖ FALTA JWT_SECRET en el archivo .env — el servidor no puede arrancar.\n' +
      '  Genera uno seguro con:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"\n' +
      '  y agrégalo al .env como:  JWT_SECRET="…"\n');
    process.exit(1);
  }
  console.warn('⚠ JWT_SECRET no definido — usando el de desarrollo. NO uses esto en producción.');
  return 'dev-proyecta-secret';
})();
const EXPIRES = '7d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, schoolId: user.schoolId }, SECRET, { expiresIn: EXPIRES });
}

// Adjunta req.user (registro completo) si el token es válido.
export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Sesión inválida' });
    if (user.status === 'Suspendida') return res.status(403).json({ error: 'Cuenta suspendida' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Restringe una ruta a ciertos roles.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No autorizado para este módulo' });
    next();
  };
}

// El súper-admin puede actuar sobre cualquier colegio; los demás quedan
// atados a su propio schoolId. Devuelve el schoolId efectivo de la petición.
export function scopedSchoolId(req, requestedId) {
  if (req.user.role === 'superadmin') return requestedId || null;
  return req.user.schoolId;
}
