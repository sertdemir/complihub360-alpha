import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Home, FolderClosed, Mail, Bell, BookOpen, Bookmark, Download, TriangleAlert, Calendar, Search, Settings,
  Receipt, Package, ShieldCheck, Megaphone, Building2, LifeBuoy,
} from 'lucide-react';
import { AppShell, Sidebar, SidebarGroup, NavItem, DomainBar, DomainTab, MobileTopbar } from './AppShell';
import { Logo, LogoMark } from './Logo';
import { Avatar } from './Avatar';
import { Button } from './Button';

const DESCRIPTION = `
**AppShell** — the dashboard frame, mirroring the Compass *AppShell* (974:2) and the
User/Provider dashboards. Composable: **Sidebar** (logo + \`SidebarGroup\` + \`NavItem\` +
footer) · **DomainBar** (home + \`DomainTab\`s, two-axis nav) · content slot. The shell
uses slate panels (app-dark); nav/text use semantic tokens. **Light + dark**.
`;

const meta = {
  title: 'Organisms/AppShell',
  parameters: { layout: 'fullscreen', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const DOMAINS = [
  { id: 'tax', label: 'Tax & VAT', icon: <Receipt size={18} />, dot: true },
  { id: 'epr', label: 'Product & Packaging', icon: <Package size={18} />, dot: true },
  { id: 'gdpr', label: 'Data & Privacy', icon: <ShieldCheck size={18} />, dot: true },
  { id: 'mkt', label: 'Marketing & SEO', icon: <Megaphone size={18} /> },
  { id: 'corp', label: 'Corporate & Structure', icon: <Building2 size={18} /> },
  { id: 'full', label: 'Full Support', icon: <LifeBuoy size={18} /> },
];

function Dashboard({ dark }: { dark?: boolean }) {
  const [nav, setNav] = useState('dashboard');
  const [domain, setDomain] = useState('tax');
  return (
    <div className={dark ? 'dark' : undefined} style={{ height: '100vh' }}>
      <AppShell
        sidebar={
          <Sidebar
            logo={<Logo lockup="horizontal" tone={dark ? 'on-petrol' : 'on-light'} markClassName="h-8" />}
            footer={
              <div className="flex items-center gap-3">
                <Avatar size="sm" initials="AW" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-fg">Alex Weber</p>
                  <p className="truncate text-[11px] text-fg-tertiary">Acme GmbH</p>
                </div>
                <Settings size={18} className="shrink-0 text-fg-tertiary" />
              </div>
            }
          >
            <SidebarGroup label="Workspace">
              <NavItem icon={<Home size={18} />} label="Dashboard" active={nav === 'dashboard'} onClick={() => setNav('dashboard')} />
              <NavItem icon={<FolderClosed size={18} />} label="Sessions" active={nav === 'sessions'} onClick={() => setNav('sessions')} />
              <NavItem icon={<Mail size={18} />} label="Requests" count={3} active={nav === 'requests'} onClick={() => setNav('requests')} />
              <NavItem icon={<Bell size={18} />} label="Notifications" count={2} active={nav === 'notif'} onClick={() => setNav('notif')} />
            </SidebarGroup>
            <SidebarGroup label="Library">
              <NavItem icon={<BookOpen size={18} />} label="Library" active={nav === 'library'} onClick={() => setNav('library')} />
            </SidebarGroup>
            <SidebarGroup label="Saved">
              <NavItem icon={<Bookmark size={18} />} label="Saved Providers" active={nav === 'saved'} onClick={() => setNav('saved')} />
              <NavItem icon={<Download size={18} />} label="Exports" active={nav === 'exports'} onClick={() => setNav('exports')} />
            </SidebarGroup>
            <SidebarGroup label="Monitoring" badge="Soon">
              <NavItem icon={<TriangleAlert size={18} />} label="Alerts" />
              <NavItem icon={<Calendar size={18} />} label="Calendar" />
            </SidebarGroup>
          </Sidebar>
        }
        domainBar={
          <DomainBar
            home={<button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-secondary hover:text-fg"><Home size={18} /></button>}
            trailing={<button className="grid h-9 w-9 place-items-center rounded-lg text-fg-secondary hover:text-fg"><Search size={18} /></button>}
          >
            {DOMAINS.map((d) => (
              <DomainTab key={d.id} icon={d.icon} label={d.label} dot={d.dot} active={domain === d.id} onClick={() => setDomain(d.id)} />
            ))}
          </DomainBar>
        }
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[34px] font-bold leading-tight text-fg">
                Welcome back, <span className="text-fg-accent">Alex</span>.
              </h1>
              <p className="mt-1 text-body-sm text-fg-secondary">3 active requests · 2 sessions need a refresh · last activity 2h ago</p>
            </div>
            <Button>Start new search</Button>
          </div>
          <div className="mt-6 rounded-xl border border-stroke bg-surface p-5 text-fg-secondary">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-brand">Resume where you left off</p>
            <p className="mt-1 text-[17px] font-semibold text-fg">VAT registration · Italy</p>
            <p className="mt-1 text-body-sm">Wizard step 4 of 5 · last edit 2h ago · Tax & VAT · DE → IT</p>
          </div>
        </div>
      </AppShell>
    </div>
  );
}

export const DashboardDark: Story = { name: 'Dashboard (dark)', render: () => <Dashboard dark /> };
export const DashboardLight: Story = { name: 'Dashboard (light)', render: () => <Dashboard /> };

// Mobile chrome — Compass "AppShell / Topbar — Mobile" (1420:8695) + BottomTabBar.
export const MobileChromeDark: Story = {
  name: 'Mobile topbar (dark)',
  render: () => (
    <div className="dark mx-auto w-[390px] overflow-hidden rounded-xl bg-[#1F2937]">
      <MobileTopbar
        logo={<LogoMark tone="on-petrol" className="h-[22px] w-auto" />}
        contextLabel="Partner"
        actions={
          <>
            <Search size={20} className="text-fg-tertiary" />
            <span className="flex items-center gap-1.5 rounded-full border border-[#d4af37] px-2.5 py-1 text-[11px] font-semibold text-[#d4af37]">
              ✓ Verified
            </span>
          </>
        }
      />
      <div className="h-40 p-4 text-body-sm text-fg-secondary">Page content …</div>
    </div>
  ),
};
