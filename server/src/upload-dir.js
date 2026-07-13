// Carpeta donde se guardan los archivos subidos (materiales, adjuntos,
// entregas). Vive fuera de src/ para no mezclarse con el código y persiste
// entre despliegues (no se toca con git pull).
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
