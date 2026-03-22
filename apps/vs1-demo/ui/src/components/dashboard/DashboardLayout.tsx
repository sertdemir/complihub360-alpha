import { ReactNode } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { DashboardSidebar, SidebarConfig } from './DashboardSidebar';

interface LayoutProps {
  children: ReactNode;
  type: SidebarConfig['type'];
}

export function DashboardLayout({ children, type }: LayoutProps) {
  const { locale } = useParams();

  if (!locale) {
    return <Navigate to="/en" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex flex-col">
      {/* GlobalNav is rendered at the app root level outside out Outlet for most pages */}
      <div className="flex flex-1 pt-16">
        <DashboardSidebar type={type} locale={locale} />
        <main className="flex-1 ml-64 p-8 overflow-y-auto max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
