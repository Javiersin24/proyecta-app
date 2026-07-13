import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const HOME_BY_ROLE = {
  teacher: '/profesor', student: '/estudiante', admin: '/admin',
  superadmin: '/superadmin', enrollee: '/matricula',
};

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role] || '/login'} replace />;
  return children;
}

export { HOME_BY_ROLE };
