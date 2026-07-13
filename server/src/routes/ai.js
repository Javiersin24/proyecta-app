// Asistente IA (Inteligencia Académica Premium). El frontend arma el contexto
// (system) con los datos reales de las clases del profesor y manda la
// conversación; aquí se reenvía a Claude (Anthropic) usando la clave del
// servidor. La clave NUNCA se expone al cliente.
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authRequired, requireRole } from '../auth.js';

const router = Router();
router.use(authRequired, requireRole('teacher'));

// Modelo configurable; por defecto el recomendado. El colegio/dueño puede
// bajarlo a uno más económico en el .env si lo desea.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Límite de uso en memoria por profesor: 40 mensajes por hora, para acotar el
// costo si alguien abusa del chat. Se reinicia al reiniciar el servidor.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map(); // userId -> [timestamps]

function rateLimited(userId) {
  const now = Date.now();
  const arr = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) { hits.set(userId, arr); return true; }
  arr.push(now); hits.set(userId, arr); return false;
}

// POST /api/ai/assistant  { system, messages:[{role,content}] } → { reply }
router.post('/assistant', async (req, res) => {
  if (!req.user.premium) return res.status(403).json({ error: 'Función Premium. Suscríbete a Inteligencia Académica.', code: 'PREMIUM_REQUIRED' });
  if (!anthropic) return res.status(503).json({ error: 'El asistente IA no está configurado en el servidor. Falta ANTHROPIC_API_KEY.' });
  if (rateLimited(req.user.id)) return res.status(429).json({ error: 'Alcanzaste el límite de preguntas por ahora. Intenta de nuevo en un rato.' });

  const { system, messages } = req.body || {};
  if (!system || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'Faltan datos de la conversación' });
  }
  // Solo aceptamos roles válidos y contenido de texto; acotamos tamaño.
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'La conversación debe terminar en una pregunta del usuario' });
  }

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: String(system).slice(0, 12000),
      messages: clean,
    });
    const reply = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    res.json({ reply: reply || 'No obtuve respuesta. Intenta reformular la pregunta.' });
  } catch (e) {
    console.error('AI assistant error:', e?.message || e);
    res.status(502).json({ error: 'No pude conectarme con el asistente en este momento. Intenta de nuevo en unos segundos.' });
  }
});

export default router;
