// Módulo PROYECTOR: emparejar un dispositivo con un proyector y proyectar en
// un toque. El emparejamiento es por código de aula (el sistema detecta el
// salón por el horario/código). La proyección real (WebRTC/cast) queda simulada.
import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// GET /api/projector/:code  → estado público del proyector (para la pantalla del proyector)
// Este es el "primer inicio de sesión" del dispositivo del aula: en la
// primera consulta exitosa, el proyector queda marcado como "vinculado".
router.get('/:code', async (req, res) => {
  let projector = await prisma.projector.findUnique({ where: { code: req.params.code } });
  if (!projector) {
    // Compatibilidad con códigos de aula antiguos (Room.code).
    const room = await prisma.room.findFirst({ where: { code: req.params.code } });
    if (room) projector = await prisma.projector.findFirst({ where: { schoolId: room.schoolId, name: room.name } });
  }
  if (!projector) return res.status(404).json({ error: 'Proyector no encontrado' });
  if (!projector.enabled) return res.status(403).json({ error: 'Este proyector está suspendido. Contacta al administrador del colegio.' });
  if (!projector.linked) {
    projector = await prisma.projector.update({ where: { id: projector.id }, data: { linked: true, status: 'online', activity: 'En línea · sin actividad' } });
  }
  const session = await prisma.projectionSession.findFirst({ where: { projectorId: projector.id, endedAt: null }, orderBy: { startedAt: 'desc' } });
  res.json({ projector: { id: projector.id, name: projector.name, status: projector.status, activity: projector.activity }, session });
});

router.use(authRequired);

// GET /api/projector  → proyectores disponibles para el usuario (de su colegio)
router.get('/', async (req, res) => {
  const projectors = await prisma.projector.findMany({ where: { schoolId: req.user.schoolId, enabled: true }, orderBy: { aula: 'asc' } });
  res.json({ projectors });
});

// POST /api/projector/:id/project  { fileName, classId }
// Vincula y proyecta: marca el proyector como "live" y abre una sesión.
// Por seguridad, solo se puede proyectar al proyector que es el SALÓN ACTUAL
// del profesor de esa clase (ver PUT /auth/salon-actual) — así ningún
// profesor o estudiante puede mandar contenido al salón de otra clase.
router.post('/:id/project', async (req, res) => {
  const { fileName, classId } = req.body || {};
  if (!fileName) return res.status(400).json({ error: 'Falta el archivo a proyectar' });
  if (!classId) return res.status(400).json({ error: 'Falta la clase desde la que proyectas' });
  const projector = await prisma.projector.findUnique({ where: { id: req.params.id } });
  if (!projector || projector.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Proyector no encontrado' });
  if (!projector.enabled) return res.status(403).json({ error: 'Este proyector está suspendido' });

  const cls = await prisma.class.findUnique({ where: { id: classId }, include: { members: true, teacher: true } });
  if (!cls || cls.teacher.currentProjectorId !== projector.id) return res.status(403).json({ error: 'Este no es el salón actual del profesor de esa clase' });
  if (req.user.role === 'teacher') {
    if (cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Esta clase no es tuya' });
  } else if (req.user.role === 'student') {
    if (!cls.members.some((m) => m.studentId === req.user.id)) return res.status(403).json({ error: 'No perteneces a esta clase' });
  } else {
    return res.status(403).json({ error: 'No autorizado' });
  }

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
