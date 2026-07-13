// Borra TODO lo creado por seedDemoIntelligence.js (clases "[DEMO] …" y los
// estudiantes de prueba "@proyecta-demo.local"). No toca ninguna clase,
// estudiante ni cuenta real.
import { PrismaClient } from '@prisma/client';
import { DEMO_PREFIX, DEMO_EMAIL_DOMAIN } from './demoConstants.js';

const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({ where: { name: { startsWith: DEMO_PREFIX } } });
  for (const c of classes) await prisma.class.delete({ where: { id: c.id } });
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_DOMAIN } } });
  console.log(`✅ Datos de prueba eliminados: ${classes.length} clase(s), ${count} estudiante(s) demo.`);
}

main()
  .catch((e) => { console.error('❌ Error limpiando datos de prueba:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
