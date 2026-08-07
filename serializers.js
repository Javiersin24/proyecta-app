// Proyecta — servidor HTTP (API REST)
// Cada módulo del producto es un router aislado y protegido por rol:
//   /api/auth        → login, registro de matrícula, sesión
//   /api/teacher     → módulo del profesor
//   /api/student     → módulo del estudiante
//   /api/admin       → módulo del admin de colegio (ERP)
//   /api/superadmin  → módulo del súper-admin (plataforma)
//   /api/matricula   → portal de matrícula (aspirantes)
//   /api/projector   → emparejar y proyectar
//   /api/chat        → chat 1:1 y grupal (profesor + estudiante)
//   /api/events, /api/reminders → Organizador (eventos del colegio + recordatorios personales)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import superadminRoutes from './routes/superadmin.js';
import matriculaRoutes from './routes/matricula.js';
import projectorRoutes from './routes/projector.js';
import chatRoutes from './routes/chat.js';
import organizerRoutes from './routes/organizer.js';
import uploadRoutes from './routes/upload.js';
import aiRoutes from './routes/ai.js';
import { UPLOAD_DIR } from './upload-dir.js';

const app = express();

// Detrás de nginx: sin esto, los límites por IP verían siempre la del proxy.
app.set('trust proxy', 1);

// CORS restringido a los dominios propios. Se puede ampliar por .env
// (CORS_ORIGINS="https://uno.com,https://dos.com"). Sin configurar, en
// desarrollo se permite todo para no estorbar.
const ORIGENES = (process.env.CORS_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(ORIGENES.length
  ? { origin: (origin, cb) => cb(null, !origin || ORIGENES.includes(origin)) }
  : undefined));

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'proyecta-api', time: new Date().toISOString() }));

// Archivos subidos por usuarios. Segunda barrera contra XSS almacenado (la
// primera es la lista blanca de extensiones en routes/upload.js):
//   · nosniff  → el navegador no adivina el tipo; respeta el declarado.
//   · sandbox  → si algo se colara, se trata como origen aislado y sin scripts.
// No se fuerza la descarga (Content-Disposition: attachment) porque el
// proyector necesita mostrar PDFs, imágenes y video EN PANTALLA; forzarla
// rompería la proyección, que es una función central del producto.
app.use('/api/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; media-src 'self'; object-src 'self'; sandbox");
  },
}));
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/matricula', matriculaRoutes);
app.use('/api/projector', projectorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', organizerRoutes);

// 404 + manejador de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Proyecta API escuchando en http://localhost:${PORT}`));

export default app;
