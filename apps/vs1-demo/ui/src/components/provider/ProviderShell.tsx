import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, LineChart, Globe, ReceiptEuro, Settings, Bell, CircleHelp, Search } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';
import { PartnerStatusBadge, AvailabilityPill } from '../ui/ProviderBadges';
import { SearchDrawer, HelpDrawer } from './ProviderDrawers';
import { BellPopover } from './BellPopover';
import { ConfirmDrawer, type ConfirmSpec } from './ConfirmDrawer';
import { fetchProviderBookings } from '../../api/bookings';
import { fetchUnreadCount } from '../../api/notifications';
import { fetchCoverage, setAvailability, AVAILABILITY_EVENT, DEMO_PROVIDER_KEY } from '../../api/provider';
import { cn } from '../../lib/utils';

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
    fetchProviderBookings(DEMO_PROVIDER_KEY)
      .then((bs) => setCounts((c) => ({ ...c, requests: bs.filter((b) => b.status === 'confirmed').length })))
      .catch(() => {});
    fetchUnreadCount()
      .then((n) => setCounts((c) => ({ ...c, unread: n })))
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

  return (
    <div className="dark flex h-screen bg-[#1F2937] text-fg">
      <Sidebar
        logo={
          <NavLink to={base} className="flex items-center gap-2">
            <LogoMark tone="on-petrol" className="h-[22px] w-auto" />
            <span className="text-[15px] font-semibold text-white">CompliHub</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent">{t('shell.partnerBadge')}</span>
          </NavLink>
        }
        footer={
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d4af37] text-[11px] font-bold text-[#101411]">GD</span>
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
                return (
                  <button key={it.to} type="button" className="block w-full text-left" onClick={() => setHelpOpen(true)}>
                    <NavItem icon={<Icon size={16} />} label={t(it.labelKey)} active={false} />
                  </button>
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
        <header className="flex h-15 min-h-[60px] shrink-0 items-center justify-end gap-3 border-b border-white/10 px-6">
          <button type="button" aria-label={t('shell.searchAria')} onClick={() => setSearchOpen(true)} className="mr-1 text-fg-tertiary transition-colors hover:text-fg">
            <Search size={18} />
          </button>
          <BellPopover unread={counts.unread} onAllRead={() => setCounts((c) => ({ ...c, unread: 0 }))} />
          <button type="button" onClick={togglAvailability} aria-label={t('shell.availabilityAria')} className="transition-opacity hover:opacity-80">
            <AvailabilityPill status={availability === 'ooo' ? 'offline' : 'available'} label={availability === 'ooo' ? t('shell.outOfOffice') : undefined} />
          </button>
          <PartnerStatusBadge status={vetted ? 'verified' : 'pending'} label={vetted ? 'Verified Partner' : 'Pending review'} />
        </header>
        <main className={cn('flex-1 overflow-y-auto px-8 py-6')}>{children}</main>
      </div>
      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
