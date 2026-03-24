import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../store/useAuthStore';

interface AuthGuardProps {
  requiredRole: UserRole;
}

export function AuthGuard({ requiredRole }: AuthGuardProps) {
  const { isLoggedIn, role } = useAuthStore();
  const { locale } = useParams();
  const location = useLocation();
  const lang = locale || 'en';

  if (!isLoggedIn) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/${lang}/login?redirect=${redirect}`} replace />;
  }

  if (role && role !== requiredRole) {
    const correctDashboard = role === 'partner' ? 'partner-dashboard' : 'dashboard';
    return <Navigate to={`/${lang}/${correctDashboard}`} replace />;
  }

  return <Outlet />;
}
