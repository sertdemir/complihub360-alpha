import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, LayoutGrid, FolderClosed, Mail, Bell, BookOpen, Bookmark, Download,
  TriangleAlert, Calendar, Search, Settings, Landmark, Package, ShieldCheck, Megaphone, Building2, Headset,
} from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem, DomainBar, DomainTab } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';

// ─── UserShell ────────────────────────────────────────────────────────────────
// The user App-Workspace frame (always dark slate), mirroring the Figma User
// Dashboard v2 two-axis navigation: slim left sidebar (WORKSPACE / LIBRARY /
// SAVED / MONITORING) + global Domain Bar on top of the content column.

type SidebarItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  count?: string;
  exact?: boolean;
};

const SIDEBAR: { group: string; badge?: string; items: SidebarItem[] }[] = [
  {
    group: 'Workspace',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: LayoutGrid, exact: true },
      { to: 'dashboard/sessions', label: 'Sessions', icon: FolderClosed },
      { to: 'dashboard/requests', label: 'Requests', icon: Mail, count: '3' },
      { to: 'dashboard/notifications', label: 'Notifications', icon: Bell, count: '2' },
    ],
  },
  {
    group: 'Library',
    items: [{ to: 'dashboard/library', label: 'Library', icon: BookOpen }],
  },
  {
    group: 'Saved',
    items: [
      { to: 'dashboard/saved-providers', label: 'Saved Providers', icon: Bookmark },
      { to: 'dashboard/exports', label: 'Exports', icon: Download },
    ],
  },
  {
    group: 'Monitoring',
    badge: 'Soon',
    items: [
      { to: 'dashboard/alerts', label: 'Alerts', icon: TriangleAlert },
      { to: 'dashboard/calendar', label: 'Calendar', icon: Calendar },
    ],
  },
];

const DOMAINS = [
  { label: 'Tax & VAT', icon: Landmark, dot: 'high' as const },
  { label: 'Product & Packaging', icon: Package, dot: 'medium' as const },
  { label: 'Data & Privacy', icon: ShieldCheck, dot: 'medium' as const },
  { label: 'Marketing & SEO', icon: Megaphone },
  { label: 'Corporate & Structure', icon: Building2 },
  { label: 'Full Support', icon: Headset },
];

const DOT: Record<'high' | 'medium', string> = { high: 'bg-red-400', medium: 'bg-amber-400' };

export function UserShell({ activeDomain, children }: { activeDomain?: string; children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  const base = `/${locale}`;

  return (
    <div className="dark flex h-screen bg-[#1F2937] text-fg">
      <Sidebar
        logo={
          <NavLink to={`${base}/dashboard`} className="flex items-center gap-2">
            <LogoMark tone="on-petrol" className="h-[22px] w-auto" />
            <span className="text-[15px] font-semibold text-white">CompliHub</span>
          </NavLink>
        }
        footer={
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d4af37] text-[11px] font-bold text-[#101411]">AW</span>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-fg">Alex Weber</p>
                <p className="text-[10px] text-fg-tertiary">Acme GmbH</p>
              </div>
            </div>
            <Settings size={15} className="text-fg-tertiary" />
          </div>
        }
      >
        {SIDEBAR.map((g) => (
          <SidebarGroup key={g.group} label={g.group} badge={g.badge}>
            {g.items.map((it) => {
              const target = `${base}/${it.to}`;
              const active = it.exact
                ? location.pathname === target || location.pathname === `${target}/`
                : location.pathname.startsWith(target);
              const Icon = it.icon;
              return (
                <NavLink key={it.to} to={target}>
                  <NavItem icon={<Icon size={16} />} label={it.label} count={it.count} active={active} />
                </NavLink>
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <DomainBar
          home={
            <NavLink to={`${base}/dashboard`} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
              <Home size={17} />
            </NavLink>
          }
          trailing={
            <button type="button" aria-label="Search" className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
              <Search size={17} />
            </button>
          }
        >
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            return (
              <DomainTab
                key={d.label}
                icon={<Icon size={15} />}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {d.label}
                    {d.dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[d.dot]}`} />}
                  </span>
                }
                active={activeDomain === d.label}
              />
            );
          })}
        </DomainBar>
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
