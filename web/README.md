# Proyecta — Frontend

Aplicación React (Vite) que implementa las 4 páginas por rol descritas en el
diseño de `project/`: **Profesor**, **Estudiante**, **Admin de colegio** y
**Súper-admin** — más el login, el portal de matrícula y la pantalla pública
del proyector. Consume la API de `../server`.

## Puesta en marcha

```bash
cd web
npm install
npm run dev   # http://localhost:5173 — asume que el backend corre en :4000
```

En desarrollo, Vite hace proxy de `/api/*` hacia `http://localhost:4000`
(ver `vite.config.js`). En producción, sirve el build estático y configura
tu backend detrás de la misma URL o ajusta la config del proxy de tu hosting.

## Estructura

- `src/theme.css` — tokens de diseño (colores, tipografía, espaciado), portados
  tal cual del prototipo.
- `src/ui/` — kit de componentes compartido (Icon, TopBar, TabBar, SideNav,
  ClassCard, MaterialRow, etc.) y el `AppLayout` responsive (TabBar en móvil,
  SideNav en escritorio).
- `src/lib/` — cliente API (`api.js`), sesión (`AuthContext.jsx`), guardas de
  ruta por rol (`RequireRole.jsx`) y el estado de "qué se está proyectando"
  (`ProjectingContext.jsx`).
- `src/pages/auth/` — Login, registro público de matrícula, portal de matrícula.
- `src/pages/teacher/`, `src/pages/student/` — aula virtual por rol.
- `src/pages/admin/` — ERP del colegio (cuentas, matrícula+sorteo, aulas y
  grupos, profesores, pagos).
- `src/pages/superadmin/` — panel de la plataforma (colegios, cuentas por
  colegio, proyectores por colegio, facturación).
- `src/pages/projector/` — pantalla pública que se instala en el proyector
  (`/proyector/:code`), sin login, con sondeo cada 3s para detectar cuando
  alguien empieza a proyectar.
- `src/pages/shared/` — chat (lista + hilo), hoja de "Proyectar" (un toque),
  franja de "proyectando ahora".

## Rutas por rol

| Rol | Ruta base |
|---|---|
| Profesor | `/profesor` |
| Estudiante | `/estudiante` |
| Admin de colegio | `/admin` |
| Súper-admin | `/superadmin` |
| Matrícula (aspirante) | `/matricula` |
| Proyector (pantalla del aula) | `/proyector/:code` |

## Build de producción

```bash
npm run build   # genera dist/
npm run preview # sirve el build localmente para probarlo
```
