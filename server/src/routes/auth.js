// Autenticación: login, registro público de matrícula, y sesión actual.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, parseJSON } from '../db.js';
import { signToken, authRequired } from '../auth.js';

const router = Router();

// Vista pública de un usuario (sin hash).
export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
    online: u.online, schoolId: u.schoolId, capacidad: u.capacidad, premium: u.premium,
  };
}

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  if (user.status === 'Suspendida') return res.status(403).json({ error: 'Tu cuenta está suspendida. Contacta al administrador.' });

  await prisma.user.update({ where: { id: user.id }, data: { online: true } });
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me  → sesión actual (incluye estado de matrícula si aplica)
router.get('/me', authRequired, async (req, res) => {
  const u = req.user;
  const out = publicUser(u);
  if (u.role === 'enrollee' || u.role === 'student') {
    const enrollment = await prisma.enrollment.findUnique({ where: { userId: u.id } });
    if (enrollment) out.enrollment = enrollment;
  }
  if (u.schoolId) {
    out.school = await prisma.school.findUnique({ where: { id: u.schoolId } });
  }
  if (u.role === 'teacher' && u.currentProjectorId) {
    out.currentProjector = await prisma.projector.findUnique({ where: { id: u.currentProjectorId } });
  }
  res.json({ user: out });
});

// PUT /api/auth/salon-actual  { code }
// El profesor marca "mi salón actual" escribiendo el código que ve en la
// pantalla del proyector que tiene físicamente en frente (no elige de una
// lista, para no equivocarse de salón). Queda igual para todas sus clases
// hasta que lo cambie. { code: null } lo desvincula.
router.put('/salon-actual', authRequired, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Solo el profesor puede vincular un salón' });
  const { code } = req.body || {};
  let projectorId = null;
  if (code) {
    const projector = await prisma.projector.findUnique({ where: { code: String(code).toUpperCase().trim() } });
    if (!projector || projector.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Código de proyector no encontrado' });
    if (!projector.enabled) return res.status(403).json({ error: 'Este proyector está suspendido' });
    projectorId = projector.id;
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { currentProjectorId: projectorId } });
  const projector = projectorId ? await prisma.projector.findUnique({ where: { id: projectorId } }) : null;
  res.json({ ok: true, projector });
});

// POST /api/auth/change-password  { currentPassword, newPassword }
router.post('/change-password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Contraseña actual y nueva (mínimo 6 caracteres) son obligatorias' });
  }
  const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

// POST /api/auth/logout
router.post('/logout', authRequired, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { online: false } });
  res.json({ ok: true });
});

// POST /api/auth/signup-matricula
// Registro público: el aspirante llena TODO el formulario ANTES de pagar.
// Se le crea una cuenta con rol "enrollee" (solo ve el portal de matrícula).
router.post('/signup-matricula', async (req, res) => {
  const f = req.body || {};
  if (!f.name || !f.acudiente || !f.grado) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (estudiante, acudiente, grado).' });
  }
  // Colegio destino: por defecto el primero (demo). En producción vendría del subdominio/slug.
  const school = f.schoolId
    ? await prisma.school.findUnique({ where: { id: f.schoolId } })
    : await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!school) return res.status(400).json({ error: 'Colegio no encontrado' });

  // Validar proceso de matrícula abierto y cupos disponibles.
  const cfg = await prisma.matriculaConfig.findUnique({ where: { schoolId: school.id } });
  const hoy = new Date().toISOString().slice(0, 10);
  const dentro = (!cfg?.fechaInicio || hoy >= cfg.fechaInicio) && (!cfg?.fechaFin || hoy <= cfg.fechaFin);
  if (cfg && (!cfg.abierta || !dentro)) {
    return res.status(409).json({ error: 'El proceso de matrícula está cerrado.' });
  }
  const porGrado = parseJSON(cfg?.porGrado, {});
  const c = porGrado[f.grado] || { cupoPorGrupo: 25, numGrupos: 1 };
  const cupoTotal = (c.cupoPorGrupo || 25) * (c.numGrupos || 1);
  const ocupados = await prisma.enrollment.count({
    where: { schoolId: school.id, grado: f.grado, status: { in: ['Pagado', 'Asignado'] } },
  });
  if (cupoTotal - ocupados <= 0) return res.status(409).json({ error: 'No quedan cupos para ese grado.' });

  // Email: el del acudiente si viene, o uno generado.
  const email = (f.emailAcudiente || `matricula.${Date.now()}@${slug(school.name)}.edu`).toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  const finalEmail = exists ? `matricula.${Date.now()}@${slug(school.name)}.edu` : email;

  const password = f.password || 'proyecta123';
  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.user.create({
    data: { name: f.name, email: finalEmail, passwordHash, role: 'enrollee', schoolId: school.id },
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      schoolId: school.id, userId: account.id, name: f.name, grado: f.grado,
      fechaNacimiento: f.fechaNacimiento || null, documento: f.documento || null, direccion: f.direccion || null,
      acudiente: f.acudiente, parentesco: f.parentesco || null, telAcudiente: f.telAcudiente || null, emailAcudiente: f.emailAcudiente || null,
      alergias: f.alergias || null, condiciones: f.condiciones || null, eps: f.eps || null,
      emergenciaNombre: f.emergenciaNombre || null, emergenciaTel: f.emergenciaTel || null,
      colegioAnterior: f.colegioAnterior || null, ultimoGrado: f.ultimoGrado || null, boletinNombre: f.boletinNombre || null,
      metodoPago: f.metodoPago || 'En línea', status: 'Pendiente',
    },
  });

  const token = signToken(account);
  res.status(201).json({ token, user: publicUser(account), enrollment, loginEmail: finalEmail });
});

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

export default router;
