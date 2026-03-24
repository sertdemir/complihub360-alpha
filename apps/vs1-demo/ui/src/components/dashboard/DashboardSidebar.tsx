import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  BarChart3, 
  FolderOpen, 
  BookOpen,
  Briefcase, 
  MessageSquare, 
  UserCircle,
  LogOut
} from 'lucide-react';

export interface SidebarConfig {
  type: 'user' | 'partner';
  locale: string;
}

export function DashboardSidebar({ type, locale }: SidebarConfig) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore(s => s.logout);

  const userLinks = [
    { label: t('dashboard.nav.myHub', 'Mein Hub'), href: `/${locale}/dashboard`, icon: <BarChart3 className="w-5 h-5" /> },
    { label: t('dashboard.nav.dossiers', 'Meine Dossiers'), href: `/${locale}/dashboard/sessions`, icon: <FolderOpen className="w-5 h-5" /> },
    { label: t('dashboard.nav.knowledge', 'Knowledge Center'), href: `/${locale}/dashboard/knowledge`, icon: <BookOpen className="w-5 h-5" /> },
    { label: t('dashboard.nav.workspace', 'Dein Workspace'), href: `/${locale}/dashboard/workspace`, icon: <Briefcase className="w-5 h-5" /> },
    { label: t('dashboard.nav.messages', 'Nachrichten'), href: `/${locale}/dashboard/messages`, icon: <MessageSquare className="w-5 h-5" /> },
    { label: t('dashboard.nav.settings', 'Einstellungen'), href: `/${locale}/dashboard/settings`, icon: <UserCircle className="w-5 h-5" /> },
  ];

  const partnerLinks = [
    { label: t('dashboard.partnerNav.hub', 'Partner Hub'), href: `/${locale}/partner-dashboard`, icon: <BarChart3 className="w-5 h-5" /> },
    { label: t('dashboard.partnerNav.inbox', 'Lead Inbox'), href: `/${locale}/partner-dashboard/leads`, icon: <FolderOpen className="w-5 h-5" /> },
    { label: t('dashboard.partnerNav.clients', 'Aktive Mandanten'), href: `/${locale}/partner-dashboard/clients`, icon: <Briefcase className="w-5 h-5" /> },
    { label: t('dashboard.partnerNav.profile', 'Kanzlei Profil'), href: `/${locale}/partner-dashboard/profile`, icon: <UserCircle className="w-5 h-5" /> },
  ];

  const links = type === 'user' ? userLinks : partnerLinks;

  const handleLogout = () => {
    logout();
    navigate(`/${locale}`);
  };

  return (
    <aside className="sticky top-16 self-start h-[calc(100vh-4rem)] w-64 shrink-0 bg-white border-r border-gray-200 z-10">
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <nav className="flex-1 px-4 py-8 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href.endsWith('dashboard')}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Abmelden
          </button>
        </div>
      </div>
    </aside>
  );
}
