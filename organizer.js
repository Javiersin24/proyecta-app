// Subida de archivos reales (materiales, adjuntos de tareas, entregas de
// estudiantes). Se guardan en disco y se sirven como estáticos en
// /api/uploads/:archivo — cualquier usuario autenticado puede subir.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authRequired } from '../auth.js';
import { UPLOAD_DIR } from '../upload-dir.js';

// Lista blanca de extensiones. Es una lista blanca (no negra) a propósito:
// cualquier tipo no contemplado se rechaza en vez de colarse.
//
// Se excluyen deliberadamente .html, .htm, .svg, .xml, .js y similares: esos
// archivos se sirven desde el mismo origen que la API, así que un archivo con
// JavaScript dentro podría ejecutarse en ese origen y robar la sesión de quien
// lo abra (XSS almacenado).
const EXT_PERMITIDAS = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'rtf', 'odt', 'odp', 'ods',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic',
  'mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v',
  'mp3', 'wav', 'm4a', 'ogg',
  'zip',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // La extensión se normaliza y se toma de la lista blanca ya validada.
    const ext = path.extname(file.originalname).slice(1, 6).toLowerCase().replace(/[^a-z0-9]/g, '');
    cb(null, `${crypto.randomBytes(12).toString('hex')}${ext ? '.' + ext : ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!EXT_PERMITIDAS.has(ext)) {
      const err = new Error('TIPO_NO_PERMITIDO');
      err.code = 'TIPO_NO_PERMITIDO';
      return cb(err);
    }
    cb(null, true);
  },
});

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
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El archivo supera el límite de 25 MB' });
      if (err.code === 'TIPO_NO_PERMITIDO') return res.status(400).json({ error: 'Ese tipo de archivo no está permitido. Puedes subir documentos (PDF, Word, PowerPoint, Excel), imágenes, audio o video.' });
      return res.status(400).json({ error: 'No se pudo subir el archivo' });
    }
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
