// Subida de archivos reales (materiales, adjuntos de tareas, entregas de
// estudiantes). Se guardan en disco y se sirven como estáticos en
// /api/uploads/:archivo — cualquier usuario autenticado puede subir.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authRequired } from '../auth.js';
import { UPLOAD_DIR } from '../upload-dir.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12);
    cb(null, `${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const EXT_KIND = {
  pdf: 'pdf',
  doc: 'docx', docx: 'docx',
  ppt: 'slides', pptx: 'slides',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
  mp4: 'video', mov: 'video', webm: 'video', avi: 'video', mkv: 'video',
};
function inferKind(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return EXT_KIND[ext] || 'docx';
}

const router = Router();
router.use(authRequired);

// POST /api/upload  (multipart, campo "file") → { name, kind, url, sizeKB }
router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 25 MB' : 'No se pudo subir el archivo' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    // Ruta relativa: el frontend le antepone el origen del backend (https).
    // Así evitamos devolver http:// detrás del proxy y romper la descarga.
    res.status(201).json({
      name: req.file.originalname, kind: inferKind(req.file.originalname),
      url: `/api/uploads/${req.file.filename}`,
      sizeKB: Math.max(1, Math.round(req.file.size / 1024)),
    });
  });
});

export default router;
