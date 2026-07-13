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
import { UPLOAD_DIR } from './upload-dir.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'proyecta-api', time: new Date().toISOString() }));

app.use('/api/uploads', express.static(UPLOAD_DIR));
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/matricula', matriculaRoutes);
app.use('/api/projector', projectorRoutes);
app.use('/api/chat', chatRoutes);
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
