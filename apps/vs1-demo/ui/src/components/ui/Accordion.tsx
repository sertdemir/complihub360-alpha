import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Accordion ────────────────────────────────────────────────────────────────
// Mirrors the Compass "Accordion" component (Figma 573:2). Each item is a
// self-contained disclosure box; a group stacks them with a small gap.
//   Style:  Default (bordered) · Filled (neutral-100) · Ghost (borderless)
//   Size:   SM (40) · MD (52) · LG (64) header heights → radius 8 / 10 / 12,
//           title 13 / 14 / 16 Semi Bold, content same size, secondary text.
//   States: Collapsed · Expanded (chevron rotates) · Hover · Disabled.
// Note: the title stays `text/default` when expanded (NOT petrol) — the only
// active affordance is the chevron + revealed content, per the Compass spec.
// `type="single"` keeps one open (FAQ default); `type="multiple"` allows many.

export type AccordionStyle = 'default' | 'filled' | 'ghost';
export type AccordionSize = 'sm' | 'md' | 'lg';
type AccordionType = 'single' | 'multiple';

const SIZE: Record<AccordionSize, { header: string; content: string; radius: string; text: string; chevron: number; gap: string }> = {
  sm: { header: 'px-[14px] py-[11px]', content: 'px-[14px] pb-[12px]', radius: 'rounded-[8px]', text: 'text-[13px]', chevron: 16, gap: 'gap-2' },
  md: { header: 'px-4 py-[15px]', content: 'px-4 pb-4', radius: 'rounded-[10px]', text: 'text-[14px]', chevron: 18, gap: 'gap-2.5' },
  lg: { header: 'px-5 py-[19px]', content: 'px-5 pb-5', radius: 'rounded-[12px]', text: 'text-[16px]', chevron: 20, gap: 'gap-3' },
};

const STYLE: Record<AccordionStyle, { box: string; hover: string }> = {
  default: { box: 'border border-stroke bg-surface', hover: 'hover:bg-neutral-50 dark:hover:bg-white/[0.04]' },
  filled: { box: 'bg-neutral-100 dark:bg-white/[0.06]', hover: 'hover:bg-neutral-200 dark:hover:bg-white/[0.1]' },
  ghost: { box: '', hover: 'hover:bg-neutral-50 dark:hover:bg-white/[0.04]' },
};

interface AccordionCtx {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  style: AccordionStyle;
  size: AccordionSize;
}
const Ctx = createContext<AccordionCtx | null>(null);

export interface AccordionProps {
  type?: AccordionType;
  styleVariant?: AccordionStyle;
  size?: AccordionSize;
  /** Initially open item value(s). */
  defaultValue?: string | string[];
  className?: string;
  children: ReactNode;
}

export function Accordion({
  type = 'single',
  styleVariant = 'default',
  size = 'md',
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState<string[]>(() =>
    defaultValue == null ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue],
  );
  const isOpen = (value: string) => open.includes(value);
  const toggle = (value: string) =>
    setOpen((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return type === 'single' ? [value] : [...prev, value];
    });

  return (
    <Ctx.Provider value={{ isOpen, toggle, style: styleVariant, size }}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </Ctx.Provider>
  );
}

export interface AccordionItemProps {
  /** Unique value identifying this item. */
  value: string;
  title: ReactNode;
  children: ReactNode;
  /** Optional leading icon before the title. */
  iconLeft?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AccordionItem({ value, title, children, iconLeft, disabled, className }: AccordionItemProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AccordionItem must be used inside <Accordion>');
  const open = ctx.isOpen(value);
  const s = SIZE[ctx.size];
  const st = STYLE[ctx.style];
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <div
      className={cn('overflow-hidden', s.radius, st.box, disabled && 'pointer-events-none opacity-50', className)}
    >
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => ctx.toggle(value)}
        className={cn(
          'flex w-full items-center text-left font-semibold text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus',
          s.header,
          s.text,
          s.gap,
          !disabled && st.hover,
        )}
      >
        {iconLeft && <span className="shrink-0 text-fg-secondary">{iconLeft}</span>}
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={s.chevron}
          className={cn('shrink-0 text-fg-secondary transition-transform duration-300', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={cn('leading-relaxed text-fg-secondary', s.content, s.text)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
