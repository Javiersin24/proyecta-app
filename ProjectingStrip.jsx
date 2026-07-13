import { createContext, useContext, useState } from 'react';

// Traducción ligera: cubre navegación y textos de alto tráfico. El resto de
// la app permanece en español (idioma nativo del producto) — no se tradujo
// exhaustivamente cada cadena, solo lo que un profesor/estudiante ve más.
const DICT = {
  Inicio: 'Home', Tareas: 'Tasks', Horario: 'Schedule', Asistencia: 'Attendance',
  Calificaciones: 'Grades', Inteligencia: 'Intelligence', Eventos: 'Events', Organizador: 'Planner', Chat: 'Chat',
  Ajustes: 'Settings', Más: 'More', 'Mis clases': 'My classes', 'Crear clase': 'Create class',
  'Unirme a clase': 'Join class', 'Cerrar sesión': 'Log out', Profesor: 'Teacher',
  Estudiante: 'Student', 'Tu cuenta y preferencias': 'Your account and preferences',
  Seguridad: 'Security', 'Cambiar contraseña': 'Change password', 'Idioma del sistema': 'System language',
  Idioma: 'Language', Notificaciones: 'Notifications',
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangRaw] = useState(() => localStorage.getItem('proyecta_lang') || 'es');
  const setLang = (l) => { localStorage.setItem('proyecta_lang', l); setLangRaw(l); };
  const t = (s) => (lang === 'en' ? DICT[s] || s : s);
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
