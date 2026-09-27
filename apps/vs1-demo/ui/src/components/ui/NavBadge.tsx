import type { ReactNode } from 'react';

// ─── Nav-Badge ───────────────────────────────────────────────────────────────
// Compass "Nav Badge" (Figma 2187:13629).
//   count — Neu-Zaehler an Eintraegen (nur NEUES; ein Zustand ist kein Zaehler)
//   soon  — "Bald" an einer Gruppe, im Hinweis-Ton announce (kein Gold: Gold
//           bleibt Verified Partner, Nutzer-Entscheidung 2026-09-27)

export type NavBadgeType = 'count' | 'soon';

export const NAV_BADGE: Record<NavBadgeType, string> = {
  count: 'inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-[5px] text-[10.5px] font-bold leading-none tabular-nums text-fg-on-brand',
  soon: 'rounded-full bg-announce px-2 py-1 text-[9.5px] font-extrabold uppercase leading-none tracking-[0.1em] text-fg-on-announce',
};

export function NavBadge({ type = 'count', children, className = '' }: { type?: NavBadgeType; children: ReactNode; className?: string }) {
  return <span className={`${NAV_BADGE[type]} ${className}`}>{children}</span>;
}
