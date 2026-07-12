// Módulo del PROFESOR: sus clases (salones), temas, materiales, tareas,
// publicaciones en el feed, y calificación de entregas.
import { Router } from 'express';
import { prisma, toJSON, parseJSON } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeClass, serializeTask, CLASS_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired, requireRole('teacher'));

// Verifica que la clase pertenezca al profesor autenticado.
async function ownClass(req, res, next) {
  const cls = await prisma.class.findUnique({ where: { id: req.params.classId } });
  if (!cls) return res.status(404).json({ error: 'Clase no encontrada' });
  if (cls.teacherId !== req.user.id) return res.status(403).json({ error: 'Esta clase no es tuya' });
  req.class = cls;
  next();
}

// GET /api/teacher/classes  → todas mis clases
router.get('/classes', async (req, res) => {
  const classes = await prisma.class.findMany({ where: { teacherId: req.user.id }, include: CLASS_INCLUDE });
  res.json({ classes: classes.map((c) => serializeClass(c, { includeStudents: true })) });
});

// GET /api/teacher/classes/:classId
router.get('/classes/:classId', ownClass, async (req, res) => {
  const c = await prisma.class.findUnique({ where: { id: req.params.classId }, include: CLASS_INCLUDE });
  res.json({ class: serializeClass(c, { includeStudents: true }) });
});

// POST /api/teacher/classes  { name, section }
router.post('/classes', async (req, res) => {
  const { name, section } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre de la clase obligatorio' });
  const code = randomCode();
  const c = await prisma.class.create({
    data: { schoolId: req.user.schoolId, name, section: section || null, code, teacherId: req.user.id },
    include: CLASS_INCLUDE,
  });
  res.status(201).json({ class: serializeClass(c, { includeStudents: true }) });
});

// DELETE /api/teacher/classes/:classId
router.delete('/classes/:classId', ownClass, async (req, res) => {
  await prisma.class.delete({ where: { id: req.params.classId } });
  res.json({ ok: true });
});

// GET /api/teacher/horario  → horario semanal del profesor a través de todos sus grupos
router.get('/horario', async (req, res) => {
  const slots = await prisma.groupSchedule.findMany({
    where: { teacherId: req.user.id },
    include: { group: { include: { room: true } } },
  });
  const horario = slots.map((s) => ({
    materia: s.materia, dia: s.dia, hora: s.hora,
    grupo: s.group.nombre, grupoId: s.group.id, aula: s.group.room?.name || null,
  }));
  res.json({ horario });
});

// POST /api/teacher/classes/:classId/topics  { name, accent }
router.post('/classes/:classId/topics', ownClass, async (req, res) => {
  const { name, accent } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre del tema obligatorio' });
  const order = await prisma.topic.count({ where: { classId: req.params.classId } });
  const t = await prisma.topic.create({ data: { classId: req.params.classId, name, accent: accent || 'indigo', order } });
  res.status(201).json({ topic: t });
});

// POST /api/teacher/topics/:topicId/materials  { kind, name, meta, url }
router.post('/topics/:topicId/materials', async (req, res) => {
  const topic = await prisma.topic.findUnique({ where: { id: req.params.topicId }, include: { class: true } });
  if (!topic) return res.status(404).json({ error: 'Tema no encontrado' });
  if (topic.class.teacherId !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  const { kind, name, meta, url, thumb } = req.body || {};
  if (!kind || !name) return res.status(400).json({ error: 'Tipo y nombre del material obligatorios' });
  const m = await prisma.material.create({
    data: { topicId: topic.id, kind, name, meta: meta || null, url: url || null, thumb: thumb || null, author: req.user.name },
  });
  res.status(201).json({ material: m });
});

// POST /api/teacher/classes/:classId/posts  { body, kind, attachment }
router.post('/classes/:classId/posts', ownClass, async (req, res) => {
  const { body, kind, attachment } = req.body || {};
  if (!body) return res.status(400).json({ error: 'El anuncio no puede estar vacío' });
  const p = await prisma.post.create({
    data: { classId: req.params.classId, author: req.user.name, when: 'Ahora', kind: kind || 'note', body, attachment: toJSON(attachment) },
  });
  res.status(201).json({ post: { ...p, attachment: parseJSON(p.attachment) } });
});

// POST /api/teacher/classes/:classId/tasks  { title, desc, due, points, rubric, files }
router.post('/classes/:classId/tasks', ownClass, async (req, res) => {
  const { title, desc, due, dueDate, points, rubric, files } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Título de la tarea obligatorio' });
  const total = await prisma.classMember.count({ where: { classId: req.params.classId } });
  const t = await prisma.task.create({
    data: {
      classId: req.params.classId, title, desc: desc || null, due: due || null, dueDate: dueDate || null,
      points: Number(points) || 0, total, status: 'pending',
      rubric: toJSON(rubric), files: toJSON(files || []) || '[]',
    },
    include: { submissions: { include: { student: true } } },
  });
  res.status(201).json({ task: serializeTask(t) });
});

// PATCH /api/teacher/tasks/:taskId/submissions/:submissionId  { grade }
// SOLO el profesor puede calificar (regla explícita del cliente).
router.patch('/tasks/:taskId/submissions/:submissionId', async (req, res) => {
  const sub = await prisma.submission.findUnique({ where: { id: req.params.submissionId }, include: { task: { include: { class: true } } } });
  if (!sub || sub.taskId !== req.params.taskId) return res.status(404).json({ error: 'Entrega no encontrada' });
  if (sub.task.class.teacherId !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  const { grade, comment } = req.body || {};
  const updated = await prisma.submission.update({
    where: { id: sub.id },
    data: { grade: grade == null ? null : Number(grade), ...(comment !== undefined ? { comment } : {}) },
  });
  res.json({ submission: { id: updated.id, grade: updated.grade, comment: updated.comment, status: updated.status } });
});

// PUT /api/teacher/groups/:groupId/grade  { materia, studentName, valor }
// Nota consolidada del colegio: solo el profesor la puede escribir.
router.put('/groups/:groupId/grade', async (req, res) => {
  const { materia, studentName, valor } = req.body || {};
  if (!materia || !studentName) return res.status(400).json({ error: 'Materia y estudiante obligatorios' });
  const group = await prisma.group.findUnique({ where: { id: req.params.groupId } });
  if (!group || group.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Grupo no encontrado' });
  const v = valor === '' || valor == null ? null : Number(valor);
  if (v == null) {
    await prisma.gradeEntry.deleteMany({ where: { groupId: group.id, materia, studentName } });
    return res.json({ ok: true, deleted: true });
  }
  const entry = await prisma.gradeEntry.upsert({
    where: { groupId_materia_studentName: { groupId: group.id, materia, studentName } },
    update: { valor: v },
    create: { groupId: group.id, materia, studentName, valor: v },
  });
  res.json({ entry });
});

// ── Asistencia diaria por clase ─────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

// GET /api/teacher/classes/:classId/asistencia?date=YYYY-MM-DD  (default: hoy)
router.get('/classes/:classId/asistencia', ownClass, async (req, res) => {
  const date = req.query.date || todayISO();
  const entries = await prisma.classAttendanceEntry.findMany({ where: { classId: req.params.classId, date } });
  const asistencia = Object.fromEntries(entries.map((e) => [e.studentName, e.estado]));
  res.json({ date, asistencia });
});

// PUT /api/teacher/classes/:classId/asistencia  { studentName, estado, date? }
router.put('/classes/:classId/asistencia', ownClass, async (req, res) => {
  const { studentName, estado } = req.body || {};
  const date = req.body?.date || todayISO();
  if (!studentName || !estado) return res.status(400).json({ error: 'Estudiante y estado obligatorios' });
  const entry = await prisma.classAttendanceEntry.upsert({
    where: { classId_studentName_date: { classId: req.params.classId, studentName, date } },
    update: { estado },
    create: { classId: req.params.classId, studentName, date, estado },
  });
  res.json({ entry });
});

// GET /api/teacher/classes/:classId/asistencia/historial  → últimos días con registros
router.get('/classes/:classId/asistencia/historial', ownClass, async (req, res) => {
  const entries = await prisma.classAttendanceEntry.findMany({
    where: { classId: req.params.classId }, orderBy: { date: 'desc' },
  });
  const byDate = {};
  for (const e of entries) {
    (byDate[e.date] ||= {})[e.studentName] = e.estado;
  }
  const dias = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 10)
    .map((date) => ({ date, registros: byDate[date] }));
  res.json({ historial: dias });
});

// ── Gradebook flexible por clase (categorías × columnas) ────────────────────

// GET /api/teacher/classes/:classId/gradebook
router.get('/classes/:classId/gradebook', ownClass, async (req, res) => {
  res.json({ gradebook: parseJSON(req.class.gradebook, null) });
});

// PUT /api/teacher/classes/:classId/gradebook  { cats, rows, grades }
router.put('/classes/:classId/gradebook', ownClass, async (req, res) => {
  const gb = req.body || {};
  if (!gb.cats || !gb.rows || !gb.grades) return res.status(400).json({ error: 'Formato de libro de notas inválido' });
  await prisma.class.update({ where: { id: req.params.classId }, data: { gradebook: toJSON(gb) } });
  res.json({ ok: true });
});

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(3)}-${pick(3)}`;
}

export default router;
