// Módulo SÚPER-ADMIN (dueño de la plataforma de pago):
// gestión de todos los colegios, cuentas (agrupadas por colegio), proyectores,
// suscripciones y facturación/ingresos (MRR/ARR).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../auth.js';

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

// Suspender / reactivar / cambiar plan / fechas de suscripción
router.patch('/colegios/:id', async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.params.id } });
  if (!school) return res.status(404).json({ error: 'Colegio no encontrado' });
  const { status, plan, subscriptionRenew } = req.body || {};
  const data = {};
  if (status) data.status = status;
  if (plan) data.plan = plan;
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
    (grupos[key] ||= []).push({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });
  }
  res.json({ porColegio: Object.entries(grupos).map(([colegio, cuentas]) => ({ colegio, cuentas })) });
});

router.post('/cuentas/:id/reset-password', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const nueva = req.body?.password || Math.random().toString(36).slice(2, 10);
  const passwordHash = await bcrypt.hash(nueva, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ ok: true, temporaryPassword: nueva });
});

router.patch('/cuentas/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const { status } = req.body || {};
  const updated = await prisma.user.update({ where: { id: user.id }, data: { status: status || user.status } });
  res.json({ cuenta: { id: updated.id, status: updated.status } });
});

router.delete('/cuentas/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Proyectores — agrupados por colegio ─────────────────────────────────────
router.get('/proyectores', async (req, res) => {
  const projectors = await prisma.projector.findMany({ include: { school: true }, orderBy: { name: 'asc' } });
  const grupos = {};
  for (const p of projectors) {
    const key = p.school?.name || 'Sin colegio';
    (grupos[key] ||= { colegio: key, enLinea: 0, proyectores: [] });
    grupos[key].proyectores.push({ id: p.id, name: p.name, status: p.status, activity: p.activity });
    if (p.status === 'live' || p.status === 'online') grupos[key].enLinea++;
  }
  res.json({ porColegio: Object.values(grupos) });
});

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
