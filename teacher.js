// Serializadores: convierten registros Prisma a la forma que espera la UI
// (rehidratando los campos JSON y agregando conteos derivados).
import { prisma, parseJSON } from './db.js';

export function serializeMaterial(m) {
  return { id: m.id, kind: m.kind, name: m.name, meta: m.meta, url: m.url, thumb: m.thumb, author: m.author, when: m.createdAt };
}

export function serializeTask(t) {
  const submissions = (t.submissions || []).map((s) => ({
    id: s.id,
    student: s.student?.name || s.studentId,
    studentId: s.studentId,
    status: s.status,
    grade: s.grade,
    comment: s.comment,
    file: parseJSON(s.file),
  }));
  const submitted = t._count?.submissions ?? submissions.filter((s) => s.status === 'done' || s.status === 'late').length;
  return {
    id: t.id, title: t.title, desc: t.desc, due: t.due, dueDate: t.dueDate, status: t.status,
    points: t.points, total: t.total,
    rubric: parseJSON(t.rubric),
    files: parseJSON(t.files, []),
    submitted,
    submissions,
  };
}

export function serializePost(p) {
  return { id: p.id, author: p.author, when: p.when, kind: p.kind, body: p.body, attachment: parseJSON(p.attachment) };
}

// Estructura de una clase con temas + materiales agrupados por tema (materials[topicId]).
export function serializeClass(c, { includeStudents = false } = {}) {
  const topics = (c.topics || []).map((t) => ({
    id: t.id, name: t.name, accent: t.accent, order: t.order,
    count: (t.materials || []).length,
  }));
  const materials = {};
  for (const t of c.topics || []) materials[t.id] = (t.materials || []).map(serializeMaterial);

  const out = {
    id: c.id, name: c.name, section: c.section, code: c.code, paletteIdx: c.paletteIdx,
    teacher: c.teacher ? { id: c.teacher.id, name: c.teacher.name, email: c.teacher.email } : null,
    studentCount: c._count?.members ?? (c.members ? c.members.length : undefined),
    // El "proyector de esta clase" es el salón actual del profesor (ver
    // User.currentProjectorId) — el mismo para todas sus clases, y el mismo
    // que ven sus estudiantes: siempre están juntos en clase.
    projectorId: c.teacher?.currentProjectorId || null,
    projector: c.teacher?.currentProjector
      ? { id: c.teacher.currentProjector.id, name: c.teacher.currentProjector.name, aula: c.teacher.currentProjector.aula, status: c.teacher.currentProjector.status, enabled: c.teacher.currentProjector.enabled, linked: c.teacher.currentProjector.linked }
      : null,
    pending: (c.tasks || []).filter((t) => t.status !== 'done').length,
    topics,
    materials,
    feed: (c.posts || []).map(serializePost),
    tasks: (c.tasks || []).map(serializeTask),
  };
  if (includeStudents) {
    out.students = (c.members || []).map((m) => ({ id: m.student.id, name: m.student.name, email: m.student.email, online: m.student.online }));
  }
  return out;
}

// Include estándar para traer una clase completa.
export const CLASS_INCLUDE = {
  teacher: { include: { currentProjector: true } },
  topics: { include: { materials: true }, orderBy: { order: 'asc' } },
  posts: { orderBy: { createdAt: 'desc' } },
  tasks: { include: { submissions: { include: { student: true } } } },
  members: { include: { student: true } },
  _count: { select: { members: true } },
};

// Conversación → forma de chat de la UI, desde el punto de vista de `meId`.
export function serializeConversation(convo, meId) {
  const peers = convo.participants.filter((p) => p.userId !== meId).map((p) => p.user);
  const peer = peers[0];
  const messages = convo.messages.map((m) => ({
    id: m.id,
    from: m.senderId === meId ? 'me' : 'peer',
    text: m.text,
    at: m.createdAt,
    unread: m.senderId !== meId && !m.read,
  }));
  const last = convo.messages[convo.messages.length - 1];
  const unread = convo.messages.filter((m) => m.senderId !== meId && !m.read).length;
  return {
    id: convo.id,
    kind: convo.kind,
    peerId: peer?.id,
    peerName: peer?.name || convo.className || 'Chat',
    peerRole: peer?.role,
    className: convo.className,
    online: peer?.online || false,
    unread,
    last: last?.text || '',
    lastWhen: last?.createdAt || null,
    messages,
  };
}

export const CONVO_INCLUDE = {
  participants: { include: { user: true } },
  messages: { orderBy: { createdAt: 'asc' } },
};

// Grupo (aula/salón administrativo) con horario, roster, notas y asistencia.
export function serializeGroup(g) {
  return {
    id: g.id,
    grado: g.grade?.name,
    nombre: g.nombre,
    aula: g.room?.name || null,
    roomId: g.roomId,
    tamano: g.tamano,
    estudiantes: (g.memberships || []).map((m) => m.studentName),
    horario: (g.schedule || []).map((h) => ({
      id: h.id, materia: h.materia, profesorId: h.teacherId, profesor: h.profesor, dia: h.dia, hora: h.hora,
    })),
    calificaciones: Object.fromEntries((g.grades || []).map((e) => [`${e.materia}|${e.studentName}`, e.valor])),
    asistencia: Object.fromEntries((g.attendance || []).map((e) => [e.studentName, e.estado])),
  };
}

export const GROUP_INCLUDE = {
  grade: true, room: true, memberships: true,
  schedule: { orderBy: { hora: 'asc' } }, grades: true, attendance: true,
};
