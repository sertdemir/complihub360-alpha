import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../store/useAuthStore';
import { useBetaAgreementGate } from '../../lib/agreementGate';

interface AuthGuardProps {
  requiredRole: UserRole;
}

export function AuthGuard({ requiredRole }: AuthGuardProps) {
  const { isLoggedIn, role, loading } = useAuthStore();
  const { locale } = useParams();
  const location = useLocation();
  const lang = locale || 'en';
  // Beta-Vereinbarung (Canvas-Wahl 2A, 22.10.2026): Nutzer, die die geltende
  // Fassung noch nicht angenommen haben, sehen zuerst den eigenen Schritt.
  // Einmal je Sitzung gefragt; Anbieter und Admins haben hier kein Blatt (4C).
  const gate = useBetaAgreementGate(!loading && isLoggedIn && requiredRole === 'user' && (role === null || role === 'user'), lang);

  // Wait for the initial Supabase session check before deciding — otherwise the
  // guard would briefly redirect to /login on every hard refresh.
  if (loading || (isLoggedIn && requiredRole === 'user' && gate === 'loading')) {
    return <div className="min-h-screen bg-[#0b1620]" aria-busy="true" />;
  }

  if (!isLoggedIn) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/${lang}/login?redirect=${redirect}`} replace />;
  }

  if (role && role !== requiredRole) {
    const correctDashboard = role === 'partner' ? 'provider-dashboard' : role === 'admin' ? 'admin' : 'dashboard';
    return <Navigate to={`/${lang}/${correctDashboard}`} replace />;
  }

  if (requiredRole === 'user' && gate === 'required') {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/${lang}/beta-agreement?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
}
