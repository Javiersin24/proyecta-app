import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import { ProjectingProvider } from './lib/ProjectingContext.jsx';
import RequireRole, { HOME_BY_ROLE } from './lib/RequireRole.jsx';
import AppLayout from './ui/AppLayout.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import MatriculaPortalPage from './pages/auth/MatriculaPortalPage.jsx';

import TeacherHome from './pages/teacher/Home.jsx';
import TeacherClass from './pages/teacher/ClassScreen.jsx';
import TeacherTopic from './pages/teacher/TopicScreen.jsx';
import TeacherTask from './pages/teacher/TaskScreen.jsx';
import TeacherGrade from './pages/teacher/GradeScreen.jsx';
import TeacherTasksOverview from './pages/teacher/TasksOverview.jsx';
import TeacherChatList from './pages/teacher/ChatList.jsx';
import TeacherChatThread from './pages/teacher/ChatThread.jsx';
import TeacherSettings from './pages/teacher/Settings.jsx';

import StudentHome from './pages/student/Home.jsx';
import StudentClass from './pages/student/ClassScreen.jsx';
import StudentTopic from './pages/student/TopicScreen.jsx';
import StudentTask from './pages/student/TaskScreen.jsx';
import StudentTasksOverview from './pages/student/TasksOverview.jsx';
import StudentHorario from './pages/student/HorarioScreen.jsx';
import StudentChatList from './pages/student/ChatList.jsx';
import StudentChatThread from './pages/student/ChatThread.jsx';
import StudentSettings from './pages/student/Settings.jsx';

import AdminResumen from './pages/admin/Resumen.jsx';
import AdminCuentas from './pages/admin/Cuentas.jsx';
import AdminProfesores from './pages/admin/Profesores.jsx';
import AdminMatricula from './pages/admin/Matricula.jsx';
import AdminPagos from './pages/admin/Pagos.jsx';
import AdminAulasGrupos from './pages/admin/AulasGrupos.jsx';
import AdminGrupoDetail from './pages/admin/GrupoDetail.jsx';

import SuperFacturacion from './pages/superadmin/Facturacion.jsx';
import SuperColegios from './pages/superadmin/Colegios.jsx';
import SuperCuentas from './pages/superadmin/Cuentas.jsx';
import SuperProyectores from './pages/superadmin/Proyectores.jsx';

import ProjectorDisplay from './pages/projector/ProjectorDisplay.jsx';

const TEACHER_NAV = [
  { id: 'home', label: 'Inicio', icon: 'home', to: '/profesor' },
  { id: 'tasks', label: 'Tareas', icon: 'clipboard', to: '/profesor/tareas' },
  { id: 'chat', label: 'Chat', icon: 'chat', to: '/profesor/chat' },
  { id: 'settings', label: 'Ajustes', icon: 'settings', to: '/profesor/ajustes' },
];
const STUDENT_NAV = [
  { id: 'home', label: 'Inicio', icon: 'home', to: '/estudiante' },
  { id: 'tasks', label: 'Tareas', icon: 'clipboard', to: '/estudiante/tareas' },
  { id: 'horario', label: 'Horario', icon: 'calendar', to: '/estudiante/horario' },
  { id: 'chat', label: 'Chat', icon: 'chat', to: '/estudiante/chat' },
  { id: 'settings', label: 'Ajustes', icon: 'settings', to: '/estudiante/ajustes' },
];
const ADMIN_NAV = [
  { id: 'resumen', label: 'Resumen', icon: 'home', to: '/admin' },
  { id: 'cuentas', label: 'Cuentas', icon: 'users', to: '/admin/cuentas' },
  { id: 'profesores', label: 'Profesores', icon: 'book', to: '/admin/profesores' },
  { id: 'matricula', label: 'Matrícula', icon: 'clipboard', to: '/admin/matricula' },
  { id: 'pagos', label: 'Pagos', icon: 'card', to: '/admin/pagos' },
  { id: 'aulas', label: 'Aulas y grupos', icon: 'calendar', to: '/admin/aulas-grupos' },
];
const SUPER_NAV = [
  { id: 'facturacion', label: 'Ingresos', icon: 'chart', to: '/superadmin' },
  { id: 'colegios', label: 'Colegios', icon: 'home', to: '/superadmin/colegios' },
  { id: 'cuentas', label: 'Cuentas', icon: 'users', to: '/superadmin/cuentas' },
  { id: 'proyectores', label: 'Proyectores', icon: 'projector', to: '/superadmin/proyectores' },
];

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <ProjectingProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/proyector/:code" element={<ProjectorDisplay />} />

          <Route path="/matricula" element={<RequireRole roles={['enrollee', 'student']}><MatriculaPortalPage /></RequireRole>} />

          <Route path="/profesor" element={<RequireRole roles={['teacher']}><AppLayout navItems={TEACHER_NAV} roleLabel="Profesor" /></RequireRole>}>
            <Route index element={<TeacherHome />} />
            <Route path="tareas" element={<TeacherTasksOverview />} />
            <Route path="chat" element={<TeacherChatList />} />
            <Route path="chat/:chatId" element={<TeacherChatThread />} />
            <Route path="ajustes" element={<TeacherSettings />} />
            <Route path="clases/:classId" element={<TeacherClass />} />
            <Route path="clases/:classId/temas/:topicId" element={<TeacherTopic />} />
            <Route path="clases/:classId/tareas/:taskId" element={<TeacherTask />} />
            <Route path="clases/:classId/tareas/:taskId/calificar/:subId" element={<TeacherGrade />} />
          </Route>

          <Route path="/estudiante" element={<RequireRole roles={['student']}><AppLayout navItems={STUDENT_NAV} roleLabel="Estudiante" /></RequireRole>}>
            <Route index element={<StudentHome />} />
            <Route path="tareas" element={<StudentTasksOverview />} />
            <Route path="horario" element={<StudentHorario />} />
            <Route path="chat" element={<StudentChatList />} />
            <Route path="chat/:chatId" element={<StudentChatThread />} />
            <Route path="ajustes" element={<StudentSettings />} />
            <Route path="clases/:classId" element={<StudentClass />} />
            <Route path="clases/:classId/temas/:topicId" element={<StudentTopic />} />
            <Route path="clases/:classId/tareas/:taskId" element={<StudentTask />} />
          </Route>

          <Route path="/admin" element={<RequireRole roles={['admin']}><AppLayout navItems={ADMIN_NAV} roleLabel="Admin de colegio" /></RequireRole>}>
            <Route index element={<AdminResumen />} />
            <Route path="cuentas" element={<AdminCuentas />} />
            <Route path="profesores" element={<AdminProfesores />} />
            <Route path="matricula" element={<AdminMatricula />} />
            <Route path="pagos" element={<AdminPagos />} />
            <Route path="aulas-grupos" element={<AdminAulasGrupos />} />
            <Route path="aulas-grupos/:groupId" element={<AdminGrupoDetail />} />
          </Route>

          <Route path="/superadmin" element={<RequireRole roles={['superadmin']}><AppLayout navItems={SUPER_NAV} roleLabel="Súper-admin" /></RequireRole>}>
            <Route index element={<SuperFacturacion />} />
            <Route path="colegios" element={<SuperColegios />} />
            <Route path="cuentas" element={<SuperCuentas />} />
            <Route path="proyectores" element={<SuperProyectores />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProjectingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
