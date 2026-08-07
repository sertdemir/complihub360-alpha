import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Avatar ───────────────────────────────────────────────────────────────────
// Mirrors the Compass "Avatar" set (482:2). Type resolves automatically:
// image (src) → initials → icon → placeholder. Sizes XS/SM/MD/LG/XL (24/32/40/48/64),
// initials on a petrol (brand) fill with white (`text/on-brand`). Optional status
// dot (online/away/offline) with a surface-coloured ring. Light + dark: the ring
// flips to the dark app surface so the dot reads as a cut-out on dark dashboards.

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'none' | 'online' | 'away' | 'offline';

const SIZE: Record<AvatarSize, { d: number; t: number; dot: number }> = {
  xs: { d: 24, t: 10, dot: 8 },
  sm: { d: 32, t: 12, dot: 9 },
  md: { d: 40, t: 14, dot: 11 },
  lg: { d: 48, t: 16, dot: 12 },
  xl: { d: 64, t: 22, dot: 16 },
};

const STATUS_FILL: Record<Exclude<AvatarStatus, 'none'>, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-neutral-400',
};

export type AvatarTone = 'solid' | 'soft';

export interface AvatarProps {
  size?: AvatarSize;
  /** Image URL — renders an image avatar. */
  src?: string;
  alt?: string;
  /** Initials (1–2 chars) — petrol fill + white text when no image. */
  initials?: string;
  /** Initials tone: solid = petrol fill + white · soft = brand-light fill + petrol. */
  tone?: AvatarTone;
  /** Custom icon avatar (lucide node) — neutral fill. */
  icon?: React.ReactNode;
  status?: AvatarStatus;
  className?: string;
}

export function Avatar({ size = 'md', src, alt = '', initials, tone = 'solid', icon, status = 'none', className }: AvatarProps) {
  const s = SIZE[size];
  const ring = Math.max(2, Math.round(s.dot / 5));

  let inner: React.ReactNode;
  let surface: string;
  if (src) {
    inner = <img src={src} alt={alt} className="h-full w-full object-cover" />;
    surface = 'bg-neutral-200 dark:bg-neutral-700';
  } else if (initials) {
    const soft = tone === 'soft';
    inner = (
      <span className={cn('font-sans font-semibold leading-none', soft ? 'text-fg-brand' : 'text-fg-on-brand')}>
        {initials.slice(0, 2).toUpperCase()}
      </span>
    );
    surface = soft ? 'bg-brand-light' : 'bg-brand';
  } else if (icon) {
    inner = <span className="text-fg-secondary">{icon}</span>;
    surface = 'bg-neutral-100 dark:bg-neutral-800';
  } else {
    inner = <User size={Math.round(s.d * 0.55)} className="text-fg-tertiary" strokeWidth={2} />;
    surface = 'bg-neutral-100 dark:bg-neutral-800';
  }

  return (
    <span
      className={cn('relative inline-flex shrink-0 align-middle', className)}
      style={{ width: s.d, height: s.d }}
    >
      <span
        className={cn('flex h-full w-full items-center justify-center overflow-hidden rounded-full', surface)}
        style={{ fontSize: s.t }}
      >
        {inner}
      </span>
      {status !== 'none' && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-[#0F172A]',
            STATUS_FILL[status],
          )}
          style={{ width: s.dot, height: s.dot, borderWidth: ring }}
          aria-label={status}
        />
      )}
    </span>
  );
}
