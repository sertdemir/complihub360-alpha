import React from 'react';
import { cn } from '../../lib/utils';

// ─── AppShell ─────────────────────────────────────────────────────────────────
// Mirrors the Compass "AppShell" (974:2) and the User/Provider dashboards. The
// app frame = slim Sidebar (Workspace/Library/Saved/Monitoring nav) + top Domain
// Bar (two-axis nav) + scrollable content. App-dark uses SLATE panels (the shell)
// with petrol cards inside the content — so the shell surfaces are explicit slate
// (#0F162A sidebar, #1F2937 content); nav/text use semantic tokens. Light + dark.
//
// Composable: <AppShell sidebar={<Sidebar>…</Sidebar>} domainBar={<DomainBar>…</DomainBar>}>{content}</AppShell>.

// ── Sidebar ──
export function Sidebar({ logo, children, footer, className }: { logo?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <aside className={cn('flex w-60 shrink-0 flex-col border-r border-stroke bg-white dark:border-white/10 dark:bg-[#0F162A]', className)}>
      {logo && <div className="px-4 py-4">{logo}</div>}
      <nav className="flex-1 overflow-y-auto pb-2">{children}</nav>
      {footer && <div className="border-t border-stroke px-3 py-3 dark:border-white/10">{footer}</div>}
    </aside>
  );
}

export function SidebarGroup({ label, badge, children }: { label?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      {label && (
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{label}</span>
          {badge && <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary/70">{badge}</span>}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export interface NavItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  count?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}
export function NavItem({ icon, label, count, active, onClick, className }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
        active
          ? 'bg-brand-light text-fg-brand ring-1 ring-inset ring-stroke-brand'
          : 'text-fg-secondary hover:bg-black/[0.04] hover:text-fg dark:hover:bg-white/[0.05]',
        className,
      )}
    >
      {icon && <span className={cn('shrink-0', active ? 'text-fg-brand' : 'text-fg-tertiary')}>{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      {count != null && <span className={cn('text-[12px] font-semibold tabular-nums', active ? 'text-fg-brand' : 'text-fg-tertiary')}>{count}</span>}
    </button>
  );
}

// ── Domain Bar ──
export function DomainBar({ home, children, trailing, className }: { home?: React.ReactNode; children: React.ReactNode; trailing?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-14 items-center gap-1 border-b border-stroke bg-white px-2 dark:border-white/10 dark:bg-[#1F2937]', className)}>
      {home}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{children}</div>
      {trailing && <div className="ml-2 shrink-0">{trailing}</div>}
    </div>
  );
}

export interface DomainTabProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  dot?: boolean;
  active?: boolean;
  onClick?: () => void;
}
export function DomainTab({ icon, label, dot, active, onClick }: DomainTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2 whitespace-nowrap px-3 py-4 text-[14px] font-medium transition-colors',
        active ? 'text-fg' : 'text-fg-secondary hover:text-fg',
      )}
    >
      {icon && (
        <span className="relative">
          {icon}
          {dot && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-accent-500" />}
        </span>
      )}
      {label}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-fg-brand" />}
    </button>
  );
}

// ── Mobile Topbar ──
// Mirrors Compass "AppShell / Topbar — Mobile" (1420:8695): compact logo +
// gold context label (e.g. PARTNER) on the left, actions (search, verified
// badge) on the right. Slate-900 surface in dark; pairs with <BottomTabBar>.
export interface MobileTopbarProps {
  /** Compact brand lockup (round mark + wordmark + tagline). */
  logo: React.ReactNode;
  /** Small gold uppercase context label, e.g. "PARTNER". */
  contextLabel?: React.ReactNode;
  /** Trailing actions (search button, verified badge, …). */
  actions?: React.ReactNode;
  className?: string;
}
export function MobileTopbar({ logo, contextLabel, actions, className }: MobileTopbarProps) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stroke bg-white px-4 dark:border-white/10 dark:bg-[#0F172A]',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {logo}
        {contextLabel && (
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent">{contextLabel}</span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}

// ── Shell ──
export function AppShell({ sidebar, domainBar, children, className }: { sidebar?: React.ReactNode; domainBar?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full min-h-[640px] bg-neutral-50 text-fg dark:bg-[#1F2937]', className)}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {domainBar}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
