import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
// Mirrors the Compass "Desktop Tab Item / Tabbar" (609:2 / 612:344). Active tab =
// petrol (`text/brand`), inactive = `text/secondary`. Three styles:
//   underline · filled · boxed (segmented).  Sizes sm/md/lg.
// Compositional: <Tabs><TabList><Tab/></TabList></Tabs>. Controlled (value +
// onValueChange) or uncontrolled (defaultValue). Light + dark via semantic tokens
// (text/brand flips to a lighter petrol on dark; filled-active uses a subtle tint).

export type TabsVariant = 'underline' | 'filled' | 'boxed';
export type TabsSize = 'sm' | 'md' | 'lg';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  variant: TabsVariant;
  size: TabsSize;
}
const Ctx = createContext<TabsCtx | null>(null);
const useTabs = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Tab parts must be used inside <Tabs>');
  return c;
};

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  className?: string;
  children: ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, variant = 'underline', size = 'md', className, children }: TabsProps) {
  const [uv, setUv] = useState(defaultValue ?? '');
  const current = value !== undefined ? value : uv;
  const setValue = (v: string) => {
    if (value === undefined) setUv(v);
    onValueChange?.(v);
  };
  return <Ctx.Provider value={{ value: current, setValue, variant, size }}><div className={className}>{children}</div></Ctx.Provider>;
}

export function TabList({ className, children }: { className?: string; children: ReactNode }) {
  const { variant } = useTabs();
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center',
        variant === 'underline' && 'gap-1 border-b border-stroke',
        variant === 'filled' && 'gap-1',
        variant === 'boxed' && 'gap-1 rounded-lg bg-surface-secondary p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

const SIZE: Record<TabsSize, string> = {
  sm: 'text-[13px] gap-1.5 px-3 py-2',
  md: 'text-[14px] gap-2 px-3.5 py-2.5',
  lg: 'text-[16px] gap-2 px-4 py-3',
};

export interface TabProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, icon, badge, disabled, className }: TabProps) {
  const { value: active, setValue, variant, size } = useTabs();
  const isActive = active === value;

  let style = '';
  if (variant === 'underline') {
    style = cn('-mb-px border-b-2', isActive ? 'border-fg-brand text-fg-brand' : 'border-transparent text-fg-secondary hover:text-fg');
  } else if (variant === 'filled') {
    style = cn('rounded-md', isActive ? 'bg-brand-light text-fg-brand dark:bg-white/10' : 'text-fg-secondary hover:bg-surface-secondary hover:text-fg');
  } else {
    style = cn('rounded-md', isActive ? 'bg-surface text-fg-brand shadow-sm' : 'text-fg-secondary hover:text-fg');
  }

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center whitespace-nowrap font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:pointer-events-none disabled:opacity-50',
        SIZE[size],
        style,
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {badge != null && (
        <span className="ml-1 rounded-full bg-surface-secondary px-1.5 py-0.5 text-[11px] font-semibold text-fg-secondary">
          {badge}
        </span>
      )}
    </button>
  );
}
