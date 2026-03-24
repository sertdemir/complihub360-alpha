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
      <div className="flex flex-1 pt-16">
        {/* Centered wrapper for sidebar + content */}
        <div className="flex w-full max-w-[1440px] mx-auto">
          <DashboardSidebar type={type} locale={locale} />
          <main className="flex-1 overflow-y-auto">
            <div className="pl-6 pr-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
