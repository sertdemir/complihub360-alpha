import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  FolderOpen, 
  BookOpen,
  Briefcase, 
  MessageSquare, 
  UserCircle 
} from 'lucide-react';

export interface SidebarConfig {
  type: 'user' | 'partner';
  locale: string;
}

export function DashboardSidebar({ type, locale }: SidebarConfig) {
  const { t } = useTranslation();

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

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-10 pt-20">
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <nav className="flex-1 px-4 py-8 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href.endsWith('dashboard')} // Only exact match for the root dashboard
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
      </div>
    </aside>
  );
}
