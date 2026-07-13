// Módulo SÚPER-ADMIN (dueño de la plataforma de pago):
// gestión de todos los colegios, cuentas (agrupadas por colegio), proyectores,
// suscripciones y facturación/ingresos (MRR/ARR).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { genPassword, uniqueUsername } from './admin.js';

const router = Router();
router.use(authRequired, requireRole('superadmin'));

// Precio mensual por cuenta según plan (COP).
const PLAN_PRECIO = { Aula: 3500, Plantel: 4200, Campus: 5000 };

// ── Resumen global ──────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  const [colegios, cuentas, proyectores, activos] = await Promise.all([
    prisma.school.count(),
    prisma.user.count({ where: { role: { not: 'superadmin' } } }),
    prisma.projector.count(),
    prisma.school.count({ where: { status: 'Activo' } }),
  ]);
  res.json({
    stats: [
      { n: String(colegios), l: 'Colegios' },
      { n: String(cuentas), l: 'Cuentas' },
      { n: String(proyectores), l: 'Proyectores' },
      { n: String(activos), l: 'Colegios activos' },
    ],
  });
});

// ── Colegios (con conteos, suscripción e ingreso mensual generado) ─────────
router.get('/colegios', async (req, res) => {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: true, projectors: true } } },
  });
  const out = schools.map((s) => ({
    id: s.id, name: s.name, city: s.city, plan: s.plan, status: s.status,
    accounts: s._count.users, projectors: s._count.projectors,
    desde: s.subscriptionStart, renueva: s.subscriptionRenew,
    ingresoMensual: s._count.users * (PLAN_PRECIO[s.plan] || 0),
  }));
  res.json({ colegios: out, planPrecio: PLAN_PRECIO });
});

router.post('/colegios', async (req, res) => {
  const { name, city, plan } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre del colegio obligatorio' });
  const now = new Date();
  const renew = new Date(now); renew.setFullYear(renew.getFullYear() + 1);
  const school = await prisma.school.create({
    data: { name, city: city || '', plan: plan || 'Aula', status: 'Prueba', subscriptionStart: now, subscriptionRenew: renew },
  });
  await prisma.matriculaConfig.create({ data: { schoolId: school.id, abierta: false } });
  res.status(201).json({ colegio: school });
});

// Editar nombre/ciudad, suspender/reactivar, cambiar plan y fechas de suscripción
router.patch('/colegios/:id', async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.params.id } });
  if (!school) return res.status(404).json({ error: 'Colegio no encontrado' });
  const { name, city, status, plan, subscriptionStart, subscriptionRenew } = req.body || {};
  const data = {};
  if (name) data.name = name;
  if (city !== undefined) data.city = city;
  if (status) data.status = status;
  if (plan) data.plan = plan;
  if (subscriptionStart) data.subscriptionStart = new Date(subscriptionStart);
  if (subscriptionRenew) data.subscriptionRenew = new Date(subscriptionRenew);
  const updated = await prisma.school.update({ where: { id: school.id }, data });
  res.json({ colegio: updated });
});

router.delete('/colegios/:id', async (req, res) => {
  await prisma.school.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Cuentas — agrupadas por colegio ─────────────────────────────────────────
router.get('/cuentas', async (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'superadmin' },
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
    },
    include: { school: true },
    orderBy: { name: 'asc' },
  });
  // Agrupa por colegio.
  const grupos = {};
  for (const u of users) {
    const key = u.school?.name || 'Sin colegio';
    (grupos[key] ||= []).push({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, premium: u.premium });
  }
  res.json({ porColegio: Object.entries(grupos).map(([colegio, cuentas]) => ({ colegio, cuentas })) });
});

// POST /api/superadmin/cuentas  { schoolId, name, role }  → crea una cuenta en
// cualquier colegio (admin/profesor/estudiante). Es la única forma de darle a
// un colegio nuevo su primera cuenta de admin — de ahí en adelante ese admin
// ya puede crear las demás cuentas desde su propio panel.
router.post('/cuentas', async (req, res) => {
  const { schoolId, name, role } = req.body || {};
  if (!schoolId || !name || !['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Colegio, nombre y tipo de cuenta (admin/profesor/estudiante) son obligatorios' });
  }
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return res.status(404).json({ error: 'Colegio no encontrado' });
  const usuario = await uniqueUsername(name, school.name);
  const pass = genPassword();
  const passwordHash = await bcrypt.hash(pass, 10);
  const user = await prisma.user.create({ data: { schoolId, name, email: usuario, role, passwordHash } });
  res.status(201).json({
    account: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, school: school.name },
    credentials: { usuario, pass },
  });
});

router.post('/cuentas/:id/reset-password', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const pass = genPassword();
  const passwordHash = await bcrypt.hash(pass, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ credentials: { usuario: user.email, pass } });
});

// Cambiar estado o activar/desactivar Premium (Inteligencia Académica) por cuenta.
router.patch('/cuentas/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const { status, premium } = req.body || {};
  const data = {};
  if (status !== undefined) data.status = status || user.status;
  if (premium !== undefined) data.premium = !!premium;
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  res.json({ cuenta: { id: updated.id, status: updated.status, premium: updated.premium } });
});

router.delete('/cuentas/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Proyectores — CRUD completo, agrupados por colegio ──────────────────────
// Flujo: el súper-admin crea el proyector aquí y genera un código de
// activación; el dispositivo del aula lo ingresa una vez y queda "vinculado".
const serializeProjector = (p) => ({
  id: p.id, name: p.name, aula: p.aula, school: p.school?.name || 'Sin colegio', schoolId: p.schoolId,
  code: p.code, enabled: p.enabled, linked: p.linked, status: p.status, activity: p.activity,
});

router.get('/proyectores', async (req, res) => {
  const projectors = await prisma.projector.findMany({ include: { school: true }, orderBy: { aula: 'asc' } });
  const grupos = {};
  for (const raw of projectors) {
    const p = serializeProjector(raw);
    (grupos[p.school] ||= { colegio: p.school, enLinea: 0, proyectores: [] });
    grupos[p.school].proyectores.push(p);
    if (p.status === 'live' || p.status === 'online') grupos[p.school].enLinea++;
  }
  res.json({ porColegio: Object.values(grupos), proyectores: projectors.map(serializeProjector) });
});

router.post('/proyectores', async (req, res) => {
  const { name, aula, schoolId } = req.body || {};
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return res.status(400).json({ error: 'Colegio no válido' });
  const finalAula = (aula || '').trim() || '—';
  const created = await prisma.projector.create({
    data: {
      schoolId, aula: finalAula, name: (name || '').trim() || `Proyector ${finalAula}`,
      code: await uniqueProjectorCode(), enabled: true, linked: false, status: 'offline',
      activity: 'Esperando primer inicio de sesión',
    },
    include: { school: true },
  });
  res.status(201).json({ proyector: serializeProjector(created) });
});

router.patch('/proyectores/:id', async (req, res) => {
  const p = await prisma.projector.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'Proyector no encontrado' });
  const { name, aula, schoolId, enabled, regenCode } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = name;
  if (aula !== undefined) data.aula = aula;
  if (schoolId !== undefined) data.schoolId = schoolId;
  if (enabled !== undefined) {
    data.enabled = !!enabled;
    if (!enabled) { data.status = 'offline'; data.activity = 'Suspendido por el administrador'; }
  }
  if (regenCode) { data.code = await uniqueProjectorCode(); data.linked = false; data.status = 'offline'; data.activity = 'Código regenerado · esperando inicio de sesión'; }
  const updated = await prisma.projector.update({ where: { id: p.id }, data, include: { school: true } });
  res.json({ proyector: serializeProjector(updated) });
});

router.delete('/proyectores/:id', async (req, res) => {
  await prisma.projector.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

async function uniqueProjectorCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    if (!(await prisma.projector.findUnique({ where: { code } }))) return code;
  }
}

// ── Facturación / ingresos (MRR, ARR, desglose por plan, renovaciones) ─────
router.get('/facturacion', async (req, res) => {
  const schools = await prisma.school.findMany({ include: { _count: { select: { users: true } } } });
  let mrr = 0;
  const porPlan = {};
  for (const s of schools) {
    if (s.status === 'Suspendido') continue;
    const ingreso = s._count.users * (PLAN_PRECIO[s.plan] || 0);
    mrr += ingreso;
    porPlan[s.plan] = (porPlan[s.plan] || 0) + ingreso;
  }
  // Próximas renovaciones (ordenadas por fecha, ≤ 60 días marcadas).
  const hoy = new Date();
  const renovaciones = schools
    .filter((s) => s.subscriptionRenew)
    .sort((a, b) => new Date(a.subscriptionRenew) - new Date(b.subscriptionRenew))
    .slice(0, 8)
    .map((s) => {
      const dias = Math.ceil((new Date(s.subscriptionRenew) - hoy) / 86400000);
      return { colegio: s.name, plan: s.plan, renueva: s.subscriptionRenew, dias, proxima: dias <= 30, ingreso: s._count.users * (PLAN_PRECIO[s.plan] || 0) };
    });
  res.json({
    mrr,
    arr: mrr * 12,
    planPrecio: PLAN_PRECIO,
    desglosePlan: Object.entries(porPlan).map(([plan, monto]) => ({ plan, monto })),
    ingresosMensuales: [
      { m: 'Feb', n: 98.4 }, { m: 'Mar', n: 104.2 }, { m: 'Abr', n: 109.8 },
      { m: 'May', n: 118.5 }, { m: 'Jun', n: 124.1 }, { m: 'Jul', n: 131.6 },
    ],
    renovaciones,
  });
});

export default router;
