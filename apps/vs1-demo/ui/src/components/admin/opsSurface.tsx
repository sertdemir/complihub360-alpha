import { type CSSProperties, type ReactNode } from 'react';
import { useCountUp } from '../ui/RadialGauge';

// ─── Ops surface kit ──────────────────────────────────────────────────────────
// Shared building blocks for the animated, themeable admin surfaces (Founder
// Cockpit + Control Center). One palette, one set of primitives — so the two
// pages never drift apart. Colors are plain values (not tokens) because these
// surfaces theme via JS (light/dark) to animate and stay self-consistent.

export type Lang = 'de' | 'en';
export type OpsTheme = 'light' | 'dark';

export function palette(theme: OpsTheme) {
  return theme === 'light'
    ? { bg: '#eef2f6', card: '#ffffff', line: 'rgba(16,32,48,.10)', ink: '#16232f', muted: '#586572', faint: '#8a97a3', gold: '#b8912f', petrol: '#0e8c8c', green: '#2fa84f', amber: '#c07d10', red: '#dc3b40', shadow: '0 1px 2px rgba(16,32,48,.06),0 2px 6px rgba(16,32,48,.05)', track: 'rgba(16,32,48,.08)' }
    : { bg: '#0b1620', card: '#16232f', line: 'rgba(255,255,255,.08)', ink: '#e8edf2', muted: '#8b98a6', faint: '#5b6673', gold: '#d4af37', petrol: '#19a5a5', green: '#3fb950', amber: '#d29922', red: '#f85149', shadow: 'none', track: 'rgba(255,255,255,.09)' };
}
export type Pal = ReturnType<typeof palette>;

export const pct = (v: number | null): number => (v === null ? 0 : Math.round(v * 100));
export const eur = (cents: number): string => (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function relTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const fmt = (n: number, u: string) => (lang === 'de' ? `vor ${n}${u}` : `${n}${u} ago`);
  if (h < 1) return fmt(Math.max(1, Math.floor(diff / 60_000)), 'm');
  if (h < 24) return fmt(h, 'h');
  return fmt(Math.floor(h / 24), 'd');
}

export function toneColor(frac: number, pal: Pal): string {
  if (frac >= 0.6) return pal.green;
  if (frac >= 0.4) return pal.amber;
  return pal.red;
}

// Full-bleed themed surface that fills the AdminShell content area.
export function OpsSurface({ pal, children }: { pal: Pal; children: ReactNode }) {
  return (
    <div style={{ margin: '-24px -32px', padding: '44px 48px 80px', background: pal.bg, color: pal.ink, minHeight: 'calc(100% + 48px)', transition: 'background .25s ease, color .25s ease' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 34 }}>{children}</div>
    </div>
  );
}

export function OpsHeader({ pal, accent, title, subtitle, right }: { pal: Pal; accent: string; title: string; subtitle: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, margin: 0 }}>
          <span style={{ color: pal.gold }}>{accent}</span> {title}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: pal.muted }}>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

export function Card({ pal, children, style }: { pal: Pal; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: pal.card, border: `1px solid ${pal.line}`, borderRadius: 16, boxShadow: pal.shadow, ...style }}>{children}</div>;
}

export function Lens({ pal, title, right, children, style }: { pal: Pal; title: string; right?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <Card pal={pal} style={{ padding: '24px 26px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 18px' }}>
        <h2 style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: pal.faint, fontWeight: 700, margin: 0 }}>{title}</h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

// Animated stat row: number counts up on mount / value change.
export function Stat({ pal, label, value, valueText, sub, valueTone, subTone }: {
  pal: Pal; label: string; value?: number; valueText?: string; sub?: string; valueTone?: string; subTone?: string;
}) {
  const counted = useCountUp(value ?? 0);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '9px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: pal.muted, fontSize: 13 }}>{label}</span>
        {sub && <span style={{ color: subTone ?? pal.faint, fontSize: 11 }}>{sub}</span>}
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: valueTone ?? pal.ink }}>
        {valueText ?? Math.round(counted)}
      </span>
    </div>
  );
}

// A themed status pill (e.g. Watchers · shadow / live).
export function Pill({ pal, tone, children }: { pal: Pal; tone: string; children: ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, border: `1px solid ${tone}`, color: tone }}>{children}</span>
  );
}
