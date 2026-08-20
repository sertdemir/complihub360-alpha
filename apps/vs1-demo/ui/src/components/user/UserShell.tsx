import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, FolderClosed, Bell, BookOpen, Bookmark, Download, CalendarCheck,
  TriangleAlert, Calendar, Search, LogOut, Landmark, Package, ShieldCheck, Megaphone, Building2,
  PackageCheck, Truck, Scale,
} from 'lucide-react';
import { DOMAINS as CANONICAL_DOMAINS, type DomainSlug } from '../../lib/domains';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';
import { UserSearchDrawer } from './UserSearchDrawer';
import { AssistantWidget } from './AssistantWidget';
import { fetchUserBookings } from '../../api/bookings';
import { fetchNotificationsFeed, USER_NOTIFICATIONS_VIEWER } from '../../api/notifications';

// ─── UserShell ────────────────────────────────────────────────────────────────
// The user App-Workspace frame (always dark slate), mirroring the Figma User
// Dashboard v2 two-axis navigation: slim left sidebar (WORKSPACE / LIBRARY /
// SAVED / MONITORING) + global Domain Bar on top of the content column.
// Nav copy lives in the 'userws' namespace; group/domain identifiers stay
// canonical English (React keys + activeDomain matching).

type SidebarItem = {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number | string }>;
  count?: string;
  exact?: boolean;
};

const SIDEBAR: { group: string; groupKey: string; badgeKey?: string; items: SidebarItem[] }[] = [
  {
    group: 'Workspace',
    groupKey: 'groupWorkspace',
    items: [
      { to: 'dashboard', labelKey: 'navDashboard', icon: LayoutGrid, exact: true },
      { to: 'dashboard/sessions', labelKey: 'navSessions', icon: FolderClosed },
      // v2: Termine (bookings) replace the retired engagement-request center.
      { to: 'dashboard/termine', labelKey: 'navTermine', icon: CalendarCheck },
      { to: 'dashboard/notifications', labelKey: 'navNotifications', icon: Bell },
    ],
  },
  {
    group: 'Library',
    groupKey: 'groupLibrary',
    items: [{ to: 'dashboard/library', labelKey: 'navLibrary', icon: BookOpen }],
  },
  {
    group: 'Saved',
    groupKey: 'groupSaved',
    items: [
      { to: 'dashboard/saved-providers', labelKey: 'navSavedProviders', icon: Bookmark },
      { to: 'dashboard/exports', labelKey: 'navExports', icon: Download },
    ],
  },
  {
    group: 'Monitoring',
    groupKey: 'groupMonitoring',
    badgeKey: 'badgeSoon',
    items: [
      { to: 'dashboard/alerts', labelKey: 'navAlerts', icon: TriangleAlert },
      { to: 'dashboard/calendar', labelKey: 'navCalendar', icon: Calendar },
    ],
  },
];

// Canonical 8 domains (lib/domains.ts) + shell-local presentation (icon, risk dot).
const DOMAIN_ICON: Record<DomainSlug, React.ComponentType<{ size?: number | string }>> = {
  'tax-vat': Landmark,
  'product-packaging': Package,
  'data-privacy': ShieldCheck,
  'marketing-seo': Megaphone,
  'corporate-structure': Building2,
  'product-compliance': PackageCheck,
  'logistics-customs': Truck,
  'legal-advisory': Scale,
};
const DOMAIN_DOT: Partial<Record<DomainSlug, 'high' | 'medium'>> = {
  'tax-vat': 'high',
  'product-packaging': 'medium',
  'data-privacy': 'medium',
};
const DOMAINS = CANONICAL_DOMAINS.map((d) => ({
  ...d,
  key: d.i18nKey,
  icon: DOMAIN_ICON[d.slug],
  dot: DOMAIN_DOT[d.slug],
}));

const DOT: Record<'high' | 'medium', string> = { high: 'bg-red-400', medium: 'bg-amber-400' };

export function UserShell({ activeDomain, children }: { activeDomain?: string; children: React.ReactNode }) {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  // Real session identity when present; the design fixture only as fallback.
  const { userName, user, logout } = useAuthStore();
  const displayName = userName || 'Alex Weber';
  const displaySub = user?.email || 'Acme GmbH';
  const initials = displayName.split(/[\s._-]+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const base = `/${locale}`;
  // B16: workspace search drawer · C1: live sidebar badges (hidden in fixture mode).
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  useEffect(() => {
    fetchUserBookings()
      .then((bs) => setCounts((c) => ({ ...c, requests: bs.filter((b) => b.status === 'confirmed').length })))
      .catch(() => {});
    fetchNotificationsFeed(USER_NOTIFICATIONS_VIEWER)
      .then((f) => setCounts((c) => ({ ...c, unread: f.groups.reduce((n, g) => n + g.items.filter((i) => i.unread).length, 0) })))
      .catch(() => {});
  }, []);
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'dashboard/termine' ? counts.requests : to === 'dashboard/notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  return (
    <div className="dark flex h-screen bg-surface text-fg">
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
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-accent text-[11px] font-bold text-fg-on-accent">{initials}</span>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-fg">{displayName}</p>
                <p className="text-[10px] text-fg-tertiary">{displaySub}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t('shell.signOut')}
              title={t('shell.signOut')}
              onClick={async () => { await logout(); window.location.href = `/${locale}/login`; }}
              className="text-fg-tertiary transition-colors hover:text-fg"
            >
              <LogOut size={15} />
            </button>
          </div>
        }
      >
        {SIDEBAR.map((g) => (
          <React.Fragment key={g.group}>
            <SidebarGroup label={t(`shell.${g.groupKey}`)} badge={g.badgeKey ? t(`shell.${g.badgeKey}`) : undefined}>
              {g.items.map((it) => {
                const target = `${base}/${it.to}`;
                const active = it.exact
                  ? location.pathname === target || location.pathname === `${target}/`
                  : location.pathname.startsWith(target);
                const Icon = it.icon;
                return (
                  <NavLink key={it.to} to={target}>
                    <NavItem icon={<Icon size={16} />} label={t(`shell.${it.labelKey}`)} count={it.count ?? badgeFor(it.to)} active={active} />
                  </NavLink>
                );
              })}
            </SidebarGroup>
            {/* Nav decision 2026-08-04: domains live as a sidebar group (final 8),
                the horizontal Domain Bar is gone. */}
            {g.group === 'Workspace' && (
              <SidebarGroup label={t('shell.groupDomains')}>
                {DOMAINS.map((d) => {
                  const target = `${base}/dashboard/workbench/${d.slug}`;
                  const active = location.pathname.startsWith(target) || activeDomain === d.label;
                  const Icon = d.icon;
                  return (
                    <NavLink key={d.slug} to={target}>
                      <NavItem
                        icon={<Icon size={16} />}
                        label={
                          <span className="inline-flex items-center gap-1.5">
                            {t(`domain.${d.key}`)}
                            {d.dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[d.dot]}`} />}
                          </span>
                        }
                        active={active}
                      />
                    </NavLink>
                  );
                })}
              </SidebarGroup>
            )}
          </React.Fragment>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Slim utility bar: workspace search trigger (the Domain Bar is gone —
            domains navigate from the sidebar group). */}
        <div className="flex items-center justify-end border-b border-stroke px-4 py-1.5">
          <button type="button" aria-label={t('shell.search')} onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
            <Search size={17} />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AssistantWidget />
    </div>
  );
}
