// Módulo PROYECTOR: emparejar un dispositivo con un proyector y proyectar en
// un toque. El emparejamiento es por código de aula (el sistema detecta el
// salón por el horario/código). La proyección real (WebRTC/cast) queda simulada.
import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// GET /api/projector/:code  → estado público del proyector (para la pantalla del proyector)
router.get('/:code', async (req, res) => {
  const room = await prisma.room.findFirst({ where: { code: req.params.code } });
  const projector = room
    ? await prisma.projector.findFirst({ where: { schoolId: room.schoolId, name: room.name } })
    : await prisma.projector.findFirst({ where: { code: req.params.code } });
  if (!projector) return res.status(404).json({ error: 'Proyector no encontrado' });
  const session = await prisma.projectionSession.findFirst({ where: { projectorId: projector.id, endedAt: null }, orderBy: { startedAt: 'desc' } });
  res.json({ projector: { id: projector.id, name: projector.name, status: projector.status, activity: projector.activity }, session });
});

router.use(authRequired);

// GET /api/projector  → proyectores disponibles para el usuario (de su colegio)
router.get('/', async (req, res) => {
  const projectors = await prisma.projector.findMany({ where: { schoolId: req.user.schoolId }, orderBy: { name: 'asc' } });
  res.json({ projectors });
});

// POST /api/projector/:id/project  { fileName }
// Vincula y proyecta: marca el proyector como "live" y abre una sesión.
router.post('/:id/project', async (req, res) => {
  const { fileName } = req.body || {};
  if (!fileName) return res.status(400).json({ error: 'Falta el archivo a proyectar' });
  const projector = await prisma.projector.findUnique({ where: { id: req.params.id } });
  if (!projector || projector.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Proyector no encontrado' });

  await prisma.projectionSession.updateMany({ where: { projectorId: projector.id, endedAt: null }, data: { endedAt: new Date() } });
  const session = await prisma.projectionSession.create({ data: { projectorId: projector.id, fileName, startedBy: req.user.name } });
  await prisma.projector.update({ where: { id: projector.id }, data: { status: 'live', activity: `Proyectando: ${fileName}` } });
  res.status(201).json({ ok: true, session });
});

// POST /api/projector/:id/stop  → detener proyección
router.post('/:id/stop', async (req, res) => {
  const projector = await prisma.projector.findUnique({ where: { id: req.params.id } });
  if (!projector || projector.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Proyector no encontrado' });
  await prisma.projectionSession.updateMany({ where: { projectorId: projector.id, endedAt: null }, data: { endedAt: new Date() } });
  await prisma.projector.update({ where: { id: projector.id }, data: { status: 'online', activity: 'En línea · sin actividad' } });
  res.json({ ok: true });
});

export default router;
