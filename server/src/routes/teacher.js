// Módulo del PROFESOR: sus clases (salones), temas, materiales, tareas,
// publicaciones en el feed, y calificación de entregas.
import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma, toJSON, parseJSON } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeClass, serializeTask, CLASS_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired, requireRole('teacher'));

// El Excel a importar se procesa en memoria (no se guarda en disco).
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// PUT /api/teacher/classes/:classId/asistencia/bulk  { date?, registros: {studentName: estado} }
// Guarda la asistencia de todos los estudiantes marcados de una vez. Solo se
// guardan los que el profesor marcó — los no marcados NO crean registro.
router.put('/classes/:classId/asistencia/bulk', ownClass, async (req, res) => {
  const date = req.body?.date || todayISO();
  const registros = req.body?.registros || {};
  const valid = new Set(['Presente', 'Tarde', 'Ausente']);
  const entries = Object.entries(registros).filter(([name, estado]) => name && valid.has(estado));
  await prisma.$transaction(entries.map(([studentName, estado]) =>
    prisma.classAttendanceEntry.upsert({
      where: { classId_studentName_date: { classId: req.params.classId, studentName, date } },
      update: { estado },
      create: { classId: req.params.classId, studentName, date, estado },
    })
  ));
  res.json({ ok: true, saved: entries.length });
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

// ── Importar / exportar el libro de notas en Excel ──────────────────────────

// GET /api/teacher/classes/:classId/gradebook/export  → .xlsx del libro actual,
// que también sirve de PLANTILLA (trae los estudiantes y columnas de hoy; el
// profesor solo llena/edita notas y lo vuelve a subir). Si está vacío, entrega
// una plantilla de ejemplo.
router.get('/classes/:classId/gradebook/export', ownClass, async (req, res) => {
  const gb = parseJSON(req.class.gradebook, null);
  const cols = [];
  if (gb?.cats) gb.cats.forEach((cat) => cat.cols.forEach((col) => cols.push({ id: col.id, header: `${cat.name} · ${col.label}` })));

  let aoa;
  if (gb?.rows?.length && cols.length) {
    aoa = [['Estudiante', ...cols.map((c) => c.header)]];
    gb.rows.forEach((r) => aoa.push([r.name, ...cols.map((c) => { const v = gb.grades[`${r.id}::${c.id}`]; return v == null || v === '' ? '' : v; })]));
  } else {
    // Plantilla de ejemplo cuando aún no hay libro.
    aoa = [
      ['Estudiante', 'Taller 1', 'Taller 2', 'Quiz 1', 'Examen'],
      ['María Fernanda Ríos', 4.5, 4.0, 3.8, 4.2],
      ['Carlos Andrés Mora', 3.2, 3.5, 2.9, 3.1],
    ];
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = aoa[0].map((_, i) => ({ wch: i === 0 ? 26 : 14 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Notas');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const safe = (req.class.name || 'clase').replace(/[^\w\-]+/g, '_').slice(0, 40);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="notas_${safe}.xlsx"`);
  res.send(buf);
});

// POST /api/teacher/classes/:classId/gradebook/import  (multipart, campo "file")
// Parsea el Excel/CSV y devuelve una VISTA PREVIA (no guarda nada). El frontend
// la combina con el libro existente y guarda con el PUT normal.
router.post('/classes/:classId/gradebook/import', ownClass, (req, res) => {
  memUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 5 MB' : 'No se pudo leer el archivo' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    let wb;
    try { wb = XLSX.read(req.file.buffer, { type: 'buffer' }); } catch { return res.status(400).json({ error: 'No pude leer el archivo. Asegúrate de que sea un Excel (.xlsx) o CSV válido.' }); }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return res.status(400).json({ error: 'El archivo no tiene ninguna hoja con datos.' });
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
    if (aoa.length < 2) return res.status(400).json({ error: 'Se espera una fila de encabezados y al menos un estudiante.' });

    const header = (aoa[0] || []).map((h) => String(h).trim());
    const columns = header.slice(1).map((h) => h.trim()).filter(Boolean);
    if (!columns.length) return res.status(400).json({ error: 'La primera fila debe tener: "Estudiante" y luego el nombre de cada evaluación.' });

    const students = [];
    let maxVal = 0;
    for (let i = 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      const name = String(row[0] ?? '').trim();
      if (!name) continue;
      const grades = {};
      columns.forEach((label, ci) => {
        const raw = row[ci + 1];
        if (raw === '' || raw === undefined || raw === null) return;
        const num = parseFloat(String(raw).replace(',', '.'));
        if (Number.isFinite(num)) { grades[label] = String(num); if (num > maxVal) maxVal = num; }
      });
      students.push({ name, grades });
    }
    if (!students.length) return res.status(400).json({ error: 'No encontré nombres de estudiantes en la primera columna.' });

    res.json({ preview: { columns, students, scaleWarning: maxVal > 5 } });
  });
});

// ── Inteligencia Académica (Premium) ────────────────────────────────────────
// Un solo endpoint que devuelve, para TODAS las clases del profesor, el paquete
// que la analítica del frontend necesita (notas + asistencia + tareas). Así el
// navegador hace 1 llamada en vez de N y corre los cálculos localmente.
router.get('/intelligence', async (req, res) => {
  if (!req.user.premium) return res.status(403).json({ error: 'Función Premium. Suscríbete a Inteligencia Académica para usarla.', code: 'PREMIUM_REQUIRED' });
  const classes = await prisma.class.findMany({ where: { teacherId: req.user.id }, include: CLASS_INCLUDE });
  const out = [];
  for (const c of classes) {
    const s = serializeClass(c, { includeStudents: true });
    // Asistencia: historial (todos los días con registros) + hoy
    const entries = await prisma.classAttendanceEntry.findMany({ where: { classId: c.id }, orderBy: { date: 'desc' } });
    const byDate = {};
    for (const e of entries) (byDate[e.date] ||= {})[e.studentName] = e.estado;
    const historial = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map((date) => ({ date, registros: byDate[date] }));
    const hoy = byDate[todayISO()] || {};
    out.push({
      id: s.id, name: s.name, section: s.section, teacher: s.teacher,
      students: s.students || [], tasks: s.tasks || [],
      gradebook: parseJSON(c.gradebook, null),
      attendanceHistorial: historial, asistencia: hoy,
    });
  }
  res.json({ classes: out });
});

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(3)}-${pick(3)}`;
}

export default router;
