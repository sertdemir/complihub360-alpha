import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, FolderClosed, Bell, BookOpen, Bookmark, CalendarCheck,
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
import { fetchUserRequests } from '../../api/requests';
import { Avatar } from '../ui/Avatar';
import { initialsOf } from '../../lib/initials';

// ─── UserShell ────────────────────────────────────────────────────────────────
// The user App-Workspace frame (always dark slate), mirroring the Figma User
// Dashboard v2 two-axis navigation: slim left sidebar (WORKSPACE / DOMAINS /
// NEW FEATURES) + global Domain Bar on top of the content column.
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
    // Nutzer-Wahl 2026-09-22 (Dashboard Iteration 2): Bibliothek, Gespeichert
    // und Monitoring stehen unter EINER Ueberschrift "Neue Funktionen". Alle
    // vier Flaechen laufen noch auf ComingSoonPage — das "Bald" bleibt, damit
    // man das vor dem Klick sieht. Exporte entfiel am 2026-09-20: der echte
    // PDF-Export lebt auf der Ergebnisseite und im Sitzungs-Menue.
    group: 'NewFeatures',
    groupKey: 'groupNewFeatures',
    badgeKey: 'badgeSoon',
    items: [
      { to: 'dashboard/library', labelKey: 'navLibrary', icon: BookOpen },
      { to: 'dashboard/saved-providers', labelKey: 'navSavedProviders', icon: Bookmark },
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
const DOMAINS_OPEN_KEY = 'c360_nav_domains_open';

/** Neu-Zaehler an Bereichen: Petrol-Pille, auch als Bubble am Icon. */
function NewsPill({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={'inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-[5px] text-[10.5px] font-bold leading-none tabular-nums text-fg-on-brand ' + className}>
      {n}
    </span>
  );
}

export function UserShell({ activeDomain, children }: { activeDomain?: string; children: React.ReactNode }) {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  // Real session identity when present; the design fixture only as fallback.
  const { userName, user, session, logout } = useAuthStore();
  const displayName = userName || 'Alex Weber';
  const displaySub = user?.email || 'Acme GmbH';
  const initials = initialsOf(displayName);
  const base = `/${locale}`;
  // B16: workspace search drawer · C1: live sidebar badges (hidden in fixture mode).
  const [searchOpen, setSearchOpen] = useState(false);
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  const [domainDots, setDomainDots] = useState<Partial<Record<DomainSlug, 'high' | 'medium'>>>({});
  const [domainNews, setDomainNews] = useState<Partial<Record<DomainSlug, number>>>({});
  // Bereiche eingeklappt als Icon-Leiste (Canvas V3, 2026-09-22). Offen, wenn
  // man gerade IN einem Bereich steht — sonst weiss niemand, wo er ist. Die
  // eigene Wahl merkt sich der Browser, weil jede Seite ihre Shell neu baut.
  const inDomain = location.pathname.includes('/dashboard/workbench/') || !!activeDomain;
  const [domainsOpen, setDomainsOpen] = useState<boolean>(() => {
    if (inDomain) return true;
    try { return localStorage.getItem(DOMAINS_OPEN_KEY) === '1'; } catch { return false; }
  });
  const toggleDomains = () => setDomainsOpen((v) => {
    try { localStorage.setItem(DOMAINS_OPEN_KEY, v ? '0' : '1'); } catch { /* privat/gesperrt: nur fuer diese Seite */ }
    return !v;
  });
  // Sitzungen: nur noch die Anzahl am Nav-Eintrag (Nutzer-Wahl 2026-09-22,
  // Dashboard Iteration 2). Die zweite Nav-Ebene mit Chevron und "Alle N
  // Sitzungen" entfiel — erreichbar sind Sitzungen allein ueber die
  // Uebersichtsseite /dashboard/sessions. Gezaehlt werden die AKTIVEN — so
  // wie "Gespeicherte Sitzungen" auf dem Dashboard; Archivierte liegen auf der
  // Uebersicht eingeklappt und zaehlen nicht mit.
  const [sessions, setSessions] = useState<SessionRowData[]>([]);
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
      const post = fetchMyNotifications();
      post
        .then((f) => setCounts((c) => ({ ...c, unread: f.unread })))
        .catch(() => setCounts((c) => ({ ...c, unread: 0 })));
      // Neu-Zaehler je Bereich (Canvas V3, 2026-09-22): ungelesene Post zu
      // Anfragen, deren Bereich die Anfrage selbst traegt. Offene Pflichten
      // mit hohem Risiko zaehlen bewusst NICHT — das ist ein Zustand, keine
      // Neuigkeit, und als Zaehler waere es ein Dauer-Alarm (DNA).
      Promise.all([post, fetchUserRequests()])
        .then(([f, rs]) => {
          const bereichVon = new Map(rs.map((r) => [r.uuid, r.category]));
          const neu: Partial<Record<DomainSlug, number>> = {};
          for (const n of f.items) {
            if (!n.unread || n.subject !== 'engagement' || !n.subjectId) continue;
            const slug = bereichVon.get(n.subjectId) as DomainSlug | undefined;
            if (slug && slug in DOMAIN_ICON) neu[slug] = (neu[slug] ?? 0) + 1;
          }
          setDomainNews(neu);
        })
        .catch(() => {});
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
    // ueberhaupt ein guest_key vorliegt. Ohne API bleibt die Zahl weg; eine
    // Fixture-Zahl in der Navigation waere eine Behauptung.
    fetchSessions().then(setSessions).catch(() => {});
  }, [hasSession]);

  const badgeFor = (to: string): string | undefined => {
    const n = to === 'dashboard/termine' ? counts.requests
      : to === 'dashboard/notifications' ? counts.unread
      : to === 'dashboard/sessions' ? sessions.filter((s2) => s2.status !== 'archived').length
      : undefined;
    return n ? String(n) : undefined;
  };

  // One source for both rails: below `lg` the panel renders the same three groups
  // the sidebar renders above it, from the same SIDEBAR + DOMAINS constants and
  // with the same active test and the same counts.
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
        count: domainNews[d.slug] ? String(domainNews[d.slug]) : undefined,
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
            {/* 32 statt 36 px: die Sidebar ist w-60 (240 px), mit px-4 bleiben
                208 px Spur. Bei 36 px waere das Lockup 177 px breit — es
                passt, fuellt die schmale Spur aber zu 85 %. Bei 32 px sind
                es 157 px, also 75 % und 51 px Reserve.
                Die Bildmarke wird dadurch kleiner, das WORTZEICHEN bleibt
                groesser als vor dem Claim-Wegfall: 16,6 px statt 11,0 px. */}
            <Logo lockup="horizontal" href={null} className="h-[32px] w-auto" />
          </NavLink>
        }
        footer={
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <Avatar size="md" initials={initials} tone="accent" />
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
              <div className="px-3 py-2">
                <button
                  type="button"
                  aria-expanded={domainsOpen}
                  aria-controls="nav-domains"
                  onClick={toggleDomains}
                  className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('shell.groupDomains')}</span>
                  <ChevronRight size={14} className={'ml-auto text-fg-tertiary transition-transform ' + (domainsOpen ? 'rotate-90' : '')} />
                </button>
                <div id="nav-domains">
                  {domainsOpen ? (
                    <div className="space-y-0.5">
                      {DOMAINS.map((d) => {
                        const target = `${base}/dashboard/workbench/${d.slug}`;
                        const active = location.pathname.startsWith(target) || activeDomain === d.label;
                        const Icon = d.icon;
                        const neu = domainNews[d.slug];
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
                              count={neu ? <NewsPill n={neu} /> : undefined}
                              active={active}
                            />
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1 px-1.5 pb-1 pt-0.5">
                      {DOMAINS.map((d) => {
                        const target = `${base}/dashboard/workbench/${d.slug}`;
                        const Icon = d.icon;
                        const name = t(`domain.${d.key}`);
                        const neu = domainNews[d.slug];
                        return (
                          <NavLink
                            key={d.slug}
                            to={target}
                            title={name}
                            aria-label={neu ? `${name} · ${t('shell.domainNews', { count: neu })}` : name}
                            className="relative grid h-[34px] place-items-center rounded-lg text-fg-tertiary transition-colors hover:bg-black/[0.04] hover:text-fg-brand dark:hover:bg-white/[0.05]"
                          >
                            <Icon size={16} />
                            {neu ? <NewsPill n={neu} className="absolute right-0.5 top-0 h-4 min-w-4 text-[9.5px] ring-2 ring-white dark:ring-[#0F162A]" /> : null}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
              <Avatar size="md" initials={initials} tone="accent" className="shrink-0" />
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
