import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, CalendarCheck, LineChart, Globe, ShieldCheck, ReceiptEuro, Gauge, Settings, Bell, CircleHelp, Search } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { WorkspaceMobileBar, type WorkspaceNavGroup } from '../ui/WorkspaceMobileBar';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { PartnerStatusBadge, AvailabilityPill } from '../ui/ProviderBadges';
import { SearchDrawer, HelpDrawer } from './ProviderDrawers';
import { BellPopover } from './BellPopover';
import { ConfirmDrawer, type ConfirmSpec } from './ConfirmDrawer';
import { ApplicationStatusBanner } from './ApplicationStatusBanner';
import { fetchProviderBookings } from '../../api/bookings';
import { fetchPartnerNotifications } from '../../api/partnerNotifications';
import { fetchCoverage, setAvailability, syncAvailability, fetchMyProvider } from '../../api/provider';
import { useAuthStore } from '../../store/useAuthStore';
import { isMockApi } from '../../lib/supabase';

// ─── ProviderShell ────────────────────────────────────────────────────────────
// Der Rahmen des Provider-Arbeitsbereichs — seit dem Angleich an das
// User-Dashboard (Canvas „Partner-Workspace Angleich", Nutzer-Wahl A1 V1 und
// A2 V1, 2026-10-16) dieselbe Struktur wie die UserShell:
//   · Sidebar: Logo + „PROVIDER", drei Gruppen, KEIN Konto-Fuss mehr (der
//     Nutzer hatte am 2026-09-22 fuer den User-Bereich entschieden: nur der
//     Firmenname und „Abmelden", kein Avatar, kein Personenname — das gilt
//     jetzt fuer beide Shells).
//   · Kopfzeile: links der Status (Verfuegbarkeit, Verified), wo beim User die
//     Hauptaktion steht — der Provider hat keine „Neues Assessment"-Aktion,
//     sein Status ist seine Lage; rechts Suche · Glocke · Hell/Dunkel |
//     Firmenname · Abmelden.
//   · Hauptflaeche: der Gradient (CLAUDE.md „Gradient") als Buehne fuer JEDE
//     Seite — vorher lag der Provider-Bereich flach auf bg-surface, das war
//     der Befund „Hintergrund ist noch hell".
// Nav-Texte liegen im Namensraum 'providerws'.

const NAV = [
  {
    groupKey: 'shell.groupPipeline',
    items: [
      // Phase 6 (ADR-0009 Nr. 5): die Übersicht ist die Startseite — was heute
      // ansteht, und wo das Konto steht. Die Anfragen-Seite ist abgehängt.
      { to: 'overview', labelKey: 'shell.navOverview', icon: LayoutDashboard },
      // v2: Termine/Leads (bookings) replace the retired request/confirm pipeline.
      { to: 'termine', labelKey: 'shell.navTermine', icon: CalendarCheck },
      { to: 'performance', labelKey: 'shell.navPerformance', icon: LineChart },
    ],
  },
  {
    groupKey: 'shell.groupBusiness',
    items: [
      { to: 'coverage', labelKey: 'shell.navCoverage', icon: Globe },
      // Phase 2: Bewerbung + Verification Center (Dossier, Freigabematrix).
      { to: 'verification', labelKey: 'shell.navVerification', icon: ShieldCheck },
      { to: 'billing', labelKey: 'shell.navBilling', icon: ReceiptEuro },
      // TKT-PROV-09: eigener Eintrag statt Unterseite von Billing — die
      // Tarifwahl ist eine eigene Route und ein eigener Vorgang. Gauge, nicht
      // Star: ein Stern laese sich wie ein Guetesiegel, und die DNA schliesst
      // Siegel ohne Beleg aus.
      { to: 'subscription', labelKey: 'shell.navSubscription', icon: Gauge },
    ],
  },
  {
    groupKey: 'shell.groupAccount',
    items: [
      { to: 'settings', labelKey: 'shell.navSettings', icon: Settings },
      { to: 'notifications', labelKey: 'shell.navNotifications', icon: Bell },
      { to: 'help', labelKey: 'shell.navHelp', icon: CircleHelp },
    ],
  },
];

/** „Abmelden" als reiner Textknopf — dieselbe Klasse wie in der UserShell. */
const SIGN_OUT = 'rounded-lg text-[13px] font-medium text-fg-secondary transition-colors hover:text-fg';

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  const base = `/${locale}/provider-dashboard`;
  const [searchOpen, setSearchOpen] = useState(false);
  // Firmenname in der Kopfzeile (Staging-Befund 2026-10-09: vorher stand fest
  // „K. Schmidt · Schmidt & Partner", egal wer angemeldet war). Der Name des
  // Anbieters kommt aus /me/provider; ohne echte Sitzung (Demo-Login) steht
  // der Design-Platzhalter, mit Sitzung aber ohne Antwort steht nichts statt
  // einer erfundenen Firma — wie in der UserShell.
  const { session, logout } = useAuthStore();
  const [providerName, setProviderName] = useState<string | null>(session ? null : 'Schmidt & Partner');
  useEffect(() => {
    let alive = true;
    fetchMyProvider().then((p) => { if (alive && p.name) setProviderName(p.name); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const signOut = async () => { await logout(); window.location.href = `/${locale}/login`; };

  const [helpOpen, setHelpOpen] = useState(false);
  // C1: live sidebar badges — open confirms + unread notifications. Badge stays
  // hidden until the API answers (fixture mode shows no counts).
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  useEffect(() => {
    fetchProviderBookings()
      .then((bs) => setCounts((c) => ({ ...c, requests: bs.filter((b) => b.status === 'confirmed').length })))
      .catch(() => {});
    // Die eigene Post des Partners (provider_members → public.notifications).
    // Vorher das Betriebsprotokoll, das Partnern mit 403 antwortet.
    fetchPartnerNotifications()
      .then((ns) => setCounts((c) => ({ ...c, unread: ns.filter((n) => n.unread).length })))
      .catch(() => {});
  }, []);
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'termine' ? counts.requests : to === 'notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  // C2: live availability — the pill toggles OOO via a confirm step. 'ooo'
  // heisst pausiert: nicht in neuen Ergebnissen, nicht buchbar (Server).
  const [availability, setAvail] = useState<'available' | 'ooo'>('available');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  // v2 vetting (§10): the badge reflects partner_status instead of a hardcoded
  // "verified" — a not-yet-vetted provider sees "Pending".
  const [vetted, setVetted] = useState(true);
  useEffect(() => {
    // Ein Umschalten (hier oder in den Einstellungen) ist neuer als die Zeile,
    // die noch laedt — sie setzt es nicht zurueck.
    const sync = syncAvailability(setAvail);
    fetchCoverage().then((c) => {
      if (c.availability) sync.loaded(c.availability);
      if (c.partner_status) setVetted(c.partner_status === 'active');
    }).catch(() => {});
    return sync.stop;
  }, []);
  const togglAvailability = () => {
    if (availability === 'available') {
      setConfirm({
        title: t('shell.oooStartTitle'),
        consequence: t('shell.oooStartConsequence'),
        confirmLabel: t('shell.oooStartConfirm'),
        // Scheitert das Speichern, bleibt der Drawer offen und sagt es (C2) —
        // vorher schloss er sich still, und der Schalter stand wie vorher.
        onConfirm: () => setAvailability('ooo'),
        failure: t('shell.oooFailed'),
      });
    } else {
      setConfirm({
        title: t('shell.oooEndTitle'),
        consequence: t('shell.oooEndConsequence'),
        confirmLabel: t('shell.oooEndConfirm'),
        onConfirm: () => setAvailability('available'),
        failure: t('shell.oooFailed'),
      });
    }
  };

  // One source for both rails: below `lg` the panel renders exactly what the
  // sidebar renders above it. "Hilfe & Support" stays a button in both — it
  // opens a drawer, it is not a destination.
  const mobileGroups: WorkspaceNavGroup[] = NAV.map((g) => ({
    key: g.groupKey,
    label: t(g.groupKey),
    items: g.items.map((it) => {
      const Icon = it.icon;
      const label = t(it.labelKey);
      return {
        key: it.to,
        to: it.to === 'help' ? undefined : `${base}/${it.to}`,
        onSelect: it.to === 'help' ? () => setHelpOpen(true) : undefined,
        label,
        title: label,
        icon: <Icon size={18} />,
        count: badgeFor(it.to),
        active: location.pathname.includes(`/provider-dashboard/${it.to}`),
      };
    }),
  }));

  const availabilityButton = (
    <button type="button" onClick={togglAvailability} aria-label={t('shell.availabilityAria')} className="transition-opacity hover:opacity-80">
      <AvailabilityPill status={availability === 'ooo' ? 'offline' : 'available'} label={availability === 'ooo' ? t('shell.outOfOffice') : undefined} />
    </button>
  );
  const statusBadge = <PartnerStatusBadge status={vetted ? 'verified' : 'pending'} label={vetted ? 'Verified Provider' : 'Pending review'} />;
  // Nur im Dev-Server mit VITE_MOCK_API=1 (wie in der UserShell): macht
  // sichtbar, dass die Daten aus dem eingebauten Datensatz kommen.
  const mockMark = isMockApi && (
    <span className="rounded-full border border-accent/55 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">
      Mock-Daten
    </span>
  );

  return (
    <div className="flex h-dvh bg-surface text-fg">
      <Sidebar
        className="hidden lg:flex"
        logo={
          <NavLink to={base} className="flex items-center gap-2">
            {/* 32 statt 36 px: die Sidebar ist w-60 (240 px), mit px-4 bleiben
                208 px Spur. Bei 36 px waere das Lockup 177 px breit — es
                passt, fuellt die schmale Spur aber zu 85 %. Bei 32 px sind
                es 157 px, also 75 % und 51 px Reserve. */}
            <Logo lockup="horizontal" href={null} className="h-[32px] w-auto" />
            {/* accent-STRONG: at 9px this needs 4.5:1, and gold-500 measures 2.10 on the
                light sidebar. See --color-text-accent-strong in index.css. */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent-strong">{t('shell.partnerBadge')}</span>
          </NavLink>
        }
      >
        {NAV.map((g) => (
          <SidebarGroup key={g.groupKey} label={t(g.groupKey)}>
            {g.items.map((it) => {
              const active = location.pathname.includes(`/provider-dashboard/${it.to}`) || (it.to === 'verification' && location.pathname.includes('/provider-dashboard/application'));
              const Icon = it.icon;
              if (it.to === 'help') {
                // NavItem IS the button (AppShell) — wrapping it in another one
                // nested <button> inside <button>, which React flags and which no
                // browser parses the way it reads. Its own onClick does the job.
                return (
                  <NavItem
                    key={it.to}
                    icon={<Icon size={16} />}
                    label={t(it.labelKey)}
                    active={false}
                    onClick={() => setHelpOpen(true)}
                  />
                );
              }
              return (
                <NavLink key={it.to} to={`${base}/${it.to}`}>
                  <NavItem icon={<Icon size={16} />} label={t(it.labelKey)} count={badgeFor(it.to)} active={active} />
                </NavLink>
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below lg the rail is gone and the bar carries the navigation. Search
            and the bell stay in it; Status, Schalter und Konto sitzen unter dem
            offenen Panel — sie passen nicht neben einen Titel bei 390 px. */}
        <WorkspaceMobileBar
          groups={mobileGroups}
          homeHref={base}
          fallbackTitle={t('shell.partnerBadge')}
          switchLabel={t('shell.switchTo', { defaultValue: 'Wechseln zu' })}
          logo={<Logo lockup="symbol" href={null} />}
          actions={
            <>
              <button type="button" aria-label={t('shell.searchAria')} onClick={() => setSearchOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg text-fg-secondary transition-colors hover:text-fg">
                <Search size={19} />
              </button>
              <BellPopover unread={counts.unread} onAllRead={() => setCounts((c) => ({ ...c, unread: 0 }))} />
            </>
          }
          footer={
            <div className="flex flex-col gap-3 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-fg">{providerName}</p>
                {mockMark}
                <ThemeToggle size={40} className="rounded-lg" />
                <button type="button" onClick={signOut} className={SIGN_OUT + ' h-11 px-2'}>
                  {t('shell.signOut')}
                </button>
              </div>
              {/* self-start: der Knopf ist blockbreit, die Pille darin zentriert
                  sich sonst mitten im Panel und liest sich als Überschrift. */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="self-start">{availabilityButton}</div>
                {statusBadge}
              </div>
            </div>
          }
        />
        <div className="hidden items-center gap-1 border-b border-stroke px-4 py-1.5 lg:flex">
          {/* Links, wo beim User die Hauptaktion steht: der Status. Verfuegbarkeit
              ist ein Schalter (Confirm-Drawer), Verified ein Zustand. */}
          <div className="mr-auto flex items-center gap-2.5 pl-1">
            {availabilityButton}
            {statusBadge}
          </div>
          <button type="button" aria-label={t('shell.searchAria')} onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg">
            <Search size={17} />
          </button>
          {mockMark}
          {/* Glocke mit Popover (Canvas-Wahl A V2, 2026-10-10) — Trigger seit dem
              Angleich wie beim User: 36 px, Goldpunkt statt Zaehler. */}
          <BellPopover unread={counts.unread} onAllRead={() => setCounts((c) => ({ ...c, unread: 0 }))} />
          {/* Hell/Dunkel fehlte im Provider-Bereich bis 2026-10-16 ganz, obwohl
              jedes Token zweifarbig angelegt ist. */}
          <ThemeToggle size={36} className="rounded-lg" />
          {providerName && (
            <span className="ml-2 max-w-[220px] truncate border-l border-stroke pl-3 text-[13px] font-semibold text-fg" title={providerName}>
              {providerName}
            </span>
          )}
          <button type="button" onClick={signOut} className={SIGN_OUT + ' h-9 px-2'}>
            {t('shell.signOut')}
          </button>
        </div>
        {/* Die Buehne (A2 V1): der Gradient traegt jede Seite, die Seiten legen
            ihre Karten darauf — keine negativen Raender je Seite wie im
            User-Bereich noetig. */}
        <main className="flex-1 overflow-y-auto bg-gradient-stage px-4 py-6 lg:px-8 lg:py-7">
          {/* Phase 2: solange das Konto nicht aktiv ist, steht der Bewerbungs-
              stand ueber JEDER Workspace-Seite — deshalb hier, nicht je Seite.
              Quelle ist /me/provider, nicht mehr der localStorage. */}
          <ApplicationStatusBanner />
          {children}
        </main>
      </div>
      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
