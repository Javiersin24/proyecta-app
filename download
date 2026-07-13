// Portal de MATRÍCULA (rol "enrollee"): el aspirante ya llenó el formulario;
// aquí ve el estado, paga en línea y, cuando el colegio hace el sorteo, ve su grupo.
import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeGroup, GROUP_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired, requireRole('enrollee', 'student'));

// GET /api/matricula/me  → estado de mi matrícula (+ grupo si ya fui asignado)
router.get('/me', async (req, res) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId: req.user.id } });
  if (!enrollment) return res.status(404).json({ error: 'No tienes una matrícula registrada' });
  let grupo = null;
  if (enrollment.status === 'Asignado' && enrollment.grupoNombre) {
    const g = await prisma.group.findFirst({ where: { schoolId: enrollment.schoolId, nombre: enrollment.grupoNombre }, include: GROUP_INCLUDE });
    if (g) grupo = serializeGroup(g);
  }
  res.json({ enrollment, grupo });
});

// POST /api/matricula/pay  → pagar la matrícula en línea (simulado)
router.post('/pay', async (req, res) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId: req.user.id } });
  if (!enrollment) return res.status(404).json({ error: 'No tienes una matrícula registrada' });
  if (enrollment.status !== 'Pendiente') return res.status(409).json({ error: 'Tu matrícula ya no está pendiente de pago' });
  const updated = await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: 'Pagado', metodoPago: 'En línea' } });
  res.json({ enrollment: updated });
});

// POST /api/matricula/enter  → convierte la cuenta enrollee en student (una vez asignado)
router.post('/enter', async (req, res) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { userId: req.user.id } });
  if (!enrollment || enrollment.status !== 'Asignado') {
    return res.status(409).json({ error: 'Aún no tienes grupo asignado' });
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { role: 'student' } });
  res.json({ ok: true, role: 'student' });
});

export default router;
