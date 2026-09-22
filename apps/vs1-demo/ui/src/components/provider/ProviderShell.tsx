import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, LineChart, Globe, ReceiptEuro, Settings, Bell, CircleHelp, Search } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { WorkspaceMobileBar, type WorkspaceNavGroup } from '../ui/WorkspaceMobileBar';
import { Logo } from '../ui/Logo';
import { PartnerStatusBadge, AvailabilityPill } from '../ui/ProviderBadges';
import { SearchDrawer, HelpDrawer } from './ProviderDrawers';
import { BellPopover } from './BellPopover';
import { ConfirmDrawer, type ConfirmSpec } from './ConfirmDrawer';
import { ProviderOnboardingModal, ProviderProfileBanner } from './ProviderOnboardingModal';
import { fetchProviderBookings } from '../../api/bookings';
import { fetchEventLogFeed } from '../../api/notifications';
import { fetchCoverage, setAvailability, AVAILABILITY_EVENT } from '../../api/provider';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

// ─── ProviderShell ────────────────────────────────────────────────────────────
// The provider App-Workspace frame, mirroring the Figma dashboards (always dark
// slate): left AppShell/Sidebar — Provider (PIPELINE / BUSINESS / ACCOUNT) +
// Topbar (search · availability · verified badge) + scrollable main. The shell
// forces `dark` — the workspace has no light mode (matches auth/onboarding).

const NAV = [
  {
    groupKey: 'shell.groupPipeline',
    items: [
      // v2: Termine/Leads (bookings) replace the retired request/confirm pipeline.
      { to: 'termine', labelKey: 'shell.navTermine', icon: CalendarCheck },
      { to: 'performance', labelKey: 'shell.navPerformance', icon: LineChart },
    ],
  },
  {
    groupKey: 'shell.groupBusiness',
    items: [
      { to: 'coverage', labelKey: 'shell.navCoverage', icon: Globe },
      { to: 'billing', labelKey: 'shell.navBilling', icon: ReceiptEuro },
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

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  const base = `/${locale}/partner-dashboard`;
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // C1: live sidebar badges — open confirms + unread notifications. Badge stays
  // hidden until the API answers (fixture mode shows no counts).
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  useEffect(() => {
    fetchProviderBookings()
      .then((bs) => setCounts((c) => ({ ...c, requests: bs.filter((b) => b.status === 'confirmed').length })))
      .catch(() => {});
    // Der Anbieter-Bereich haengt noch am Betriebsprotokoll: eine eigene
    // Quelle fuer Anbieter gibt es nicht, weil `providers` keine Spalte hat,
    // die auf ein Konto zeigt. Die Route ist admin-pflichtig, der Zaehler
    // bleibt fuer Partner also aus — besser als eine erfundene Zahl.
    fetchEventLogFeed()
      .then((f) => setCounts((c) => ({ ...c, unread: f.groups.reduce((n, g) => n + g.items.filter((i) => i.unread).length, 0) })))
      .catch(() => {});
  }, []);
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'termine' ? counts.requests : to === 'notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  // C2: live availability — the pill toggles OOO via a confirm step.
  const [availability, setAvail] = useState<'available' | 'ooo'>('available');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  // v2 vetting (§10): the badge reflects partner_status instead of a hardcoded
  // "verified" — a not-yet-vetted provider sees "Pending".
  const [vetted, setVetted] = useState(true);
  useEffect(() => {
    fetchCoverage().then((c) => {
      if (c.availability) setAvail(c.availability);
      if (c.partner_status) setVetted(c.partner_status === 'active');
    }).catch(() => {});
    const onSync = (e: Event) => setAvail((e as CustomEvent<'available' | 'ooo'>).detail);
    window.addEventListener(AVAILABILITY_EVENT, onSync);
    return () => window.removeEventListener(AVAILABILITY_EVENT, onSync);
  }, []);
  const togglAvailability = () => {
    if (availability === 'available') {
      setConfirm({
        title: t('shell.oooStartTitle'),
        consequence: t('shell.oooStartConsequence'),
        confirmLabel: t('shell.oooStartConfirm'),
        onConfirm: async () => { await setAvailability('ooo').catch(() => {}); },
      });
    } else {
      setConfirm({
        title: t('shell.oooEndTitle'),
        consequence: t('shell.oooEndConsequence'),
        confirmLabel: t('shell.oooEndConfirm'),
        onConfirm: async () => { await setAvailability('available').catch(() => {}); },
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
        active: location.pathname.includes(`/partner-dashboard/${it.to}`),
      };
    }),
  }));

  const availabilityButton = (
    <button type="button" onClick={togglAvailability} aria-label={t('shell.availabilityAria')} className="transition-opacity hover:opacity-80">
      <AvailabilityPill status={availability === 'ooo' ? 'offline' : 'available'} label={availability === 'ooo' ? t('shell.outOfOffice') : undefined} />
    </button>
  );
  const statusBadge = <PartnerStatusBadge status={vetted ? 'verified' : 'pending'} label={vetted ? 'Verified Provider' : 'Pending review'} />;

  return (
    <div className="flex h-dvh bg-surface text-fg">
      {/* Erst das Profil, dann der Workspace: solange das Onboarding nicht
          abgeschlossen ist, liegt das Modal ueber JEDER Workspace-Seite —
          deshalb hier in der Shell, nicht auf einer Route. */}
      <ProviderOnboardingModal />
      <Sidebar
        className="hidden lg:flex"
        logo={
          <NavLink to={base} className="flex items-center gap-2">
            {/* 32 statt 36 px: die Sidebar ist w-60 (240 px), mit px-4 bleiben
                208 px Spur. Bei 36 px waere das Lockup 177 px breit — es
                passt, fuellt die schmale Spur aber zu 85 %. Bei 32 px sind
                es 157 px, also 75 % und 51 px Reserve.
                Die Bildmarke wird dadurch kleiner, das WORTZEICHEN bleibt
                groesser als vor dem Claim-Wegfall: 16,6 px statt 11,0 px. */}
            <Logo lockup="horizontal" href={null} className="h-[32px] w-auto" />
            {/* accent-STRONG: at 9px this needs 4.5:1, and gold-500 measures 2.10 on the
                light sidebar. See --color-text-accent-strong in index.css. */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent-strong">{t('shell.partnerBadge')}</span>
          </NavLink>
        }
        footer={
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <Avatar size="md" initials="GD" tone="accent" />
              <div className="leading-tight">
                <p className="text-[12px] font-semibold text-fg">G. Dahlmann</p>
                <p className="text-[10px] text-fg-tertiary">Dahlmann CPA</p>
              </div>
            </div>
            <Settings size={15} className="text-fg-tertiary" />
          </div>
        }
      >
        {NAV.map((g) => (
          <SidebarGroup key={g.groupKey} label={t(g.groupKey)}>
            {g.items.map((it) => {
              const active = location.pathname.includes(`/partner-dashboard/${it.to}`);
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
            and the bell stay in it; availability and the vetting badge move
            under the open panel — they do not fit beside a title at 390px, and
            they are status, not controls a provider reaches for mid-task. */}
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
                <Avatar size="md" initials="GD" tone="accent" className="shrink-0" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-body-sm font-semibold text-fg">G. Dahlmann</p>
                  <p className="text-body-2xs text-fg-tertiary">Dahlmann CPA</p>
                </div>
                {statusBadge}
              </div>
              {/* self-start: der Knopf ist blockbreit, die Pille darin zentriert
                  sich sonst mitten im Panel und liest sich als Überschrift. */}
              <div className="self-start">{availabilityButton}</div>
            </div>
          }
        />
        <header className="hidden h-15 min-h-[60px] shrink-0 items-center justify-end gap-3 border-b border-elevate/10 px-6 lg:flex">
          <button type="button" aria-label={t('shell.searchAria')} onClick={() => setSearchOpen(true)} className="mr-1 text-fg-tertiary transition-colors hover:text-fg">
            <Search size={18} />
          </button>
          <BellPopover unread={counts.unread} onAllRead={() => setCounts((c) => ({ ...c, unread: 0 }))} />
          {availabilityButton}
          {statusBadge}
        </header>
        <main className={cn('flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6')}>
          {/* O5-C: bis das Profil 100 % erreicht, steht der Vollstaendigkeits-
              Banner ueber JEDER Workspace-Seite — deshalb hier, nicht je Seite. */}
          <ProviderProfileBanner />
          {children}
        </main>
      </div>
      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
