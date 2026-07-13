// Siembra datos de PRUEBA (clases, estudiantes, notas, asistencia, tareas)
// bajo un profesor real que ya exista, solo para poder probar el módulo de
// Inteligencia Académica / Asistente IA con datos que tengan variedad.
//
// Uso:  node prisma/seedDemoIntelligence.js correo-del-profesor@ejemplo.com
//
// Es re-ejecutable: si ya existían datos de una corrida anterior, los borra
// primero. Todo lo que crea está marcado con el prefijo "[DEMO] " en el
// nombre de la clase y con el dominio "@proyecta-demo.local" en los correos
// de los estudiantes falsos, para que sea fácil identificarlo y borrarlo
// (ver prisma/cleanupDemoIntelligence.js).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEMO_PREFIX, DEMO_EMAIL_DOMAIN } from './demoConstants.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo1234';

const STUDENTS = [
  'Camila Torres', 'Andrés Gómez', 'Valentina Ruiz', 'Santiago Pérez',
  'Isabella Rodríguez', 'Mateo Herrera', 'Sofía Castro', 'Juan Diego Molina',
];

// Perfiles variados a propósito: para que la IA tenga de todo (riesgo alto,
// medio y bajo) cuando el profesor pregunte por sus estudiantes.
const PERFILES = [
  { base: 1.8, ausencias: 3, tareasFaltantes: 2 }, // riesgo alto
  { base: 2.3, ausencias: 2, tareasFaltantes: 1 }, // riesgo alto
  { base: 2.9, ausencias: 1, tareasFaltantes: 1 }, // riesgo medio
  { base: 3.1, ausencias: 1, tareasFaltantes: 0 }, // riesgo medio
  { base: 3.8, ausencias: 0, tareasFaltantes: 0 }, // bien
  { base: 4.2, ausencias: 0, tareasFaltantes: 0 }, // bien
  { base: 4.6, ausencias: 0, tareasFaltantes: 0 }, // excelente
  { base: 4.0, ausencias: 1, tareasFaltantes: 0 }, // bien
];

const CLASES = [
  {
    name: `${DEMO_PREFIX}Matemáticas 8B`, section: '8B',
    cats: ['Talleres', 'Tareas', 'Quizzes', 'Examen parcial'],
    tareas: ['Taller de fracciones', 'Quiz de ecuaciones', 'Examen parcial de álgebra'],
  },
  {
    name: `${DEMO_PREFIX}Ciencias Naturales 8B`, section: '8B',
    cats: ['Laboratorios', 'Tareas', 'Quizzes'],
    tareas: ['Informe de laboratorio', 'Quiz de ecosistemas', 'Tarea sobre fotosíntesis'],
  },
];

let seq = 0;
const mkId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function weekdaysBack(count) {
  const out = [];
  let n = 0;
  while (out.length < count) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    n++;
  }
  return out.reverse(); // más antiguo primero
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(3)}-${pick(3)}`;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node prisma/seedDemoIntelligence.js correo-del-profesor@ejemplo.com');
    process.exit(1);
  }
  const teacher = await prisma.user.findUnique({ where: { email } });
  if (!teacher || teacher.role !== 'teacher') {
    console.error(`❌ No encontré un profesor con el correo "${email}". Revisa que sea exacto (mayúsculas/minúsculas no importan, pero sí el dominio).`);
    process.exit(1);
  }

  console.log(`🧪 Sembrando datos de prueba para ${teacher.name} (${email})…`);

  // Limpieza de una corrida anterior (re-ejecutable sin duplicar).
  const oldClasses = await prisma.class.findMany({ where: { teacherId: teacher.id, name: { startsWith: DEMO_PREFIX } } });
  for (const c of oldClasses) await prisma.class.delete({ where: { id: c.id } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const students = [];
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = await prisma.user.create({
      data: {
        name: STUDENTS[i],
        email: `demo.estudiante${i + 1}${DEMO_EMAIL_DOMAIN}`,
        passwordHash: hash,
        role: 'student',
        schoolId: teacher.schoolId,
      },
    });
    students.push(s);
  }

  const dias = weekdaysBack(10);

  for (const clsSeed of CLASES) {
    const cls = await prisma.class.create({
      data: { schoolId: teacher.schoolId, name: clsSeed.name, section: clsSeed.section, code: randomCode(), teacherId: teacher.id },
    });

    await prisma.classMember.createMany({ data: students.map((s) => ({ classId: cls.id, studentId: s.id })) });

    // ── Gradebook: notas variando según el perfil de riesgo de cada estudiante ──
    const cats = clsSeed.cats.map((name) => ({
      id: mkId('cat'), name,
      cols: [{ id: mkId('c'), label: `${name} 1` }, { id: mkId('c'), label: `${name} 2` }],
    }));
    const rows = students.map((s) => ({ id: mkId('r'), name: s.name }));
    const grades = {};
    students.forEach((s, i) => {
      const perfil = PERFILES[i];
      cats.forEach((cat, catI) => {
        cat.cols.forEach((col, colI) => {
          const ruido = Math.sin(i * 7 + catI * 3 + colI * 5) * 0.4;
          const valor = Math.max(0, Math.min(5, perfil.base + ruido));
          grades[`${rows[i].id}::${col.id}`] = valor.toFixed(1);
        });
      });
    });
    await prisma.class.update({ where: { id: cls.id }, data: { gradebook: JSON.stringify({ cats, rows, grades }) } });

    // ── Asistencia: últimos 10 días hábiles, con ausencias concentradas en los estudiantes en riesgo ──
    const attendanceRows = [];
    students.forEach((s, i) => {
      const perfil = PERFILES[i];
      let ausencias = 0, tardes = 0;
      dias.forEach((date, di) => {
        let estado = 'Presente';
        if (ausencias < perfil.ausencias && di % 3 === 0) { estado = 'Ausente'; ausencias++; }
        else if (tardes < 1 && di % 4 === 1) { estado = 'Tarde'; tardes++; }
        attendanceRows.push({ classId: cls.id, studentName: s.name, date, estado });
      });
    });
    await prisma.classAttendanceEntry.createMany({ data: attendanceRows });

    // ── Tareas + entregas: los estudiantes en riesgo dejan tareas sin entregar ──
    for (const [ti, titulo] of clsSeed.tareas.entries()) {
      const dueDate = dias[Math.max(0, dias.length - 1 - ti * 2)];
      const task = await prisma.task.create({
        data: {
          classId: cls.id, title: titulo, due: `Venció el ${dueDate}`, dueDate,
          status: 'done', points: 100, total: students.length,
        },
      });
      for (const [i, s] of students.entries()) {
        const perfil = PERFILES[i];
        const faltaEsta = ti >= clsSeed.tareas.length - perfil.tareasFaltantes;
        if (faltaEsta) continue; // no entregó — queda "pending" (sin Submission)
        const tarde = perfil.ausencias >= 2 && ti === 0;
        const ruido = Math.sin(i * 11 + ti * 4) * 0.4;
        const grade = Math.max(0, Math.min(5, perfil.base + ruido));
        await prisma.submission.create({
          data: { taskId: task.id, studentId: s.id, status: tarde ? 'late' : 'done', grade: Number(grade.toFixed(1)) },
        });
      }
    }

    console.log(`  ✔ ${cls.name} — ${students.length} estudiantes, ${clsSeed.tareas.length} tareas, ${dias.length} días de asistencia`);
  }

  console.log('\n✅ Listo. Entra como este profesor → Inteligencia, o a cualquiera de las 2 clases → pestaña Análisis.');
  console.log(`   (Los estudiantes de prueba tienen contraseña "${DEMO_PASSWORD}" por si quieres entrar como alguno.)`);
  console.log('   Para borrar todo esto luego: node prisma/cleanupDemoIntelligence.js');
}

main()
  .catch((e) => { console.error('❌ Error sembrando datos de prueba:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
