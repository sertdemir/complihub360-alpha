import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Bell, Users, Shield, Lock, Activity, Search, ScrollText, Gauge } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { WorkspaceMobileBar, type WorkspaceNavGroup } from '../ui/WorkspaceMobileBar';
import { Logo } from '../ui/Logo';
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

  // One source for both rails: the mobile panel below `lg` renders exactly what
  // the sidebar renders above it.
  const isActive = (to: string) =>
    to ? location.pathname.includes(`/admin/${to}`) : /\/admin\/?$/.test(location.pathname);
  const mobileGroups: WorkspaceNavGroup[] = NAV.map((g) => ({
    key: g.group,
    label: g.group,
    items: g.items.map((it) => {
      const Icon = it.icon;
      return {
        key: it.label,
        to: it.to ? `${base}/${it.to}` : base,
        label: it.label,
        title: it.label,
        icon: <Icon size={18} />,
        count: it.count,
        active: isActive(it.to),
      };
    }),
  }));

  const langSwitch = (
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
  );

  return (
    <div className="flex h-dvh bg-surface text-fg">
      <Sidebar
        className="hidden lg:flex"
        logo={
          <NavLink to={base} className="flex items-center gap-2">
            {/* 32 statt 38 px: die Sidebar ist w-60 (240 px), mit px-4 bleiben 208 px
                Spur. Bei 38 px waere das Lockup 186 px breit — es passt, aber
                mit 22 px Rest sitzt es in der schmalen Spur zu eng. Bei 32 px
                sind es 157 px, also 51 px Reserve.
                Die Bildmarke wird dadurch kleiner, das WORTZEICHEN bleibt
                groesser als vor dem Claim-Wegfall: 16,6 px statt 11,0 px. */}
            <Logo lockup="horizontal" href={null} className="h-[32px] w-auto" />
            {/* accent-STRONG: 9px owes the full 4.5:1 and gold-500 is 2.10 on the light
                shell. Same call as the PARTNER badge in ProviderShell. */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent-strong">Admin</span>
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
        {/* Below lg the rail is gone, so the bar carries the navigation: the page
            title IS the switcher. Search stays in it; the language pair, the
            theme and the account block sit under the open panel, where there is
            room for them. */}
        <WorkspaceMobileBar
          groups={mobileGroups}
          homeHref={base}
          fallbackTitle="Control Center"
          switchLabel="Go to"
          logo={<Logo lockup="symbol" href={null} />}
          actions={
            <button type="button" aria-label="Search" className="grid h-11 w-11 place-items-center rounded-lg text-fg-secondary transition-colors hover:text-fg">
              <Search size={19} />
            </button>
          }
          footer={
            <div className="flex items-center gap-2.5 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-accent text-[11px] font-bold text-fg-on-accent">AD</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-body-sm font-semibold text-fg">Admin</p>
                <p className="text-body-2xs text-fg-tertiary">CompliHub360 Ops</p>
              </div>
              {langSwitch}
              <ThemeToggle size={40} />
            </div>
          }
        />
        <header className="hidden h-15 min-h-[60px] shrink-0 items-center justify-end gap-3 border-b border-stroke px-6 lg:flex">
          <button type="button" aria-label="Search" className="mr-1 text-fg-tertiary transition-colors hover:text-fg">
            <Search size={18} />
          </button>
          {langSwitch}
          <ThemeToggle size={34} />
          {/* emerald-400 is a fill stop, not a text stop: on its own 10% tint it
              reads 1.80 in light. The DS success ramp carries the readable one
              (5.84), and the dot takes success-500 for the 3:1 a graphic owes
              (3.76). Dark keeps emerald-400 throughout - it measures 6.26 there. */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[12px] font-medium text-success-700 ring-1 ring-inset ring-emerald-400/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500 dark:bg-emerald-400" />
            All systems up
          </span>
        </header>
        <main className={cn('flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6')}>{children}</main>
      </div>
    </div>
  );
}
