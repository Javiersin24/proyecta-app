# Proyecta — Backend

API REST del backend de **Proyecta**, la plataforma educativa para colegios que
combina **Classroom + Teams + proyección inalámbrica + ERP de colegio**.

Construido a partir del diseño exportado desde Claude Design (`../project/`). El
modelo de datos y los endpoints reproducen fielmente lo que la UI del prototipo
ya usaba (clases, tareas, entregas, matrícula, sorteo, pagos, proyectores, etc.),
pero ahora con **persistencia real y autenticación**.

## Stack

- **Node.js + Express** — servidor HTTP / API REST
- **Prisma + SQLite** — ORM y base de datos (archivo `prisma/proyecta.db`, sin
  servicios externos; se puede migrar a PostgreSQL cambiando el `datasource`)
- **JWT + bcrypt** — autenticación y autorización por rol

## Puesta en marcha

```bash
cd server
cp .env.example .env
npm install
npm run setup      # genera el cliente Prisma, crea la BD y la siembra con datos demo
npm run dev        # arranca en http://localhost:4000 (con --watch)
```

Otros scripts:

- `npm start` — arranca sin watch
- `npm run db:seed` — vuelve a sembrar
- `npm run db:reset` — borra y recrea la BD desde cero

## Cuentas demo

Todas usan la contraseña **`proyecta123`**.

| Rol | Correo | Módulo / página |
|-----|--------|-----------------|
| Súper-admin | `tu@proyecta.app` | `/superadmin` — gestión de todos los colegios |
| Admin de colegio | `l.fernandez@sanmartin.edu` | `/admin` — ERP del colegio |
| Profesor | `laura.ramirez@colegio.edu` | `/profesor` — aula virtual |
| Estudiante | `ana.m@colegio.edu` | `/estudiante` — clases, tareas, horario |

## Módulos (un router por módulo, protegido por rol)

Cada módulo del producto es un router aislado con su propio middleware de rol —
así el frontend puede tener **una página distinta por módulo**.

| Prefijo | Rol | Contenido |
|---------|-----|-----------|
| `/api/auth` | público | login, registro de matrícula, sesión (`/me`), logout |
| `/api/teacher` | `teacher` | clases, temas, materiales, tareas, calificar entregas |
| `/api/student` | `student` | clases, tareas (pend/entregadas), entrega+deshacer, horario, notas |
| `/api/admin` | `admin` | cuentas, matrícula+sorteo, aulas/grupos+horarios, profesores, pagos, asistencia, notas (solo lectura) |
| `/api/superadmin` | `superadmin` | colegios, cuentas por colegio, proyectores, facturación (MRR/ARR), suscripciones |
| `/api/matricula` | `enrollee`/`student` | portal de matrícula: estado, pago en línea, entrar al panel |
| `/api/projector` | autenticado | emparejar y proyectar en un toque; pantalla pública del proyector |
| `/api/chat` | autenticado | chat 1:1 y grupal (profesor ↔ estudiante) |

## Endpoints principales

### Auth
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` → sesión actual (+ colegio y estado de matrícula)
- `POST /api/auth/signup-matricula` → registro público; llena **todo** el
  formulario (estudiante, acudiente, salud, colegio anterior) **antes** de pagar.
  Crea una cuenta `enrollee` con acceso **solo** al portal de matrícula.
- `POST /api/auth/logout`

### Profesor
- `GET /api/teacher/classes` · `GET /api/teacher/classes/:id`
- `POST /api/teacher/classes` · `POST .../:id/topics` · `POST /topics/:id/materials`
- `POST .../:id/posts` (feed) · `POST .../:id/tasks`
- `PATCH /api/teacher/tasks/:taskId/submissions/:subId` `{ grade }` — **solo el
  profesor califica**
- `PUT /api/teacher/groups/:groupId/grade` — nota consolidada del colegio

### Estudiante
- `GET /api/student/classes` · `GET /api/student/tasks` (pendientes/completadas)
- `POST /api/student/tasks/:id/submit` `{ file }` · `POST .../:id/undo`
  (deshacer envío mientras no esté calificada)
- `GET /api/student/horario` (semanal + profesores) · `GET /api/student/calificaciones`

### Admin de colegio (ERP)
- `GET /api/admin/overview` · `GET /api/admin/accounts?role=teacher|student`
- `GET/POST/PATCH /api/admin/profesores`
- `GET /api/admin/matricula` · `PATCH /api/admin/matricula/config`
  (abrir/cerrar, fechas, cupos y nº de grupos por grado)
- `POST /api/admin/matricula/:id/pagar` (pago manual)
- `POST /api/admin/matricula/sorteo` `{ grado }` — reparte aleatoriamente a los
  pagados en grupos, asigna aula/materias/profesores (según capacidad) y
  promueve sus cuentas a `student`
- `GET/POST /api/admin/aulas` · `GET/POST/PATCH /api/admin/grupos` ·
  `POST/DELETE .../:id/horario`
- `GET /api/admin/grupos/:id/calificaciones` (**solo lectura**)
- `PUT /api/admin/grupos/:id/asistencia`
- `GET/POST/PATCH /api/admin/pagos`

### Súper-admin
- `GET /api/superadmin/overview`
- `GET/POST/PATCH/DELETE /api/superadmin/colegios` (suspender, plan, renovación)
- `GET /api/superadmin/cuentas?q=` (agrupadas por colegio) ·
  `POST .../:id/reset-password` · `PATCH/DELETE .../:id`
- `GET /api/superadmin/proyectores` (agrupados por colegio, conteo en línea)
- `GET /api/superadmin/facturacion` (MRR, ARR, desglose por plan, renovaciones)

### Proyector
- `GET /api/projector` (del colegio) · `GET /api/projector/:code` (pantalla pública)
- `POST /api/projector/:id/project` `{ fileName }` · `POST /api/projector/:id/stop`

### Chat
- `GET /api/chat` · `GET /api/chat/:id` · `POST /api/chat/:id/messages` ·
  `POST /api/chat/dm` `{ peerId }`

## Reglas de negocio implementadas

Todas provienen de las decisiones del cliente en el chat de diseño:

- **El colegio NO edita notas** — solo el profesor (no hay endpoint de escritura
  de calificaciones bajo `/api/admin`; sí bajo `/api/teacher`).
- **Matrícula antes de pagar** — el aspirante llena el formulario completo y
  obtiene una cuenta con acceso **únicamente** al portal de matrícula hasta ser
  asignado a un grupo.
- **Sorteo automático** — el colegio configura cupos/nº de grupos y fecha; al
  ejecutar el sorteo, el sistema arma los grupos, asigna materias y reparte
  profesores respetando su **capacidad** (grupos que puede atender).
- **Deshacer envío** — el estudiante puede retirar su entrega mientras el
  profesor no la haya calificado.
- **Aislamiento por colegio** — cada rol solo ve datos de su propio colegio; el
  súper-admin ve y administra todos.

## Modelo de datos

Ver `prisma/schema.prisma`. Entidades principales: `School`, `User` (5 roles),
`Subject`, `Grade`, `Room`, `Group` (+`GroupSchedule`, `GroupMember`,
`GradeEntry`, `AttendanceEntry`), `Enrollment`, `MatriculaConfig`, `Payment`,
`Class` (+`Topic`, `Material`, `Post`, `Task`, `Submission`, `ClassMember`),
`Conversation`/`Message`, `Projector`/`ProjectionSession`.

## Notas

- La proyección real (WebRTC/casting) y la pasarela de pago están **simuladas**,
  igual que en el prototipo: se modelan los estados y las sesiones, pero no hay
  hardware ni proveedor de pagos conectado todavía.
- `JWT_SECRET` y `SEED_PASSWORD` se configuran en `.env`. Cámbialos en producción.
