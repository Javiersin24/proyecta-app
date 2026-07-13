// Borra TODOS los datos (de prueba o reales) y deja la plataforma en cero,
// con una única cuenta de súper-admin para volver a entrar.
// Uso:  RESET_ADMIN_EMAIL=correo@dominio.com node prisma/reset.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const EMAIL = (process.env.RESET_ADMIN_EMAIL || '').toLowerCase().trim();
const NAME = process.env.RESET_ADMIN_NAME || 'Súper-admin';

function genPassword() {
  const adj = ['Aula', 'Faro', 'Luz', 'Nube', 'Rio', 'Sol', 'Mar', 'Eco'];
  const n = Math.floor(1000 + Math.random() * 9000);
  return adj[Math.floor(Math.random() * adj.length)] + n;
}

async function main() {
  if (!EMAIL) {
    console.error('Falta RESET_ADMIN_EMAIL. Uso: RESET_ADMIN_EMAIL=correo@dominio.com node prisma/reset.js');
    process.exit(1);
  }

  console.log('🧹 Borrando todos los datos…');
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
  // Antes de borrar los proyectores, se limpia el vínculo "salón actual" de
  // cada profesor para no chocar con la restricción de la base de datos.
  await prisma.user.updateMany({ data: { currentProjectorId: null } });
  await prisma.projector.deleteMany();
  await prisma.matriculaConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  const pass = genPassword();
  const passwordHash = await bcrypt.hash(pass, 10);
  await prisma.user.create({ data: { name: NAME, email: EMAIL, passwordHash, role: 'superadmin' } });

  console.log('✅ Listo. La plataforma quedó en cero.');
  console.log('   Usuario: ' + EMAIL);
  console.log('   Contraseña: ' + pass);
  console.log('   (Cámbiala desde Ajustes en cuanto entres.)');
}

main().finally(() => prisma.$disconnect());
