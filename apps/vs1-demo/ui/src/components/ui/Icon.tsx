import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Icon ───────────────────────────────────────────────────────────────────────
// Thin wrapper around lucide icons that standardises size + colour tokens, so
// raw <LucideIcon /> usage can't drift. Sizes xs/sm/md/lg (14/16/20/24). Tones
// follow the Compass Color axis (default / brand / accent / success / warning /
// error / info / inverse / disabled) plus the secondary/tertiary fg extras → all
// mode-aware (light + dark). Status tones use static colors — var-color opacity
// is broken in this project.

export type IconSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconTone =
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'inverse'
  | 'disabled';

const SIZE_PX: Record<IconSize, number> = { xs: 14, sm: 16, md: 20, lg: 24 };

const TONE_CLS: Record<IconTone, string> = {
  default: 'text-fg',
  secondary: 'text-fg-secondary',
  tertiary: 'text-fg-tertiary',
  brand: 'text-fg-brand',
  accent: 'text-accent-700 dark:text-accent-300',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-error-700 dark:text-red-400',
  info: 'text-sky-600 dark:text-sky-400',
  inverse: 'text-fg-on-brand',
  disabled: 'text-fg-tertiary opacity-60',
};

export interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
  className?: string;
}

export function Icon({ icon: LucideGlyph, size = 'md', tone = 'default', className, ...rest }: IconProps) {
  return <LucideGlyph size={SIZE_PX[size]} className={cn(TONE_CLS[tone], className)} {...rest} />;
}
