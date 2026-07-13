// Cliente Prisma único, compartido por toda la app.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Helpers de (de)serialización para los campos JSON guardados como texto.
export const parseJSON = (v, fallback = null) => {
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
};
export const toJSON = (v) => (v == null ? null : JSON.stringify(v));
