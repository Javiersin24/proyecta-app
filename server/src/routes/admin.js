// Módulo ADMIN DE COLEGIO (ERP): cuentas, matrícula + sorteo, aulas/grupos +
// horarios, profesores, pagos, asistencia y calificaciones (solo lectura).
import { Router } from 'express';
import { prisma, parseJSON, toJSON } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { serializeGroup, GROUP_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired, requireRole('admin'));

const mySchool = (req) => req.user.schoolId;

// ── Resumen / estadísticas ────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  const schoolId = mySchool(req);
  const [students, teachers, projectors, projLive, groups] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: 'student' } }),
    prisma.user.count({ where: { schoolId, role: 'teacher' } }),
    prisma.projector.count({ where: { schoolId } }),
    prisma.projector.count({ where: { schoolId, status: { in: ['live', 'online'] } } }),
    prisma.group.count({ where: { schoolId } }),
  ]);
  const projectors_online = projLive;
  const activity = await prisma.projector.findMany({ where: { schoolId }, take: 6 });
  res.json({
    school: await prisma.school.findUnique({ where: { id: schoolId } }),
    stats: [
      { n: String(students), l: 'Estudiantes' },
      { n: String(teachers), l: 'Profesores' },
      { n: `${projectors_online} / ${projectors}`, l: 'Proyectores en línea' },
      { n: String(groups), l: 'Grupos activos' },
    ],
    activity: activity.map((p) => ({ room: p.name, text: p.activity || '', status: p.status })),
  });
});

// ── Cuentas (seccionadas por rol: profesores / estudiantes) ────────────────
router.get('/accounts', async (req, res) => {
  const schoolId = mySchool(req);
  const role = req.query.role; // teacher | student | undefined
  const where = { schoolId, role: role ? role : { in: ['teacher', 'student'] } };
  const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });
  res.json({ accounts: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, online: u.online })) });
});

// POST /api/admin/accounts  { name, role }  → crea cuenta y genera usuario+contraseña temporal
router.post('/accounts', async (req, res) => {
  const schoolId = mySchool(req);
  const { name, role } = req.body || {};
  if (!name || !['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Nombre y tipo de cuenta (admin/teacher/student) son obligatorios' });
  }
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const usuario = await uniqueUsername(name, school.name);
  const pass = genPassword();
  const bcrypt = (await import('bcryptjs')).default;
  const passwordHash = await bcrypt.hash(pass, 10);
  const user = await prisma.user.create({ data: { schoolId, name, email: usuario, role, passwordHash } });
  res.status(201).json({ account: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }, credentials: { usuario, pass } });
});

// POST /api/admin/accounts/:id/reset-password  → genera y devuelve una nueva contraseña temporal
router.post('/accounts/:id/reset-password', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || user.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const pass = genPassword();
  const bcrypt = (await import('bcryptjs')).default;
  const passwordHash = await bcrypt.hash(pass, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ credentials: { usuario: user.email, pass } });
});

// ── Profesores ─────────────────────────────────────────────────────────────
router.get('/profesores', async (req, res) => {
  const schoolId = mySchool(req);
  const profes = await prisma.user.findMany({ where: { schoolId, role: 'teacher' }, include: { teachSubjects: { include: { subject: true } } } });
  res.json({ profesores: profes.map((p) => ({ id: p.id, name: p.name, email: p.email, capacidad: p.capacidad, materias: p.teachSubjects.map((t) => t.subject.name) })) });
});

router.post('/profesores', async (req, res) => {
  const schoolId = mySchool(req);
  const { name, materias = [], capacidad } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre del profesor obligatorio' });
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const usuario = await uniqueUsername(name, school.name);
  const pass = genPassword();
  const bcrypt = (await import('bcryptjs')).default;
  const passwordHash = await bcrypt.hash(pass, 10);
  const u = await prisma.user.create({ data: { schoolId, name, email: usuario, role: 'teacher', capacidad: Number(capacidad) || 3, passwordHash } });
  for (const m of materias) {
    const subject = await prisma.subject.upsert({ where: { schoolId_name: { schoolId, name: m } }, update: {}, create: { schoolId, name: m } });
    await prisma.teacherSubject.create({ data: { teacherId: u.id, subjectId: subject.id } });
  }
  res.status(201).json({ profesor: { id: u.id, name: u.name, email: u.email, capacidad: u.capacidad, materias }, credentials: { usuario, pass } });
});

router.patch('/profesores/:id', async (req, res) => {
  const { capacidad } = req.body || {};
  const prof = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!prof || prof.schoolId !== mySchool(req) || prof.role !== 'teacher') return res.status(404).json({ error: 'Profesor no encontrado' });
  const u = await prisma.user.update({ where: { id: prof.id }, data: { capacidad: Number(capacidad) } });
  res.json({ profesor: { id: u.id, capacidad: u.capacidad } });
});

// ── Matrícula: configuración + lista + pago manual + sorteo ────────────────
router.get('/matricula', async (req, res) => {
  const schoolId = mySchool(req);
  const [cfg, matriculados, grados] = await Promise.all([
    prisma.matriculaConfig.findUnique({ where: { schoolId } }),
    prisma.enrollment.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } }),
    prisma.grade.findMany({ where: { schoolId }, include: { subjects: { include: { subject: true } } } }),
  ]);
  res.json({
    config: cfg ? { ...cfg, porGrado: parseJSON(cfg.porGrado, {}) } : null,
    matriculados,
    grados: grados.map((g) => ({ name: g.name, materias: g.subjects.map((s) => s.subject.name) })),
  });
});

// POST /api/admin/matricula — inscripción walk-in (el colegio la registra directamente)
router.post('/matricula', async (req, res) => {
  const schoolId = mySchool(req);
  const f = req.body || {};
  if (!f.name || !f.acudiente || !f.grado) return res.status(400).json({ error: 'Estudiante, acudiente y grado son obligatorios' });

  const email = (f.emailAcudiente || `matricula.${Date.now()}@colegio.edu`).toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  const finalEmail = exists ? `matricula.${Date.now()}@colegio.edu` : email;
  const bcrypt = (await import('bcryptjs')).default;
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'proyecta123', 10);
  const account = await prisma.user.create({ data: { name: f.name, email: finalEmail, passwordHash, role: 'enrollee', schoolId } });

  const enrollment = await prisma.enrollment.create({
    data: {
      schoolId, userId: account.id, name: f.name, grado: f.grado,
      fechaNacimiento: f.fechaNacimiento || null, documento: f.documento || null, direccion: f.direccion || null,
      acudiente: f.acudiente, parentesco: f.parentesco || null, telAcudiente: f.telAcudiente || null, emailAcudiente: f.emailAcudiente || null,
      alergias: f.alergias || null, condiciones: f.condiciones || null, eps: f.eps || null,
      emergenciaNombre: f.emergenciaNombre || null, emergenciaTel: f.emergenciaTel || null,
      colegioAnterior: f.colegioAnterior || null, ultimoGrado: f.ultimoGrado || null, boletinNombre: f.boletinNombre || null,
      metodoPago: 'En colegio', status: 'Pendiente',
    },
  });
  res.status(201).json({ enrollment });
});

router.patch('/matricula/config', async (req, res) => {
  const schoolId = mySchool(req);
  const { abierta, fechaInicio, fechaFin, porGrado } = req.body || {};
  const cfg = await prisma.matriculaConfig.findUnique({ where: { schoolId } });
  const data = {};
  if (abierta != null) data.abierta = !!abierta;
  if (fechaInicio !== undefined) data.fechaInicio = fechaInicio;
  if (fechaFin !== undefined) data.fechaFin = fechaFin;
  if (porGrado !== undefined) {
    const current = parseJSON(cfg?.porGrado, {});
    data.porGrado = toJSON({ ...current, ...porGrado });
  }
  const updated = await prisma.matriculaConfig.upsert({ where: { schoolId }, update: data, create: { schoolId, ...data, porGrado: data.porGrado || '{}' } });
  res.json({ config: { ...updated, porGrado: parseJSON(updated.porGrado, {}) } });
});

router.post('/matricula/:id/pagar', async (req, res) => {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
  if (!enrollment || enrollment.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Matriculado no encontrado' });
  const updated = await prisma.enrollment.update({ where: { id: enrollment.id }, data: { status: 'Pagado' } });
  res.json({ enrollment: updated });
});

// POST /api/admin/matricula/sorteo  { grado }
// Reparte aleatoriamente a los matriculados pagados en grupos, asigna aula,
// materias y profesores (respetando su capacidad). Cierra el proceso del grado.
router.post('/matricula/sorteo', async (req, res) => {
  const schoolId = mySchool(req);
  const { grado } = req.body || {};
  const grade = await prisma.grade.findUnique({ where: { schoolId_name: { schoolId, name: grado } }, include: { subjects: { include: { subject: true } } } });
  if (!grade) return res.status(404).json({ error: 'Grado no encontrado' });

  const cfg = await prisma.matriculaConfig.findUnique({ where: { schoolId } });
  const porGrado = parseJSON(cfg?.porGrado, {});
  const c = porGrado[grado] || { cupoPorGrupo: 25, numGrupos: 1 };
  const cupoPorGrupo = c.cupoPorGrupo || 25;
  const numGrupos = c.numGrupos || 1;

  const pagados = await prisma.enrollment.findMany({ where: { schoolId, grado, status: 'Pagado' } });
  if (!pagados.length) return res.status(400).json({ error: 'No hay matriculados pagados para sortear en ese grado' });

  const rooms = await prisma.room.findMany({ where: { schoolId } });
  const materiasGrado = grade.subjects.map((s) => s.subject.name);
  const profes = await prisma.user.findMany({ where: { schoolId, role: 'teacher' }, include: { teachSubjects: { include: { subject: true } } } });

  // Carga actual de cada profesor (# de slots ya asignados).
  const load = {};
  const existingSlots = await prisma.groupSchedule.findMany({ where: { group: { schoolId } } });
  for (const s of existingSlots) if (s.teacherId) load[s.teacherId] = (load[s.teacherId] || 0) + 1;
  const pickProfesor = (materia) => {
    const cand = profes.filter((p) => p.teachSubjects.some((t) => t.subject.name === materia) && (load[p.id] || 0) < (p.capacidad || 0));
    if (!cand.length) return null;
    const chosen = cand[Math.floor(Math.random() * cand.length)];
    load[chosen.id] = (load[chosen.id] || 0) + 1;
    return chosen;
  };

  const shuffled = [...pagados].sort(() => Math.random() - 0.5).slice(0, cupoPorGrupo * numGrupos);
  const letras = ['A', 'B', 'C', 'D', 'E', 'F'];
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const horas = ['08:00', '09:00', '10:00', '11:00', '13:00'];
  const nuevosGrupos = [];

  for (let i = 0; i < numGrupos && i * cupoPorGrupo < shuffled.length; i++) {
    const miembros = shuffled.slice(i * cupoPorGrupo, i * cupoPorGrupo + cupoPorGrupo);
    const room = rooms.length ? rooms[i % rooms.length] : null;
    const group = await prisma.group.create({
      data: { schoolId, gradeId: grade.id, nombre: `${grado}${letras[i]}`, roomId: room?.id || null, tamano: cupoPorGrupo },
    });
    for (const m of miembros) {
      await prisma.groupMember.create({ data: { groupId: group.id, studentName: m.name, studentId: m.userId } });
    }
    for (const [idx, materia] of materiasGrado.entries()) {
      const prof = pickProfesor(materia);
      const subject = grade.subjects.find((s) => s.subject.name === materia)?.subject;
      await prisma.groupSchedule.create({
        data: {
          groupId: group.id, materia, subjectId: subject?.id || null,
          teacherId: prof?.id || null, profesor: prof?.name || 'Sin asignar',
          dia: dias[idx % dias.length], hora: horas[idx % horas.length],
        },
      });
    }
    // Marca a los matriculados como asignados + promueve su cuenta a estudiante.
    for (const m of miembros) {
      await prisma.enrollment.update({ where: { id: m.id }, data: { status: 'Asignado', grupoNombre: group.nombre } });
      if (m.userId) await prisma.user.update({ where: { id: m.userId }, data: { role: 'student' } });
    }
    nuevosGrupos.push(group);
  }

  res.json({ ok: true, gruposCreados: nuevosGrupos.length, grupos: nuevosGrupos.map((g) => g.nombre) });
});

// ── Aulas (rooms) + Grupos + Horarios ──────────────────────────────────────
router.get('/aulas', async (req, res) => {
  const rooms = await prisma.room.findMany({ where: { schoolId: mySchool(req) } });
  res.json({ aulas: rooms });
});

router.post('/aulas', async (req, res) => {
  const { name, building, code } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre del aula obligatorio' });
  const room = await prisma.room.create({ data: { schoolId: mySchool(req), name, building: building || null, code: code || null, status: 'offline' } });
  res.status(201).json({ aula: room });
});

router.get('/grupos', async (req, res) => {
  const groups = await prisma.group.findMany({ where: { schoolId: mySchool(req) }, include: GROUP_INCLUDE });
  res.json({ grupos: groups.map(serializeGroup) });
});

router.get('/grupos/:id', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id }, include: GROUP_INCLUDE });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  res.json({ grupo: serializeGroup(g) });
});

router.post('/grupos', async (req, res) => {
  const schoolId = mySchool(req);
  const { grado, nombre, roomId, tamano } = req.body || {};
  if (!grado || !nombre) return res.status(400).json({ error: 'Grado y nombre del grupo obligatorios' });
  const grade = await prisma.grade.upsert({ where: { schoolId_name: { schoolId, name: grado } }, update: {}, create: { schoolId, name: grado } });
  const g = await prisma.group.create({ data: { schoolId, gradeId: grade.id, nombre, roomId: roomId || null, tamano: Number(tamano) || 25 }, include: GROUP_INCLUDE });
  res.status(201).json({ grupo: serializeGroup(g) });
});

router.patch('/grupos/:id', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  const { tamano, roomId } = req.body || {};
  const data = {};
  if (tamano !== undefined) data.tamano = Number(tamano) || 0;
  if (roomId !== undefined) data.roomId = roomId || null;
  const updated = await prisma.group.update({ where: { id: g.id }, data, include: GROUP_INCLUDE });
  res.json({ grupo: serializeGroup(updated) });
});

router.post('/grupos/:id/horario', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  const { materia, profesorId, dia, hora } = req.body || {};
  if (!materia || !dia || !hora) return res.status(400).json({ error: 'Materia, día y hora obligatorios' });
  const prof = profesorId ? await prisma.user.findUnique({ where: { id: profesorId } }) : null;
  const subject = await prisma.subject.findFirst({ where: { schoolId: g.schoolId, name: materia } });
  const slot = await prisma.groupSchedule.create({
    data: { groupId: g.id, materia, subjectId: subject?.id || null, teacherId: prof?.id || null, profesor: prof?.name || 'Sin asignar', dia, hora },
  });
  res.status(201).json({ slot });
});

router.delete('/grupos/:id/horario/:slotId', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  await prisma.groupSchedule.deleteMany({ where: { id: req.params.slotId, groupId: g.id } });
  res.json({ ok: true });
});

// ── Calificaciones: SOLO LECTURA para el colegio (las edita el profesor) ───
router.get('/grupos/:id/calificaciones', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id }, include: GROUP_INCLUDE });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  const s = serializeGroup(g);
  res.json({ grupo: s.nombre, estudiantes: s.estudiantes, horario: s.horario, calificaciones: s.calificaciones, readOnly: true });
});

// ── Asistencia (el colegio sí la gestiona) ─────────────────────────────────
router.put('/grupos/:id/asistencia', async (req, res) => {
  const g = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!g || g.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Grupo no encontrado' });
  const { studentName, estado } = req.body || {};
  if (!studentName || !estado) return res.status(400).json({ error: 'Estudiante y estado obligatorios' });
  const entry = await prisma.attendanceEntry.upsert({
    where: { groupId_studentName: { groupId: g.id, studentName } },
    update: { estado },
    create: { groupId: g.id, studentName, estado },
  });
  res.json({ entry });
});

// ── Pagos / pensiones ───────────────────────────────────────────────────────
router.get('/pagos', async (req, res) => {
  const pagos = await prisma.payment.findMany({ where: { schoolId: mySchool(req) } });
  res.json({ pagos });
});

router.post('/pagos', async (req, res) => {
  const { student, concepto, monto, vence } = req.body || {};
  if (!student || !concepto) return res.status(400).json({ error: 'Estudiante y concepto obligatorios' });
  const pago = await prisma.payment.create({ data: { schoolId: mySchool(req), student, concepto, monto: Number(monto) || 0, vence: vence || '', status: 'Pendiente' } });
  res.status(201).json({ pago });
});

router.patch('/pagos/:id', async (req, res) => {
  const pago = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!pago || pago.schoolId !== mySchool(req)) return res.status(404).json({ error: 'Pago no encontrado' });
  const { status } = req.body || {};
  const updated = await prisma.payment.update({ where: { id: pago.id }, data: { status: status || pago.status } });
  res.json({ pago: updated });
});

const slugName = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.');

// Genera una contraseña temporal legible (para entregar al crear/restablecer una cuenta).
function genPassword() {
  const adj = ['Aula', 'Faro', 'Luz', 'Nube', 'Rio', 'Sol', 'Mar', 'Eco'];
  const n = Math.floor(1000 + Math.random() * 9000);
  return adj[Math.floor(Math.random() * adj.length)] + n;
}

// Genera un usuario único (nombre.apellido@colegio) evitando colisiones.
async function uniqueUsername(name, schoolName) {
  const domain = slugName(schoolName).replace(/\.+/g, '') + '.edu';
  const base = slugName(name).replace(/\.+$/, '');
  let candidate = `${base}@${domain}`;
  let i = 1;
  while (await prisma.user.findUnique({ where: { email: candidate } })) {
    candidate = `${base}${++i}@${domain}`;
  }
  return candidate;
}

export default router;
