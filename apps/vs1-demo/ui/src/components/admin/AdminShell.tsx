import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Bell, Users, Shield, Lock, Activity, Search, ScrollText, Gauge } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../lib/utils';

// ─── AdminShell ───────────────────────────────────────────────────────────────
// The internal Control-Center frame (Figma page "Admin", 2966:4): always-dark
// AppShell with MONITOR / PLATFORM / COMPLIANCE nav and an "All systems up"
// pill instead of the provider badges. Admin-only surface — never public nav.

const NAV = [
  {
    group: 'Monitor',
    items: [
      { to: '', label: 'Overview', icon: LayoutGrid },
      { to: 'cockpit', label: 'Founder Cockpit', icon: Gauge },
      { to: 'events', label: 'Events & Audit', icon: ScrollText },
    ],
  },
  {
    group: 'Platform',
    items: [
      { to: 'providers', label: 'Providers', icon: Users },
      { to: 'security', label: 'Security', icon: Shield },
    ],
  },
  {
    group: 'Compliance',
    items: [
      { to: 'privacy', label: 'Privacy & AI Gate', icon: Lock },
      { to: 'alerts', label: 'Alerts', icon: Bell, count: '1' },
      { to: 'status', label: 'System status', icon: Activity },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/${locale}/admin`;
  const currentLang = i18n.resolvedLanguage === 'de' ? 'de' : 'en';
  const switchLang = (lng: 'de' | 'en') => {
    const parts = location.pathname.split('/');
    if (parts.length > 1 && ['en', 'de', 'es', 'tr'].includes(parts[1])) parts[1] = lng;
    void i18n.changeLanguage(lng);
    navigate(parts.join('/') + location.search + location.hash);
  };

  return (
    <div className="flex h-screen bg-surface text-fg">
      <Sidebar
        logo={
          <NavLink to={base} className="flex items-center gap-2">
            <LogoMark tone="on-petrol" className="h-[22px] w-auto" />
            <span className="text-[15px] font-semibold text-fg">CompliHub</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent">Admin</span>
          </NavLink>
        }
        footer={
          <div className="flex items-center gap-2.5 px-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-[11px] font-bold text-fg-on-accent">AD</span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-fg">Admin</p>
              <p className="text-[10px] text-fg-tertiary">CompliHub360 Ops</p>
            </div>
          </div>
        }
      >
        {NAV.map((g) => (
          <SidebarGroup key={g.group} label={g.group}>
            {g.items.map((it) => {
              const path = it.to ? `${base}/${it.to}` : base;
              const active = it.to ? location.pathname.includes(`/admin/${it.to}`) : /\/admin\/?$/.test(location.pathname);
              const Icon = it.icon;
              return (
                <NavLink key={it.label} to={path}>
                  <NavItem icon={<Icon size={16} />} label={it.label} count={it.count} active={active} />
                </NavLink>
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-15 min-h-[60px] shrink-0 items-center justify-end gap-3 border-b border-stroke px-6">
          <button type="button" aria-label="Search" className="mr-1 text-fg-tertiary transition-colors hover:text-fg">
            <Search size={18} />
          </button>
          <div className="flex items-center overflow-hidden rounded-md border border-stroke text-[11px] font-semibold">
            {(['de', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLang(l)}
                className={cn('px-2.5 py-1 transition-colors', currentLang === l ? 'bg-surface-secondary text-fg' : 'text-fg-tertiary hover:text-fg')}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <ThemeToggle size={34} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[12px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            All systems up
          </span>
        </header>
        <main className={cn('flex-1 overflow-y-auto px-8 py-6')}>{children}</main>
      </div>
    </div>
  );
}
