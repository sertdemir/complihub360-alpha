import React, { forwardRef } from 'react';

// ─── Compass Container ────────────────────────────────────────────────────────
// Centered content with a max-width cap; beyond the cap only the outer margins
// grow (mx-auto). Fluid side padding follows the Compass grid margins
// (mobile 16 → tablet 40 → desktop 80). See Grid foundation (255:2).
//
//   sm   600px  — reading / login / modal
//   md   768px  — article / body / wizard
//   lg   1024px — app + sidebar
//   xl   1200px — ★ standard marketing / hero (default)
//   2xl  1440px — ★ Compass max
//   full        — no cap (caller controls)

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

// Side margins. `fluid` is the Compass grid doctrine (mobile 16 → tablet 40 →
// desktop 80). `flat` is the constant 24px the marketing pages actually use —
// unanimously, in all 27 of their padded shells. Keeping both is deliberate:
// the width drift (1280 vs the doctrine's 1200) was a real deviation and has
// been corrected, but a margin rule that every single call site rejects is
// evidence about the rule, not about the call sites.
export type ContainerGutter = 'fluid' | 'flat';

const gutterMap: Record<ContainerGutter, string> = {
  fluid: 'px-4 md:px-10 lg:px-20',
  flat: 'px-6',
};

const sizeMap: Record<ContainerSize, string> = {
  sm: 'max-w-container-sm',
  md: 'max-w-container-md',
  lg: 'max-w-container-lg',
  xl: 'max-w-container-xl',
  '2xl': 'max-w-container-2xl',
  full: 'max-w-none',
};

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /** Max content width (default `xl` = 1200px, the marketing/hero standard). */
  size?: ContainerSize;
  /** Render as a different element (e.g. `section`, `main`). */
  as?: React.ElementType;
  /** Drop the fluid side padding (caller manages horizontal space). */
  bleed?: boolean;
  /** Side margins: Compass grid (`fluid`) or the marketing constant 24px (`flat`). */
  gutter?: ContainerGutter;
}

export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ size = 'xl', as: Comp = 'div', bleed = false, gutter = 'fluid', className = '', children, ...props }, ref) => {
    const padding = bleed ? '' : gutterMap[gutter];
    return (
      <Comp
        ref={ref as never}
        className={`mx-auto w-full ${sizeMap[size]} ${padding} ${className}`.trim()}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Container.displayName = 'Container';
