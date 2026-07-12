// Eventos (anuncios programados del colegio) y Recordatorios personales —
// usados por el "Organizador" de profesores y estudiantes.
import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired, requireRole } from '../auth.js';

const router = Router();
router.use(authRequired);

// ── Eventos: visibles a todo el colegio, los publican profesores/admin ─────

router.get('/events', async (req, res) => {
  if (!req.user.schoolId) return res.json({ events: [] });
  const events = await prisma.event.findMany({ where: { schoolId: req.user.schoolId }, orderBy: { date: 'asc' } });
  res.json({ events });
});

router.post('/events', requireRole('teacher', 'admin'), async (req, res) => {
  const { title, date, time, desc, tipo } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: 'Título y fecha son obligatorios' });
  const event = await prisma.event.create({
    data: { schoolId: req.user.schoolId, title, date, time: time || null, desc: desc || null, tipo: tipo || 'General', createdBy: req.user.name },
  });
  res.status(201).json({ event });
});

router.delete('/events/:id', requireRole('teacher', 'admin'), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event || event.schoolId !== req.user.schoolId) return res.status(404).json({ error: 'Evento no encontrado' });
  await prisma.event.delete({ where: { id: event.id } });
  res.json({ ok: true });
});

// ── Recordatorios: personales, solo el dueño los ve ─────────────────────────

router.get('/reminders', async (req, res) => {
  const reminders = await prisma.reminder.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ reminders });
});

router.post('/reminders', async (req, res) => {
  const { text, date } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'El recordatorio no puede estar vacío' });
  const reminder = await prisma.reminder.create({ data: { userId: req.user.id, text: text.trim(), date: date || null } });
  res.status(201).json({ reminder });
});

router.patch('/reminders/:id', async (req, res) => {
  const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
  if (!reminder || reminder.userId !== req.user.id) return res.status(404).json({ error: 'Recordatorio no encontrado' });
  const data = {};
  if (req.body?.done !== undefined) data.done = !!req.body.done;
  if (req.body?.text !== undefined) data.text = req.body.text;
  const updated = await prisma.reminder.update({ where: { id: reminder.id }, data });
  res.json({ reminder: updated });
});

router.delete('/reminders/:id', async (req, res) => {
  const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
  if (!reminder || reminder.userId !== req.user.id) return res.status(404).json({ error: 'Recordatorio no encontrado' });
  await prisma.reminder.delete({ where: { id: reminder.id } });
  res.json({ ok: true });
});

export default router;
