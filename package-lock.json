// Chat 1:1 y grupal — compartido por profesores y estudiantes.
import { Router } from 'express';
import { prisma } from '../db.js';
import { authRequired } from '../auth.js';
import { serializeConversation, CONVO_INCLUDE } from '../serializers.js';

const router = Router();
router.use(authRequired);

// GET /api/chat  → todas mis conversaciones
router.get('/', async (req, res) => {
  const links = await prisma.conversationParticipant.findMany({
    where: { userId: req.user.id },
    include: { conversation: { include: CONVO_INCLUDE } },
  });
  const convos = links
    .map((l) => serializeConversation(l.conversation, req.user.id))
    .sort((a, b) => new Date(b.lastWhen || 0) - new Date(a.lastWhen || 0));
  res.json({ chats: convos });
});

// GET /api/chat/:id  → una conversación (marca como leídos los mensajes recibidos)
router.get('/:id', async (req, res) => {
  const link = await prisma.conversationParticipant.findFirst({ where: { conversationId: req.params.id, userId: req.user.id } });
  if (!link) return res.status(404).json({ error: 'Conversación no encontrada' });
  await prisma.message.updateMany({ where: { conversationId: req.params.id, senderId: { not: req.user.id }, read: false }, data: { read: true } });
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id }, include: CONVO_INCLUDE });
  res.json({ chat: serializeConversation(convo, req.user.id) });
});

// POST /api/chat/:id/messages  { text }
router.post('/:id/messages', async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
  const link = await prisma.conversationParticipant.findFirst({ where: { conversationId: req.params.id, userId: req.user.id } });
  if (!link) return res.status(404).json({ error: 'Conversación no encontrada' });
  await prisma.message.create({ data: { conversationId: req.params.id, senderId: req.user.id, text: text.trim() } });
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id }, include: CONVO_INCLUDE });
  res.status(201).json({ chat: serializeConversation(convo, req.user.id) });
});

// POST /api/chat/dm  { peerId }  → crea (o reutiliza) una conversación 1:1
router.post('/dm', async (req, res) => {
  const { peerId, className } = req.body || {};
  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer) return res.status(404).json({ error: 'Destinatario no encontrado' });

  // ¿Ya existe una DM entre ambos?
  const mine = await prisma.conversationParticipant.findMany({ where: { userId: req.user.id }, select: { conversationId: true } });
  const theirs = await prisma.conversationParticipant.findMany({ where: { userId: peerId }, select: { conversationId: true } });
  const shared = mine.map((m) => m.conversationId).find((id) => theirs.some((t) => t.conversationId === id));
  let convoId = shared;
  if (!convoId) {
    const convo = await prisma.conversation.create({
      data: {
        kind: 'dm', className: className || null,
        participants: { create: [{ userId: req.user.id }, { userId: peerId }] },
      },
    });
    convoId = convo.id;
  }
  const full = await prisma.conversation.findUnique({ where: { id: convoId }, include: CONVO_INCLUDE });
  res.status(201).json({ chat: serializeConversation(full, req.user.id) });
});

export default router;
