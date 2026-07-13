// Proyecta — siembra de datos demo
// Reproduce fielmente el estado inicial del prototipo (PROYECTA_DATA,
// PROYECTA_ADMIN_DATA, PROYECTA_SUPER_DATA) sobre la base de datos real.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PW = process.env.SEED_PASSWORD || 'proyecta123';

async function main() {
  console.log('🌱 Sembrando Proyecta…');

  // Limpieza total (orden inverso a las dependencias no hace falta con cascade,
  // pero borramos las raíces para un reset limpio).
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.projectionSession.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.task.deleteMany();
  await prisma.material.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.post.deleteMany();
  await prisma.classMember.deleteMany();
  await prisma.class.deleteMany();
  await prisma.gradeEntry.deleteMany();
  await prisma.attendanceEntry.deleteMany();
  await prisma.groupSchedule.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.gradeSubject.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.projector.deleteMany();
  await prisma.matriculaConfig.deleteMany();
  await prisma.projector.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  const hash = await bcrypt.hash(PW, 10);
  const mkUser = (data) => prisma.user.create({ data: { ...data, passwordHash: hash } });

  // ── Súper-admin (dueño de la plataforma) ─────────────────────────────────
  await mkUser({ name: 'Tú', email: 'tu@proyecta.app', role: 'superadmin' });

  // ── Colegios (PROYECTA_SUPER_DATA.schools) ───────────────────────────────
  const schoolsSeed = [
    { name: 'Colegio San Martín', city: 'Bogotá', plan: 'Plantel', status: 'Activo', desde: '2024-02-15', renueva: '2026-02-15' },
    { name: 'Liceo del Norte', city: 'Medellín', plan: 'Plantel', status: 'Activo', desde: '2024-06-01', renueva: '2026-06-01' },
    { name: 'Universidad Central del Valle', city: 'Cali', plan: 'Campus', status: 'Activo', desde: '2023-08-10', renueva: '2026-08-10' },
    { name: 'Instituto Técnico Sur', city: 'Cali', plan: 'Aula', status: 'Activo', desde: '2025-01-20', renueva: '2026-01-20' },
    { name: 'Gimnasio Los Cerros', city: 'Bogotá', plan: 'Aula', status: 'Prueba', desde: '2026-06-25', renueva: '2026-07-25' },
  ];
  const schools = {};
  for (const s of schoolsSeed) {
    const created = await prisma.school.create({
      data: {
        name: s.name, city: s.city, plan: s.plan, status: s.status,
        subscriptionStart: new Date(s.desde), subscriptionRenew: new Date(s.renueva),
      },
    });
    schools[s.name] = created;
  }
  const sanMartin = schools['Colegio San Martín'];

  // Cuentas de otros colegios (para que el súper-admin las agrupe por colegio)
  const otherAccounts = [
    { name: 'Rodrigo Uribe', email: 'r.uribe@liceodelnorte.edu', role: 'admin', school: 'Liceo del Norte', status: 'Activa' },
    { name: 'Marcela Toro', email: 'm.toro@liceodelnorte.edu', role: 'teacher', school: 'Liceo del Norte', status: 'Activa' },
    { name: 'Sebastián Ospina', email: 's.ospina@ucv.edu', role: 'admin', school: 'Universidad Central del Valle', status: 'Activa' },
    { name: 'Paula Jiménez', email: 'p.jimenez@itsur.edu', role: 'admin', school: 'Instituto Técnico Sur', status: 'Suspendida' },
    { name: 'Felipe Aguirre', email: 'f.aguirre@loscerros.edu', role: 'student', school: 'Gimnasio Los Cerros', status: 'Activa' },
  ];
  for (const a of otherAccounts) {
    await mkUser({ name: a.name, email: a.email, role: a.role, status: a.status, schoolId: schools[a.school].id });
  }

  // ── Config de matrícula del San Martín ──────────────────────────────────
  const materiasPorGrado = {
    '6°': ['Matemáticas', 'Español', 'Ciencias Naturales', 'Inglés'],
    '8°': ['Matemáticas', 'Español', 'Física', 'Inglés'],
    '10°': ['Matemáticas', 'Física', 'Química', 'Español', 'Inglés'],
  };
  await prisma.matriculaConfig.create({
    data: {
      schoolId: sanMartin.id, abierta: true, fechaInicio: '2026-06-01', fechaFin: '2026-08-31',
      porGrado: JSON.stringify(Object.fromEntries(Object.keys(materiasPorGrado).map((g) => [g, { cupoPorGrupo: 25, numGrupos: 2 }]))),
    },
  });

  // ── Materias, grados y sus vínculos ─────────────────────────────────────
  const allSubjectNames = [...new Set(Object.values(materiasPorGrado).flat())];
  const subjects = {};
  for (const name of allSubjectNames) {
    subjects[name] = await prisma.subject.create({ data: { schoolId: sanMartin.id, name } });
  }
  const grades = {};
  for (const [gname, subs] of Object.entries(materiasPorGrado)) {
    const g = await prisma.grade.create({ data: { schoolId: sanMartin.id, name: gname } });
    grades[gname] = g;
    for (const sn of subs) {
      await prisma.gradeSubject.create({ data: { gradeId: g.id, subjectId: subjects[sn].id } });
    }
  }

  // ── Aulas (PROYECTA_ADMIN_DATA.rooms) ───────────────────────────────────
  const roomsSeed = [
    { name: 'Aula 204', building: 'Edificio B', code: '7B3K', status: 'live' },
    { name: 'Aula 101', building: 'Edificio A', code: '4QZK', status: 'online' },
    { name: 'Lab de Ciencias', building: 'Edificio B', code: 'M8V2', status: 'online' },
    { name: 'Auditorio', building: 'Edificio C', code: 'P5R1', status: 'offline' },
  ];
  const rooms = {};
  for (const r of roomsSeed) {
    rooms[r.name] = await prisma.room.create({ data: { schoolId: sanMartin.id, ...r } });
  }

  // ── Admin del colegio + profesores ──────────────────────────────────────
  await mkUser({ name: 'Lucía Fernández', email: 'l.fernandez@sanmartin.edu', role: 'admin', schoolId: sanMartin.id });

  const profesSeed = [
    { name: 'Laura Ramírez', email: 'laura.ramirez@colegio.edu', materias: ['Matemáticas', 'Física'], capacidad: 4 },
    { name: 'Mateo Silva', email: 'mateo.silva@colegio.edu', materias: ['Español'], capacidad: 3 },
    { name: 'Carla Nieto', email: 'carla.nieto@colegio.edu', materias: ['Inglés'], capacidad: 5 },
    { name: 'Jorge Salazar', email: 'jorge.salazar@colegio.edu', materias: ['Ciencias Naturales', 'Química'], capacidad: 3 },
  ];
  const profes = {};
  for (const p of profesSeed) {
    const u = await mkUser({ name: p.name, email: p.email, role: 'teacher', schoolId: sanMartin.id, capacidad: p.capacidad });
    profes[p.name] = u;
    for (const m of p.materias) {
      if (subjects[m]) await prisma.teacherSubject.create({ data: { teacherId: u.id, subjectId: subjects[m].id } });
    }
  }

  // ── Estudiantes del San Martín (roster de las clases + grupo 10°B) ──────
  const studentsSeed = [
    { name: 'Ana Martínez', email: 'ana.m@colegio.edu', online: true },
    { name: 'Bruno Gómez', email: 'bruno.g@colegio.edu', online: true },
    { name: 'Camila Ríos', email: 'camila.r@colegio.edu', status: 'Invitada' },
    { name: 'Diego Torres', email: 'diego.t@colegio.edu', online: true },
    { name: 'Elena Vargas', email: 'elena.v@colegio.edu' },
    { name: 'Felipe Aguirre', email: 'felipe.a@colegio.edu' },
    { name: 'Gabriela Peña', email: 'gabi.p@colegio.edu' },
    { name: 'Héctor Silva', email: 'hector.s@colegio.edu', online: true },
  ];
  const students = {};
  for (const st of studentsSeed) {
    students[st.name] = await mkUser({
      name: st.name, email: st.email, role: 'student', schoolId: sanMartin.id,
      online: !!st.online, status: st.status || 'Activa',
    });
  }

  // ── Grupo 10°B con horario, calificaciones y asistencia ─────────────────
  const grupo10b = await prisma.group.create({
    data: {
      schoolId: sanMartin.id, gradeId: grades['10°'].id, nombre: '10°B',
      roomId: rooms['Aula 204'].id, tamano: 25,
    },
  });
  const roster10b = ['Ana Martínez', 'Bruno Gómez', 'Camila Ríos', 'Diego Torres', 'Elena Vargas'];
  for (const n of roster10b) {
    await prisma.groupMember.create({ data: { groupId: grupo10b.id, studentName: n, studentId: students[n]?.id || null } });
  }
  const horario10b = [
    { materia: 'Matemáticas', profesor: 'Laura Ramírez', dia: 'Lunes', hora: '10:00' },
    { materia: 'Física', profesor: 'Laura Ramírez', dia: 'Miércoles', hora: '08:00' },
    { materia: 'Química', profesor: 'Jorge Salazar', dia: 'Martes', hora: '09:00' },
    { materia: 'Español', profesor: 'Mateo Silva', dia: 'Jueves', hora: '11:00' },
    { materia: 'Inglés', profesor: 'Carla Nieto', dia: 'Viernes', hora: '13:00' },
  ];
  for (const h of horario10b) {
    await prisma.groupSchedule.create({
      data: {
        groupId: grupo10b.id, materia: h.materia, profesor: h.profesor, dia: h.dia, hora: h.hora,
        subjectId: subjects[h.materia]?.id || null, teacherId: profes[h.profesor]?.id || null,
      },
    });
  }
  const califs = { 'Ana Martínez': 4.2, 'Bruno Gómez': 3.6, 'Camila Ríos': 3.1, 'Diego Torres': 2.8, 'Elena Vargas': 4.5 };
  for (const [name, valor] of Object.entries(califs)) {
    await prisma.gradeEntry.create({ data: { groupId: grupo10b.id, materia: 'Matemáticas', studentName: name, valor } });
  }
  const asis = { 'Ana Martínez': 'Presente', 'Bruno Gómez': 'Presente', 'Camila Ríos': 'Tarde', 'Diego Torres': 'Ausente', 'Elena Vargas': 'Presente' };
  for (const [name, estado] of Object.entries(asis)) {
    await prisma.attendanceEntry.create({ data: { groupId: grupo10b.id, studentName: name, estado } });
  }

  // ── Matriculados (grado 6°) ─────────────────────────────────────────────
  const matriculadosSeed = [
    { name: 'Sofía Herrera', grado: '6°', acudiente: 'Marta Herrera', metodoPago: 'En línea', status: 'Pendiente' },
    { name: 'Nicolás Prada', grado: '6°', acudiente: 'Luis Prada', metodoPago: 'En colegio', status: 'Pagado' },
    { name: 'Valeria Duarte', grado: '6°', acudiente: 'Clara Duarte', metodoPago: 'En línea', status: 'Pagado' },
    { name: 'Simón Rey', grado: '6°', acudiente: 'Paola Rey', metodoPago: 'En línea', status: 'Pagado' },
    { name: 'Isabella Cano', grado: '6°', acudiente: 'Iván Cano', metodoPago: 'En colegio', status: 'Pagado' },
    { name: 'Mateo Osorio', grado: '6°', acudiente: 'Diana Osorio', metodoPago: 'En línea', status: 'Pendiente' },
    { name: 'Emilia Rojas', grado: '6°', acudiente: 'Carlos Rojas', metodoPago: 'En línea', status: 'Pagado' },
    { name: 'Samuel Vega', grado: '6°', acudiente: 'Marcela Vega', metodoPago: 'En colegio', status: 'Pagado' },
  ];
  for (const [i, m] of matriculadosSeed.entries()) {
    // Cuenta del matriculado: solo se le habilita el portal de matrícula
    const acc = await mkUser({
      name: m.name, email: `matricula${i + 1}@sanmartin.edu`, role: 'enrollee', schoolId: sanMartin.id,
    });
    await prisma.enrollment.create({
      data: { schoolId: sanMartin.id, userId: acc.id, name: m.name, grado: m.grado, acudiente: m.acudiente, metodoPago: m.metodoPago, status: m.status },
    });
  }

  // ── Pagos / pensiones ───────────────────────────────────────────────────
  const pagosSeed = [
    { student: 'Ana Martínez', concepto: 'Pensión julio', monto: 450000, vence: '31 jul', status: 'Pendiente' },
    { student: 'Bruno Gómez', concepto: 'Pensión julio', monto: 450000, vence: '31 jul', status: 'Pagado' },
    { student: 'Camila Ríos', concepto: 'Pensión junio', monto: 450000, vence: '30 jun', status: 'Vencido' },
    { student: 'Diego Torres', concepto: 'Matrícula 2026', monto: 1200000, vence: '15 ene', status: 'Pagado' },
  ];
  for (const p of pagosSeed) await prisma.payment.create({ data: { schoolId: sanMartin.id, ...p } });

  // ── Proyectores (agrega los del San Martín + otros colegios) ────────────
  const projectorsSeed = [
    { name: 'Aula 204', aula: 'Aula 204', code: '7B3K', school: 'Colegio San Martín', status: 'live', activity: 'Proyectando: Funciones cuadráticas.pptx' },
    { name: 'Lab de Ciencias', aula: 'Lab de Ciencias', code: 'M8V2', school: 'Colegio San Martín', status: 'online', activity: 'En línea · sin actividad' },
    { name: 'Auditorio', aula: 'Auditorio', code: 'P5R1', school: 'Colegio San Martín', status: 'offline', activity: 'Sin conexión desde ayer' },
    { name: 'Aula 101', aula: 'Aula 101', code: '4QZK', school: 'Liceo del Norte', status: 'online', activity: 'En línea · sin actividad' },
    { name: 'Aula 305', aula: 'Aula 305', code: 'L3P9', school: 'Liceo del Norte', status: 'live', activity: 'Proyectando: Guía de laboratorio.pdf' },
    { name: 'Auditorio Central', aula: 'Auditorio Central', code: 'UCV1', school: 'Universidad Central del Valle', status: 'online', activity: 'En línea · sin actividad' },
    { name: 'Sala 12', aula: 'Sala 12', code: 'ITS7', school: 'Instituto Técnico Sur', status: 'offline', activity: 'Sin conexión desde el lunes' },
    { name: 'Aula 3', aula: 'Aula 3', code: 'GLC4', school: 'Gimnasio Los Cerros', status: 'online', activity: 'En línea · sin actividad' },
  ];
  for (const p of projectorsSeed) {
    await prisma.projector.create({
      data: {
        schoolId: schools[p.school].id, name: p.name, aula: p.aula, code: p.code,
        status: p.status, activity: p.activity, linked: true, enabled: true,
      },
    });
  }

  // ── Clases / aula virtual (PROYECTA_DATA.classes) ───────────────────────
  await seedClasses({ prisma, school: sanMartin, profes, students, group10b: grupo10b });

  // ── Chats demo (Laura ↔ estudiantes) ────────────────────────────────────
  await seedChats({ prisma, laura: profes['Laura Ramírez'], students });

  // ── Eventos del colegio (Organizador) ───────────────────────────────────
  const eventosSeed = [
    { title: 'Entrega de proyectos de Física', date: '2026-07-15', time: '10:00', desc: 'Exposición final de los proyectos en el laboratorio. Trae tu maqueta y la presentación.', tipo: 'Académico' },
    { title: 'Reunión de padres 10°B', date: '2026-07-18', time: '17:00', desc: 'Entrega de boletines del primer semestre y espacio de preguntas.', tipo: 'Reunión' },
    { title: 'Salida pedagógica al museo', date: '2026-07-24', time: '08:00', desc: 'Punto de encuentro en la portería. Recuerda el permiso firmado y el almuerzo.', tipo: 'Salida' },
  ];
  for (const e of eventosSeed) {
    await prisma.event.create({ data: { schoolId: sanMartin.id, createdBy: profes['Laura Ramírez'].name, ...e } });
  }

  // ── Recordatorios personales de ejemplo (Ana Martínez) ──────────────────
  const remindersSeed = [
    { text: 'Repasar capítulo 4 antes del quiz', date: '2026-07-12', done: false },
    { text: 'Comprar materiales para la maqueta', date: '2026-07-14', done: false },
    { text: 'Enviar consentimiento de la salida', date: null, done: true },
  ];
  if (students['Ana Martínez']) {
    for (const r of remindersSeed) {
      await prisma.reminder.create({ data: { userId: students['Ana Martínez'].id, ...r } });
    }
  }

  const totalUsers = await prisma.user.count();
  console.log(`✅ Listo. ${Object.keys(schools).length} colegios, ${totalUsers} cuentas.`);
  console.log(`🔑 Contraseña demo para todas las cuentas: "${PW}"`);
}

async function seedClasses({ prisma, school, profes, students }) {
  const RUBRIC_BASIC = [
    { id: 'cr_a', name: 'Procedimiento', points: 50, desc: 'Pasos correctos y completos.' },
    { id: 'cr_b', name: 'Resultado', points: 30, desc: 'Respuestas finales correctas.' },
    { id: 'cr_c', name: 'Presentación', points: 20, desc: 'Orden, claridad, ortografía.' },
  ];
  const RUBRIC_PROJECT = [
    { id: 'cr1', name: 'Claridad de la exposición', points: 25, desc: 'Estructura, voz y ritmo.' },
    { id: 'cr2', name: 'Aplicación matemática', points: 35, desc: 'Uso correcto de funciones al problema.' },
    { id: 'cr3', name: 'Apoyo visual', points: 20, desc: 'Slides, gráficas, ejemplos.' },
    { id: 'cr4', name: 'Trabajo en equipo', points: 20, desc: 'Coordinación y participación.' },
  ];

  // Profesor Mateo Silva imparte "Taller de Lectura"
  const mateo = profes['Mateo Silva'];
  const laura = profes['Laura Ramírez'];

  // ── Matemáticas 10°B ──────────────────────────────────────────────────
  const c1 = await prisma.class.create({
    data: { schoolId: school.id, name: 'Matemáticas 10°B', section: 'Semestre 1', code: '7XK-P2M', paletteIdx: 0, teacherId: laura.id },
  });
  const c1roster = ['Ana Martínez', 'Bruno Gómez', 'Camila Ríos', 'Diego Torres', 'Elena Vargas', 'Felipe Aguirre', 'Gabriela Peña', 'Héctor Silva'];
  for (const n of c1roster) if (students[n]) await prisma.classMember.create({ data: { classId: c1.id, studentId: students[n].id } });

  const topics = {
    t_cuad: await prisma.topic.create({ data: { classId: c1.id, name: 'Funciones cuadráticas', accent: 'coral', order: 0 } }),
    t_lineal: await prisma.topic.create({ data: { classId: c1.id, name: 'Funciones lineales', accent: 'teal', order: 1 } }),
    t_intro: await prisma.topic.create({ data: { classId: c1.id, name: 'Introducción a las funciones', accent: 'indigo', order: 2 } }),
  };
  const materials = [
    { t: 't_intro', kind: 'pdf', name: 'Capítulo 4 · Funciones.pdf', meta: '12 págs · 2.4 MB' },
    { t: 't_intro', kind: 'slides', name: 'Intro a funciones.pptx', meta: '18 slides · 6.1 MB' },
    { t: 't_intro', kind: 'youtube', name: '¿Qué es una función? · Khan Academy', meta: 'YouTube · 9:42', url: 'https://youtu.be/example' },
    { t: 't_intro', kind: 'image', name: 'Dominio y rango · pizarra.jpg', meta: 'Foto · 1.1 MB' },
    { t: 't_lineal', kind: 'canva', name: 'Funciones lineales · Canva', meta: 'canva.com · 14 páginas', url: 'https://canva.com/example' },
    { t: 't_lineal', kind: 'docx', name: 'Apuntes pendiente y corte.docx', meta: '5 págs · 340 KB' },
    { t: 't_lineal', kind: 'link', name: 'Graficador interactivo · Desmos', meta: 'desmos.com', url: 'https://desmos.com' },
    { t: 't_cuad', kind: 'slides', name: 'Parábolas y vértice.pptx', meta: '22 slides · 7.4 MB' },
    { t: 't_cuad', kind: 'video', name: 'Ejercicio resuelto · vídeo clase.mp4', meta: 'MP4 · 11:08 · 128 MB' },
  ];
  for (const m of materials) {
    await prisma.material.create({ data: { topicId: topics[m.t].id, kind: m.kind, name: m.name, meta: m.meta, url: m.url || null, author: 'Laura Ramírez' } });
  }

  await prisma.post.create({
    data: {
      classId: c1.id, author: 'Laura Ramírez', when: 'Hoy · 08:40', kind: 'task',
      body: 'Nueva tarea publicada: Ejercicios capítulo 4. Revisen la presentación antes de empezar.',
      attachment: JSON.stringify({ id: 'f1', name: 'Capítulo 4 · Funciones.pdf', kind: 'pdf', size: '2.4 MB', meta: 'Clase de hoy' }),
    },
  });
  await prisma.post.create({
    data: { classId: c1.id, author: 'Laura Ramírez', when: 'Ayer · 14:10', body: 'Mañana repasamos los ejercicios en pizarra. Lleguen puntual, por favor.' },
  });

  // Tarea 1 con entregas reales
  const t1 = await prisma.task.create({
    data: {
      classId: c1.id, title: 'Ejercicios capítulo 4',
      desc: 'Resolver los problemas 1 a 8 de las págs. 72–74. Entrega en PDF o foto del cuaderno.',
      due: 'Vence hoy · 18:00', status: 'dueSoon', points: 20, total: 28,
      rubric: JSON.stringify(RUBRIC_BASIC),
      files: JSON.stringify([{ id: 'f1', name: 'Capítulo 4 · Funciones.pdf', kind: 'pdf', size: '2.4 MB', meta: 'Material de apoyo' }]),
    },
  });
  const subs = [
    { student: 'Ana Martínez', status: 'done', grade: null, file: { id: 'sub1', name: 'ana-cap4.pdf', kind: 'pdf', size: '880 KB', meta: 'Entregada 16:22' } },
    { student: 'Bruno Gómez', status: 'done', grade: 18, file: { id: 'sub2', name: 'bruno.jpg', kind: 'img', size: '1.2 MB', meta: 'Entregada 17:10' } },
    { student: 'Camila Ríos', status: 'late', grade: null, file: { id: 'sub3', name: 'camila.pdf', kind: 'pdf', size: '620 KB', meta: 'Entregada tarde' } },
    { student: 'Diego Torres', status: 'pending', grade: null, file: null },
    { student: 'Elena Vargas', status: 'done', grade: 20, file: { id: 'sub4', name: 'elena.pdf', kind: 'pdf', size: '1.1 MB', meta: 'Entregada 15:05' } },
    { student: 'Felipe Aguirre', status: 'pending', grade: null, file: null },
  ];
  for (const s of subs) {
    if (!students[s.student]) continue;
    await prisma.submission.create({
      data: { taskId: t1.id, studentId: students[s.student].id, status: s.status, grade: s.grade, file: s.file ? JSON.stringify(s.file) : null },
    });
  }
  await prisma.task.create({
    data: {
      classId: c1.id, title: 'Prueba corta · Ecuaciones', desc: 'Prueba de 10 preguntas sobre ecuaciones lineales.',
      due: 'Martes 28 · 10:00', status: 'pending', points: 10, total: 28,
      files: JSON.stringify([{ id: 'f2', name: 'Guía de estudio.pdf', kind: 'pdf', size: '1.8 MB', meta: 'Preparación' }]),
    },
  });
  await prisma.task.create({
    data: {
      classId: c1.id, title: 'Proyecto trimestral', desc: 'Presentación de 5 min sobre una aplicación real de las funciones.',
      due: 'Entregada · vie 10', status: 'done', points: 100, total: 28, rubric: JSON.stringify(RUBRIC_PROJECT),
      files: JSON.stringify([
        { id: 'f3', name: 'Rúbrica proyecto.pdf', kind: 'pdf', size: '340 KB', meta: 'Rúbrica' },
        { id: 'f4', name: 'Ejemplos 2024.pptx', kind: 'slides', size: '6.1 MB', meta: 'Referencia' },
      ]),
    },
  });

  // ── Física 11°A ───────────────────────────────────────────────────────
  const c2 = await prisma.class.create({
    data: { schoolId: school.id, name: 'Física 11°A', section: 'Semestre 1', code: 'M3D-8QR', paletteIdx: 1, teacherId: laura.id },
  });
  for (const n of ['Ana Martínez', 'Diego Torres']) if (students[n]) await prisma.classMember.create({ data: { classId: c2.id, studentId: students[n].id } });
  const tc = await prisma.topic.create({ data: { classId: c2.id, name: 'Cinemática', accent: 'indigo', order: 0 } });
  await prisma.material.create({ data: { topicId: tc.id, kind: 'pdf', name: 'Movimiento rectilíneo.pdf', meta: '8 págs · 1.4 MB', author: 'Laura Ramírez' } });
  await prisma.material.create({ data: { topicId: tc.id, kind: 'youtube', name: 'MRU explicado · PhysicsLab', meta: 'YouTube · 7:12', author: 'Laura Ramírez' } });

  // ── Taller de Lectura (prof. Mateo) ───────────────────────────────────
  const c3 = await prisma.class.create({
    data: { schoolId: school.id, name: 'Taller de Lectura', section: 'Tardes · 16:00', code: 'K9P-T44', paletteIdx: 4, teacherId: mateo.id },
  });
  if (students['Ana Martínez']) await prisma.classMember.create({ data: { classId: c3.id, studentId: students['Ana Martínez'].id } });
  const tm = await prisma.topic.create({ data: { classId: c3.id, name: 'Mitos y leyendas', accent: 'violet', order: 0 } });
  await prisma.material.create({ data: { topicId: tm.id, kind: 'docx', name: 'Lectura guía · El coronel.docx', meta: '6 págs · 210 KB', author: 'Mateo Silva' } });
  await prisma.material.create({ data: { topicId: tm.id, kind: 'canva', name: 'Ficha de análisis · Canva', meta: 'canva.com', author: 'Mateo Silva' } });
}

async function seedChats({ prisma, laura, students }) {
  const mkDM = async (peerUser, className, msgs) => {
    if (!peerUser) return;
    const convo = await prisma.conversation.create({ data: { kind: 'dm', className } });
    await prisma.conversationParticipant.create({ data: { conversationId: convo.id, userId: laura.id } });
    await prisma.conversationParticipant.create({ data: { conversationId: convo.id, userId: peerUser.id } });
    for (const m of msgs) {
      await prisma.message.create({
        data: { conversationId: convo.id, senderId: m.from === 'teacher' ? laura.id : peerUser.id, text: m.text, read: !m.unread },
      });
    }
  };
  await mkDM(students['Ana Martínez'], 'Matemáticas 10°B', [
    { from: 'student', text: 'Buenas tardes profe' },
    { from: 'student', text: 'Tengo una duda sobre el ejercicio 5' },
    { from: 'teacher', text: 'Claro Ana, ¿qué parte no entiendes?' },
    { from: 'student', text: 'El dominio de la función. ¿Profe, entrego hoy o mañana?', unread: true },
  ]);
  await mkDM(students['Bruno Gómez'], 'Matemáticas 10°B', [
    { from: 'teacher', text: 'Bruno, tu entrega quedó con 18/20' },
    { from: 'student', text: 'Gracias profe 🙌' },
  ]);
  await mkDM(students['Camila Ríos'], 'Matemáticas 10°B', [
    { from: 'student', text: '¿Puedo reenviar la tarea?', unread: true },
  ]);
  await mkDM(students['Diego Torres'], 'Física 11°A', [
    { from: 'student', text: 'Listo profe' },
  ]);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
