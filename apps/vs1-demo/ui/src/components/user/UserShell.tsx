import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, FolderClosed, Bell, BookOpen, Bookmark, Download, CalendarCheck,
  TriangleAlert, Calendar, Search, LogOut, Landmark, Package, ShieldCheck, Megaphone, Building2,
  PackageCheck, Truck, Scale,
  Leaf, ChevronRight,
} from 'lucide-react';
import { DOMAINS as CANONICAL_DOMAINS, type DomainSlug } from '../../lib/domains';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { WorkspaceMobileBar, type WorkspaceNavGroup } from '../ui/WorkspaceMobileBar';
import { Logo } from '../ui/Logo';
import { UserSearchDrawer } from './UserSearchDrawer';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AssistantWidget } from './AssistantWidget';
import { fetchUserBookings } from '../../api/bookings';
import { isMockApi } from '../../lib/supabase';
import { fetchSessions, type SessionRowData } from '../../api/sessions';
import { fetchDashboard } from '../../api/dashboard';
import { fetchMyNotifications } from '../../api/notifications';

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

// Canonical 9 domains (lib/domains.ts) + shell-local presentation (icon, risk dot).
const DOMAIN_ICON: Record<DomainSlug, React.ComponentType<{ size?: number | string }>> = {
  'tax-vat': Landmark,
  'product-packaging': Package,
  'data-privacy': ShieldCheck,
  'marketing-seo': Megaphone,
  'corporate-structure': Building2,
  'product-compliance': PackageCheck,
  'logistics-customs': Truck,
  'legal-advisory': Scale,
  environment: Leaf,
};
// Die Punkte an den Bereichen kommen aus /dashboard (by_domain_high,
// by_domain), nicht mehr aus einer festen Liste (bis 2026-09-13 standen
// Steuern rot, EPR und Datenschutz gelb — fuer jedes Konto). Das Dashboard
// zaehlt nach ENGINE-Domaene, deshalb die Abbildung; Verpackung und
// Produkt-Compliance teilen sich PRODUCT und damit den Punkt.
const SLUG_TO_ENGINE_KEY: Record<DomainSlug, string> = {
  'tax-vat': 'TAX', 'product-packaging': 'PRODUCT', 'product-compliance': 'PRODUCT', 'data-privacy': 'DATA',
  'marketing-seo': 'MARKETING', 'corporate-structure': 'CORPORATE', 'logistics-customs': 'LOGISTICS', 'legal-advisory': 'LEGAL', environment: 'ENVIRONMENT',
};
const DOMAINS = CANONICAL_DOMAINS.map((d) => ({
  ...d,
  key: d.i18nKey,
  icon: DOMAIN_ICON[d.slug],
}));

const DOT: Record<'high' | 'medium', string> = { high: 'bg-red-400', medium: 'bg-amber-400' };

export function UserShell({ activeDomain, children }: { activeDomain?: string; children: React.ReactNode }) {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  // Real session identity when present; the design fixture only as fallback.
  const { userName, user, session, logout } = useAuthStore();
  const displayName = userName || 'Alex Weber';
  const displaySub = user?.email || 'Acme GmbH';
  const initials = displayName.split(/[\s._-]+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const base = `/${locale}`;
  // B16: workspace search drawer · C1: live sidebar badges (hidden in fixture mode).
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  const [domainDots, setDomainDots] = useState<Partial<Record<DomainSlug, 'high' | 'medium'>>>({});
  // ─── Sitzungen als zweite Nav-Ebene (Canvas N, Variante N3b) ──────────────
  // Zugeklappt, damit die Nav nicht mit jeder neuen Sitzung waechst — aber die
  // AKTIVE bleibt sichtbar, sonst weiss niemand, worin er gerade steckt.
  const [sessions, setSessions] = useState<SessionRowData[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  // /api/v1/bookings und /notifications verlangen einen echten Supabase-JWT
  // (services/compliance-api/src/index.ts:114 — beide stehen NICHT in
  // PUBLIC_ROUTES). Der Demo-Login auf Staging setzt nur ein localStorage-Flag
  // und KEINE Session; die Aufrufe koennen dort also nur scheitern. Sie
  // trotzdem zu feuern kostet nicht nur Requests: auf Staging liegt eine
  // Traefik-Basic-Auth-Wand davor, deren 401 ein "WWW-Authenticate: Basic"
  // traegt — und dann oeffnet der Browser pro Request einen Login-Dialog.
  // Deshalb: nur mit echter Sitzung anfragen. Die Badges blieben ohne sie
  // ohnehin leer.
  // Im Mock-Modus gibt es keine Supabase-Sitzung, aber Daten — die Badges
  // (Termine, Glocke) sollen dann trotzdem laden.
  const hasSession = !!session || isMockApi;
  useEffect(() => {
    if (hasSession) {
      fetchUserBookings()
        .then((bs) => setCounts((c) => ({ ...c, requests: bs.filter((b) => b.status === 'confirmed').length })))
        .catch(() => {});
      // Ungelesene haengen jetzt an der Zeile selbst (read_at), nicht mehr an
      // einem Wasserstand pro Flaeche: der zaehlte alles Neuere als ungelesen,
      // auch was nie jemanden anging.
      fetchMyNotifications()
        .then((f) => setCounts((c) => ({ ...c, unread: f.unread })))
        .catch(() => setCounts((c) => ({ ...c, unread: 0 })));
      fetchDashboard().then((d) => {
        const dots: Partial<Record<DomainSlug, 'high' | 'medium'>> = {};
        for (const dom of CANONICAL_DOMAINS) {
          const key = SLUG_TO_ENGINE_KEY[dom.slug];
          const hoch = (d.obligations.by_domain_high[key] ?? d.obligations.by_domain_high[dom.slug] ?? 0);
          const offen = (d.obligations.by_domain[key] ?? d.obligations.by_domain[dom.slug] ?? 0);
          if (hoch > 0) dots[dom.slug] = 'high';
          else if (offen > 0) dots[dom.slug] = 'medium';
        }
        setDomainDots(dots);
      });
    }
    // Die Sitzungsliste ist eine OEFFENTLICHE Route (guest_key als Ausweis)
    // und laeuft deshalb auch ohne Anmeldung — sie feuert ohnehin nur, wenn
    // ueberhaupt ein guest_key vorliegt. Ohne API bleibt die Liste leer und
    // die Nav-Ebene erscheint gar nicht; eine Fixture-Sitzung in der
    // Navigation waere eine Behauptung.
    fetchSessions().then(setSessions).catch(() => {});
  }, [hasSession]);

  // Welche Sitzung ist offen? /results?session=<id> ist der einzige Ort, an
  // dem eine einzelne Sitzung angezeigt wird.
  const activeSessionId = new URLSearchParams(location.search).get('session');
  const activeSession = sessions.find((s2) => s2.id === activeSessionId) ?? null;
  const shownSessions = sessionsOpen ? sessions : (activeSession ? [activeSession] : []);
  const sessionLabel = (s2: SessionRowData) =>
    s2.label || [s2.country, (s2.categories ?? [])[0]].filter(Boolean).join(' · ') || t('shell.navSessions');
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'dashboard/termine' ? counts.requests : to === 'dashboard/notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  // One source for both rails: below `lg` the panel renders the same five groups
  // the sidebar renders above it, from the same SIDEBAR + DOMAINS constants and
  // with the same active test. The sessions sub-level is the one thing that does
  // NOT come along — it grows with every session, and /dashboard/sessions is the
  // page that lists exactly those.
  const domainGroup: WorkspaceNavGroup = {
    key: 'domains',
    label: t('shell.groupDomains'),
    items: DOMAINS.map((d) => {
      const target = `${base}/dashboard/workbench/${d.slug}`;
      const Icon = d.icon;
      return {
        key: d.slug,
        to: target,
        title: t(`domain.${d.key}`),
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t(`domain.${d.key}`)}
            {domainDots[d.slug] && <span className={`h-1.5 w-1.5 rounded-full ${DOT[domainDots[d.slug] as 'high' | 'medium']}`} />}
          </span>
        ),
        icon: <Icon size={18} />,
        active: location.pathname.startsWith(target) || activeDomain === d.label,
      };
    }),
  };
  const mobileGroups: WorkspaceNavGroup[] = SIDEBAR.flatMap((g) => {
    const group: WorkspaceNavGroup = {
      key: g.group,
      label: t(`shell.${g.groupKey}`),
      badge: g.badgeKey ? t(`shell.${g.badgeKey}`) : undefined,
      items: g.items.map((it) => {
        const target = `${base}/${it.to}`;
        const Icon = it.icon;
        const label = t(`shell.${it.labelKey}`);
        return {
          key: it.to,
          to: target,
          label,
          title: label,
          icon: <Icon size={18} />,
          count: it.count ?? badgeFor(it.to),
          active: it.exact
            ? location.pathname === target || location.pathname === `${target}/`
            : location.pathname.startsWith(target),
        };
      }),
    };
    // Same place the rail puts them: straight after the workspace group.
    return g.group === 'Workspace' ? [group, domainGroup] : [group];
  });

  return (
    <div className="flex h-dvh bg-surface text-fg">
      <Sidebar
        className="hidden lg:flex"
        logo={
          <NavLink to={`${base}/dashboard`} className="flex items-center gap-2">
            {/* 32 statt 38 px: die Sidebar ist w-60 (240 px), mit px-4 bleiben 208 px
                Spur. Bei 38 px waere das Lockup 186 px breit — es passt, aber
                mit 22 px Rest sitzt es in der schmalen Spur zu eng. Bei 32 px
                sind es 157 px, also 51 px Reserve.
                Die Bildmarke wird dadurch kleiner, das WORTZEICHEN bleibt
                groesser als vor dem Claim-Wegfall: 16,6 px statt 11,0 px. */}
            <Logo lockup="horizontal" href={null} className="h-[32px] w-auto" />
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
                if (it.to === 'dashboard/sessions') {
                  return (
                    <React.Fragment key={it.to}>
                      <div className="flex items-center">
                        <NavLink to={target} className="min-w-0 flex-1">
                          <NavItem icon={<Icon size={16} />} label={t(`shell.${it.labelKey}`)} count={it.count ?? badgeFor(it.to)} active={active} />
                        </NavLink>
                        {sessions.length > 0 && (
                          <button
                            type="button"
                            aria-expanded={sessionsOpen}
                            aria-label={t('shell.sessionsToggle', { defaultValue: 'Sitzungen ein- und ausklappen' })}
                            onClick={() => setSessionsOpen((v) => !v)}
                            className="shrink-0 rounded-md p-1 text-fg-tertiary transition-colors hover:text-fg"
                          >
                            <ChevronRight size={13} className={'transition-transform ' + (sessionsOpen ? 'rotate-90' : '')} />
                          </button>
                        )}
                      </div>
                      {shownSessions.map((s2) => (
                        <NavLink key={s2.id} to={`${base}/results?session=${s2.id}`} className="block">
                          <span
                            className={'ml-6 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors '
                              + (s2.id === activeSessionId
                                ? 'bg-brand-light font-bold text-fg'
                                : 'text-fg-secondary hover:bg-elevate/5')}
                          >
                            {s2.country && (
                              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.05em] text-fg-accent-emphasis">
                                {s2.country}
                              </span>
                            )}
                            <span className="truncate">{sessionLabel(s2)}</span>
                          </span>
                        </NavLink>
                      ))}
                      {!sessionsOpen && sessions.length > (activeSession ? 1 : 0) && (
                        <button
                          type="button"
                          onClick={() => setSessionsOpen(true)}
                          className="ml-6 block px-2.5 py-1 text-left text-[11px] font-semibold text-brand underline underline-offset-2"
                        >
                          {t('shell.sessionsAll', { count: sessions.length })}
                        </button>
                      )}
                    </React.Fragment>
                  );
                }
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
                            {domainDots[d.slug] && <span className={`h-1.5 w-1.5 rounded-full ${DOT[domainDots[d.slug] as 'high' | 'medium']}`} />}
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
            domains navigate from the sidebar group) und der Hell/Dunkel-Schalter.
            Der Schalter existierte bisher nur auf der Marketing-Fläche, im
            Control Center und in der globalen Navigation — im Arbeitsbereich
            gab es ihn nicht, obwohl jedes Token hier zweifarbig angelegt ist.
            Wer im Dunkelmodus arbeiten wollte, musste ihn auf der Startseite
            umstellen und zurücknavigieren. */}
        {/* Below lg the rail is gone and the bar carries the navigation: the
            page title IS the switcher. Search and the bell stay in it; the
            theme switch, the mock marker and the account block sit under the
            open panel, where there is room. */}
        <WorkspaceMobileBar
          groups={mobileGroups}
          homeHref={`${base}/dashboard`}
          fallbackTitle={t('shell.navDashboard')}
          switchLabel={t('shell.switchTo', { defaultValue: 'Wechseln zu' })}
          logo={<Logo lockup="symbol" href={null} />}
          actions={
            <>
              <button type="button" aria-label={t('shell.search')} onClick={() => setSearchOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg text-fg-secondary transition-colors hover:text-fg">
                <Search size={19} />
              </button>
              <Link
                to={`/${locale}/dashboard/notifications`}
                aria-label={t('shell.navNotifications')}
                className="relative grid h-11 w-11 place-items-center rounded-lg text-fg-secondary transition-colors hover:text-fg"
              >
                <Bell size={19} />
                {(counts.unread ?? 0) > 0 && (
                  <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </Link>
            </>
          }
          footer={
            <div className="flex items-center gap-2.5 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-accent text-[11px] font-bold text-fg-on-accent">{initials}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-body-sm font-semibold text-fg">{displayName}</p>
                <p className="truncate text-body-2xs text-fg-tertiary">{displaySub}</p>
              </div>
              {isMockApi && (
                <span className="rounded-full border border-accent/55 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
                  Mock-Daten
                </span>
              )}
              <ThemeToggle size={40} className="rounded-lg" />
              <button
                type="button"
                aria-label={t('shell.signOut')}
                onClick={async () => { await logout(); window.location.href = `/${locale}/login`; }}
                className="grid h-11 w-11 place-items-center rounded-lg text-fg-tertiary transition-colors hover:text-fg"
              >
                <LogOut size={18} />
              </button>
            </div>
          }
        />
        <div className="hidden items-center justify-end gap-1 border-b border-stroke px-4 py-1.5 lg:flex">
          <button type="button" aria-label={t('shell.search')} onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
            <Search size={17} />
          </button>
          {/* Nur im Dev-Server mit VITE_MOCK_API=1: macht sichtbar, dass die
              Daten aus dem eingebauten Datensatz kommen — sonst ist ein
              versehentlich normal gestarteter Server nicht vom Mock zu
              unterscheiden. */}
          {isMockApi && (
            <span className="rounded-full border border-accent/55 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
              Mock-Daten
            </span>
          )}
          {/* Glocke (Canvas-Wahl 5B, 2026-09-05): fuehrt direkt zu den
              Benachrichtigungen; ein goldener Punkt, sobald etwas ungelesen ist —
              dieselbe Zahl, die die Seitenleiste traegt. */}
          <Link
            to={`/${locale}/dashboard/notifications`}
            aria-label={t('shell.navNotifications')}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg"
          >
            <Bell size={17} />
            {(counts.unread ?? 0) > 0 && (
              <span aria-hidden="true" className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
            )}
          </Link>
          {/* 36 px und rounded-lg statt der Vorgaben der Komponente, damit die
              Knöpfe in der Leiste dieselbe Fläche haben. */}
          <ThemeToggle size={36} className="rounded-lg" />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AssistantWidget />
    </div>
  );
}
