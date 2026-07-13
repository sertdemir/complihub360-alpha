import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, LineChart, Globe, ReceiptEuro, Settings, Bell, CircleHelp, Search } from 'lucide-react';
import { Sidebar, SidebarGroup, NavItem } from '../ui/AppShell';
import { LogoMark } from '../ui/Logo';
import { PartnerStatusBadge, AvailabilityPill } from '../ui/ProviderBadges';
import { SearchDrawer, HelpDrawer } from './ProviderDrawers';
import { BellPopover } from './BellPopover';
import { ConfirmDrawer, type ConfirmSpec } from './ConfirmDrawer';
import { fetchProviderRequests } from '../../api/requests';
import { fetchUnreadCount } from '../../api/notifications';
import { fetchCoverage, setAvailability, AVAILABILITY_EVENT } from '../../api/provider';
import { cn } from '../../lib/utils';

// ─── ProviderShell ────────────────────────────────────────────────────────────
// The provider App-Workspace frame, mirroring the Figma dashboards (always dark
// slate): left AppShell/Sidebar — Provider (PIPELINE / BUSINESS / ACCOUNT) +
// Topbar (search · availability · verified badge) + scrollable main. The shell
// forces `dark` — the workspace has no light mode (matches auth/onboarding).

const NAV = [
  {
    group: 'Pipeline',
    items: [
      { to: 'requests', label: 'Requests', icon: Mail },
      { to: 'performance', label: 'Performance', icon: LineChart },
    ],
  },
  {
    group: 'Business',
    items: [
      { to: 'coverage', label: 'Coverage', icon: Globe },
      { to: 'billing', label: 'Billing', icon: ReceiptEuro },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: 'settings', label: 'Settings', icon: Settings },
      { to: 'notifications', label: 'Notifications', icon: Bell },
      { to: 'help', label: 'Help & support', icon: CircleHelp },
    ],
  },
];

export function ProviderShell({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  const location = useLocation();
  const base = `/${locale}/partner-dashboard`;
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // C1: live sidebar badges — open confirms + unread notifications. Badge stays
  // hidden until the API answers (fixture mode shows no counts).
  const [counts, setCounts] = useState<{ requests?: number; unread?: number }>({});
  useEffect(() => {
    fetchProviderRequests()
      .then((rs) => setCounts((c) => ({ ...c, requests: rs.filter((r) => r.status === 'awaiting-confirm').length })))
      .catch(() => {});
    fetchUnreadCount()
      .then((n) => setCounts((c) => ({ ...c, unread: n })))
      .catch(() => {});
  }, []);
  const badgeFor = (to: string): string | undefined => {
    const n = to === 'requests' ? counts.requests : to === 'notifications' ? counts.unread : undefined;
    return n ? String(n) : undefined;
  };

  // C2: live availability — the pill toggles OOO via a confirm step.
  const [availability, setAvail] = useState<'available' | 'ooo'>('available');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  useEffect(() => {
    fetchCoverage().then((c) => c.availability && setAvail(c.availability)).catch(() => {});
    const onSync = (e: Event) => setAvail((e as CustomEvent<'available' | 'ooo'>).detail);
    window.addEventListener(AVAILABILITY_EVENT, onSync);
    return () => window.removeEventListener(AVAILABILITY_EVENT, onSync);
  }, []);
  const togglAvailability = () => {
    if (availability === 'available') {
      setConfirm({
        title: 'Go out of office?',
        consequence: 'New requests are paused and re-routed to other partners. Your ranking is frozen while away — SLA timers resume on return. End it early anytime.',
        confirmLabel: 'Set out of office',
        onConfirm: async () => { await setAvailability('ooo').catch(() => {}); },
      });
    } else {
      setConfirm({
        title: 'End out of office?',
        consequence: 'You go back to Available — new requests route to you again and SLA timers resume immediately.',
        confirmLabel: 'End out of office',
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
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent">Partner</span>
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
          <SidebarGroup key={g.group} label={g.group}>
            {g.items.map((it) => {
              const active = location.pathname.includes(`/partner-dashboard/${it.to}`);
              const Icon = it.icon;
              if (it.to === 'help') {
                return (
                  <button key={it.to} type="button" className="block w-full text-left" onClick={() => setHelpOpen(true)}>
                    <NavItem icon={<Icon size={16} />} label={it.label} active={false} />
                  </button>
                );
              }
              return (
                <NavLink key={it.to} to={`${base}/${it.to}`}>
                  <NavItem icon={<Icon size={16} />} label={it.label} count={badgeFor(it.to)} active={active} />
                </NavLink>
              );
            })}
          </SidebarGroup>
        ))}
      </Sidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-15 min-h-[60px] shrink-0 items-center justify-end gap-3 border-b border-white/10 px-6">
          <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="mr-1 text-fg-tertiary transition-colors hover:text-fg">
            <Search size={18} />
          </button>
          <BellPopover unread={counts.unread} onAllRead={() => setCounts((c) => ({ ...c, unread: 0 }))} />
          <button type="button" onClick={togglAvailability} aria-label="Toggle availability" className="transition-opacity hover:opacity-80">
            <AvailabilityPill status={availability === 'ooo' ? 'offline' : 'available'} label={availability === 'ooo' ? 'Out of office' : undefined} />
          </button>
          <PartnerStatusBadge status="verified" label="Verified Partner" />
        </header>
        <main className={cn('flex-1 overflow-y-auto px-8 py-6')}>{children}</main>
      </div>
      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
