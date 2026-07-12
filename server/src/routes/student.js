// Módulo del ESTUDIANTE: sus clases, tareas (pendientes/entregadas),
// entrega con adjuntos + deshacer envío, horario semanal y calificaciones.
import { Router } from 'express';
import { prisma, toJSON, parseJSON } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeClass, serializeTask, serializeGroup, CLASS_INCLUDE, GROUP_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired, requireRole('student'));

// Clases en las que el estudiante está inscrito.
async function myClassIds(userId) {
  const memberships = await prisma.classMember.findMany({ where: { studentId: userId }, select: { classId: true } });
  return memberships.map((m) => m.classId);
}

// Igual que CLASS_INCLUDE pero solo trae LA PROPIA entrega de cada tarea —
// un estudiante no debe ver los archivos/notas de sus compañeros.
const studentClassInclude = (studentId) => ({
  ...CLASS_INCLUDE,
  tasks: {
    include: {
      submissions: { where: { studentId }, include: { student: true } },
      _count: { select: { submissions: { where: { status: { in: ['done', 'late'] } } } } },
    },
  },
});

// GET /api/student/classes
router.get('/classes', async (req, res) => {
  const ids = await myClassIds(req.user.id);
  const classes = await prisma.class.findMany({ where: { id: { in: ids } }, include: studentClassInclude(req.user.id) });
  res.json({ classes: classes.map((c) => serializeClass(c)) });
});

// POST /api/student/classes/join  { code }
router.post('/classes/join', async (req, res) => {
  const code = (req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Ingresa el código de la clase' });
  const cls = await prisma.class.findFirst({ where: { code, schoolId: req.user.schoolId } });
  if (!cls) return res.status(404).json({ error: 'No existe una clase con ese código en tu colegio' });
  const existing = await prisma.classMember.findUnique({ where: { classId_studentId: { classId: cls.id, studentId: req.user.id } } });
  if (existing) return res.status(409).json({ error: 'Ya estás inscrito en esta clase' });
  await prisma.classMember.create({ data: { classId: cls.id, studentId: req.user.id } });
  const full = await prisma.class.findUnique({ where: { id: cls.id }, include: studentClassInclude(req.user.id) });
  res.status(201).json({ class: serializeClass(full) });
});

// GET /api/student/classes/:classId
router.get('/classes/:classId', async (req, res) => {
  const ids = await myClassIds(req.user.id);
  if (!ids.includes(req.params.classId)) return res.status(403).json({ error: 'No estás inscrito en esta clase' });
  const c = await prisma.class.findUnique({ where: { id: req.params.classId }, include: studentClassInclude(req.user.id) });
  res.json({ class: serializeClass(c) });
});

// GET /api/student/tasks  → resumen de tareas (pendientes vs. entregadas)
router.get('/tasks', async (req, res) => {
  const ids = await myClassIds(req.user.id);
  const classes = await prisma.class.findMany({
    where: { id: { in: ids } },
    include: { tasks: { include: { submissions: { where: { studentId: req.user.id } } } } },
  });
  const pendientes = [];
  const completadas = [];
  for (const c of classes) {
    for (const t of c.tasks) {
      const mine = t.submissions[0];
      const entry = { classId: c.id, className: c.name, taskId: t.id, title: t.title, due: t.due, dueDate: t.dueDate, points: t.points, status: mine?.status || 'pending', grade: mine?.grade ?? null };
      if (mine && (mine.status === 'done' || mine.status === 'late')) completadas.push(entry);
      else pendientes.push(entry);
    }
  }
  res.json({ pendientes, completadas });
});

// POST /api/student/tasks/:taskId/submit  { file, late }
// El estudiante adjunta y marca como entregado.
router.post('/tasks/:taskId/submit', async (req, res) => {
  const { file, late } = req.body || {};
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { class: true } });
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  const member = await prisma.classMember.findUnique({ where: { classId_studentId: { classId: task.classId, studentId: req.user.id } } });
  if (!member) return res.status(403).json({ error: 'No estás inscrito en esta clase' });

  const sub = await prisma.submission.upsert({
    where: { taskId_studentId: { taskId: task.id, studentId: req.user.id } },
    update: { status: late ? 'late' : 'done', file: toJSON(file), grade: null },
    create: { taskId: task.id, studentId: req.user.id, status: late ? 'late' : 'done', file: toJSON(file) },
  });
  res.json({ submission: { id: sub.id, status: sub.status, file: parseJSON(sub.file), grade: sub.grade } });
});

// POST /api/student/tasks/:taskId/undo  → deshacer envío (mientras no esté calificada)
router.post('/tasks/:taskId/undo', async (req, res) => {
  const sub = await prisma.submission.findUnique({ where: { taskId_studentId: { taskId: req.params.taskId, studentId: req.user.id } } });
  if (!sub) return res.status(404).json({ error: 'No hay entrega que deshacer' });
  if (sub.grade != null) return res.status(409).json({ error: 'La tarea ya fue calificada, no puedes deshacer el envío' });
  const updated = await prisma.submission.update({ where: { id: sub.id }, data: { status: 'pending', file: null } });
  res.json({ submission: { id: updated.id, status: updated.status, file: null, grade: null } });
});

// GET /api/student/horario  → horario semanal + profesores del grupo del estudiante
router.get('/horario', async (req, res) => {
  const group = await findStudentGroup(req.user);
  if (!group) return res.json({ horario: [], profesores: [], grupo: null });
  const g = serializeGroup(group);
  const profesores = [];
  const seen = new Set();
  for (const h of g.horario) {
    if (h.profesor && !seen.has(h.profesor)) { seen.add(h.profesor); profesores.push({ nombre: h.profesor, materia: h.materia, profesorId: h.profesorId }); }
  }
  res.json({ grupo: { id: g.id, nombre: g.nombre, aula: g.aula, grado: g.grado }, horario: g.horario, profesores });
});

// GET /api/student/calificaciones  → notas del semestre del estudiante
router.get('/calificaciones', async (req, res) => {
  const group = await findStudentGroup(req.user);
  if (!group) return res.json({ calificaciones: [] });
  const entries = await prisma.gradeEntry.findMany({ where: { groupId: group.id, studentName: req.user.name } });
  const califs = entries.map((e) => ({ materia: e.materia, valor: e.valor }));
  res.json({ grupo: group.nombre, calificaciones: califs });
});

// ── Libro de calificaciones por clase (gradebook flexible del profesor) ────
// El estudiante NUNCA debe ver las notas de sus compañeros — todo se filtra
// aquí mismo a su propia fila antes de responder.

const GB_MAX = 5;
function readGradebookForStudent(gbRaw, studentName) {
  const gb = parseJSON(gbRaw, null);
  if (!gb) return null;
  const row = (gb.rows || []).find((r) => r.name === studentName);
  if (!row) return null;
  const num = (colId) => {
    const v = parseFloat(gb.grades?.[`${row.id}::${colId}`]);
    return Number.isFinite(v) ? Math.min(GB_MAX, Math.max(0, v)) : null;
  };
  const catAvg = (cat) => {
    const xs = (cat.cols || []).map((k) => num(k.id)).filter((x) => x != null);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const cats = (gb.cats || []).map((cat) => ({
    id: cat.id, name: cat.name,
    cols: (cat.cols || []).map((k) => ({ id: k.id, label: k.label, val: num(k.id) })),
    avg: catAvg(cat),
  }));
  const finals = cats.map((c) => c.avg).filter((x) => x != null);
  const definitiva = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
  return { cats, definitiva };
}

// GET /api/student/gradebook  → boletín: definitiva por cada clase inscrita
router.get('/gradebook', async (req, res) => {
  const ids = await myClassIds(req.user.id);
  const classes = await prisma.class.findMany({ where: { id: { in: ids } }, include: { teacher: true } });
  const rows = classes.map((c) => {
    const data = readGradebookForStudent(c.gradebook, req.user.name);
    return {
      classId: c.id, name: c.name, section: c.section, paletteIdx: c.paletteIdx,
      teacherName: c.teacher?.name || null, definitiva: data?.definitiva ?? null,
    };
  });
  res.json({ classes: rows });
});

// GET /api/student/classes/:classId/gradebook  → detalle de mis notas en esa clase
router.get('/classes/:classId/gradebook', async (req, res) => {
  const ids = await myClassIds(req.user.id);
  if (!ids.includes(req.params.classId)) return res.status(403).json({ error: 'No estás inscrito en esta clase' });
  const c = await prisma.class.findUnique({ where: { id: req.params.classId } });
  const data = readGradebookForStudent(c?.gradebook, req.user.name);
  res.json({ gradebook: data });
});

// Encuentra el grupo administrativo del estudiante por su nombre en el roster.
async function findStudentGroup(user) {
  const member = await prisma.groupMember.findFirst({
    where: { OR: [{ studentId: user.id }, { studentName: user.name }] },
    include: { group: { include: GROUP_INCLUDE } },
  });
  return member?.group || null;
}

export default router;
