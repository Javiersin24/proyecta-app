import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext.jsx';
import { ProjectingProvider } from './lib/ProjectingContext.jsx';
import { LanguageProvider } from './lib/LanguageContext.jsx';
import RequireRole, { HOME_BY_ROLE } from './lib/RequireRole.jsx';
import AppLayout from './ui/AppLayout.jsx';
import PwaBanners from './ui/PwaBanners.jsx';

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
import TeacherHorario from './pages/teacher/HorarioScreen.jsx';
import TeacherAsistencia from './pages/teacher/AsistenciaScreen.jsx';
import TeacherCalificaciones from './pages/teacher/CalificacionesScreen.jsx';
import TeacherInteligencia from './pages/teacher/IntelligenceScreen.jsx';
import TeacherMaterialViewer from './pages/teacher/MaterialViewerScreen.jsx';

import StudentHome from './pages/student/Home.jsx';
import StudentClass from './pages/student/ClassScreen.jsx';
import StudentTopic from './pages/student/TopicScreen.jsx';
import StudentTask from './pages/student/TaskScreen.jsx';
import StudentTasksOverview from './pages/student/TasksOverview.jsx';
import StudentHorario from './pages/student/HorarioScreen.jsx';
import StudentChatList from './pages/student/ChatList.jsx';
import StudentChatThread from './pages/student/ChatThread.jsx';
import StudentCalificaciones from './pages/student/CalificacionesScreen.jsx';
import StudentMaterialViewer from './pages/student/MaterialViewerScreen.jsx';

import EventsScreen from './pages/shared/EventsScreen.jsx';
import OrganizerScreen from './pages/shared/OrganizerScreen.jsx';
import SettingsScreen from './pages/shared/SettingsScreen.jsx';

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
  { id: 'horario', label: 'Horario', icon: 'calendar', to: '/profesor/horario' },
  { id: 'asistencia', label: 'Asistencia', icon: 'check', to: '/profesor/asistencia' },
  { id: 'calificaciones', label: 'Calificaciones', icon: 'award', to: '/profesor/calificaciones' },
  { id: 'inteligencia', label: 'Inteligencia', icon: 'sparkles', to: '/profesor/inteligencia' },
  { id: 'eventos', label: 'Eventos', icon: 'megaphone', to: '/profesor/eventos' },
  { id: 'agenda', label: 'Organizador', icon: 'clipboard', to: '/profesor/agenda' },
  { id: 'chat', label: 'Chat', icon: 'chat', to: '/profesor/chat' },
  { id: 'settings', label: 'Ajustes', icon: 'settings', to: '/profesor/ajustes' },
];
const STUDENT_NAV = [
  { id: 'home', label: 'Inicio', icon: 'home', to: '/estudiante' },
  { id: 'tasks', label: 'Tareas', icon: 'clipboard', to: '/estudiante/tareas' },
  { id: 'horario', label: 'Horario', icon: 'calendar', to: '/estudiante/horario' },
  { id: 'calificaciones', label: 'Calificaciones', icon: 'award', to: '/estudiante/calificaciones' },
  { id: 'eventos', label: 'Eventos', icon: 'megaphone', to: '/estudiante/eventos' },
  { id: 'agenda', label: 'Organizador', icon: 'clipboard', to: '/estudiante/agenda' },
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
  { id: 'settings', label: 'Ajustes', icon: 'settings', to: '/admin/ajustes' },
];
const SUPER_NAV = [
  { id: 'facturacion', label: 'Ingresos', icon: 'chart', to: '/superadmin' },
  { id: 'colegios', label: 'Colegios', icon: 'home', to: '/superadmin/colegios' },
  { id: 'cuentas', label: 'Cuentas', icon: 'users', to: '/superadmin/cuentas' },
  { id: 'proyectores', label: 'Proyectores', icon: 'projector', to: '/superadmin/proyectores' },
  { id: 'settings', label: 'Ajustes', icon: 'settings', to: '/superadmin/ajustes' },
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
      <LanguageProvider>
      <ProjectingProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/proyector/:code" element={<ProjectorDisplay />} />

          <Route path="/matricula" element={<RequireRole roles={['enrollee', 'student']}><MatriculaPortalPage /></RequireRole>} />

          <Route path="/profesor" element={<RequireRole roles={['teacher']}><AppLayout navItems={TEACHER_NAV} roleLabel="Profesor" /></RequireRole>}>
            <Route index element={<TeacherHome />} />
            <Route path="tareas" element={<TeacherTasksOverview />} />
            <Route path="horario" element={<TeacherHorario />} />
            <Route path="asistencia" element={<TeacherAsistencia />} />
            <Route path="calificaciones" element={<TeacherCalificaciones />} />
            <Route path="inteligencia" element={<TeacherInteligencia />} />
            <Route path="eventos" element={<EventsScreen isTeacher />} />
            <Route path="agenda" element={<OrganizerScreen basePath="/profesor" isTeacher />} />
            <Route path="chat" element={<TeacherChatList />} />
            <Route path="chat/:chatId" element={<TeacherChatThread />} />
            <Route path="ajustes" element={<SettingsScreen roleLabel="Profesor" />} />
            <Route path="clases/:classId" element={<TeacherClass />} />
            <Route path="clases/:classId/temas/:topicId" element={<TeacherTopic />} />
            <Route path="clases/:classId/tareas/:taskId" element={<TeacherTask />} />
            <Route path="clases/:classId/tareas/:taskId/calificar/:subId" element={<TeacherGrade />} />
            <Route path="material" element={<TeacherMaterialViewer />} />
          </Route>

          <Route path="/estudiante" element={<RequireRole roles={['student']}><AppLayout navItems={STUDENT_NAV} roleLabel="Estudiante" /></RequireRole>}>
            <Route index element={<StudentHome />} />
            <Route path="tareas" element={<StudentTasksOverview />} />
            <Route path="horario" element={<StudentHorario />} />
            <Route path="calificaciones" element={<StudentCalificaciones />} />
            <Route path="eventos" element={<EventsScreen isTeacher={false} />} />
            <Route path="agenda" element={<OrganizerScreen basePath="/estudiante" isTeacher={false} />} />
            <Route path="chat" element={<StudentChatList />} />
            <Route path="chat/:chatId" element={<StudentChatThread />} />
            <Route path="ajustes" element={<SettingsScreen roleLabel="Estudiante" />} />
            <Route path="clases/:classId" element={<StudentClass />} />
            <Route path="clases/:classId/temas/:topicId" element={<StudentTopic />} />
            <Route path="clases/:classId/tareas/:taskId" element={<StudentTask />} />
            <Route path="material" element={<StudentMaterialViewer />} />
          </Route>

          <Route path="/admin" element={<RequireRole roles={['admin']}><AppLayout navItems={ADMIN_NAV} roleLabel="Admin de colegio" /></RequireRole>}>
            <Route index element={<AdminResumen />} />
            <Route path="cuentas" element={<AdminCuentas />} />
            <Route path="profesores" element={<AdminProfesores />} />
            <Route path="matricula" element={<AdminMatricula />} />
            <Route path="pagos" element={<AdminPagos />} />
            <Route path="aulas-grupos" element={<AdminAulasGrupos />} />
            <Route path="aulas-grupos/:groupId" element={<AdminGrupoDetail />} />
            <Route path="ajustes" element={<SettingsScreen roleLabel="Admin de colegio" />} />
          </Route>

          <Route path="/superadmin" element={<RequireRole roles={['superadmin']}><AppLayout navItems={SUPER_NAV} roleLabel="Súper-admin" /></RequireRole>}>
            <Route index element={<SuperFacturacion />} />
            <Route path="colegios" element={<SuperColegios />} />
            <Route path="cuentas" element={<SuperCuentas />} />
            <Route path="proyectores" element={<SuperProyectores />} />
            <Route path="ajustes" element={<SettingsScreen roleLabel="Súper-admin" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PwaBanners />
      </ProjectingProvider>
      </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
