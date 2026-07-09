import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../store/useAuthStore';

interface AuthGuardProps {
  requiredRole: UserRole;
}

export function AuthGuard({ requiredRole }: AuthGuardProps) {
  const { isLoggedIn, role, loading } = useAuthStore();
  const { locale } = useParams();
  const location = useLocation();
  const lang = locale || 'en';

  // Wait for the initial Supabase session check before deciding — otherwise the
  // guard would briefly redirect to /login on every hard refresh.
  if (loading) {
    return <div className="min-h-screen bg-[#0b1620]" aria-busy="true" />;
  }

  if (!isLoggedIn) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/${lang}/login?redirect=${redirect}`} replace />;
  }

  if (role && role !== requiredRole) {
    const correctDashboard = role === 'partner' ? 'partner-dashboard' : role === 'admin' ? 'admin' : 'dashboard';
    return <Navigate to={`/${lang}/${correctDashboard}`} replace />;
  }

  return <Outlet />;
}
