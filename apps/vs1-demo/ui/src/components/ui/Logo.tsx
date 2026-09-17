import { cn } from '../../lib/utils';
import {
  MARK_ARC,
  MARK_ARC_LOWER,
  MARK_SWOOSH,
  GLOBE,
  WORDMARK_INK,
  WORDMARK_GOLD,
  CLAIM,
} from './logo-paths';

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Compass-Komponente "Logo" (Figma-Node 2101:1151). Das Component-Set führt zwei
// Properties, diese API bildet sie 1:1 ab — Figma ist die Quelle:
//
//   Lockup : Horizontal · Stacked · Symbol · Wortmarke
//   Color  : On Light · On Petrol · Mono White · Mono Black
//
// Der Prop heißt hier `tone`, nicht `color`: `tone` ist die Hauskonvention des
// Code-Design-Systems (Badge, Alert, Stat verwenden sie ebenso). Die WERTE sind
// die aus Figma, damit Design und Code dieselbe Sprache sprechen.
//
// Farblogik — bei den beiden Marken-Tones kippt nur die Ink-Seite, Gold bleibt;
// die Mono-Tones ziehen alles auf eine Farbe, inklusive des Schwungs:
//   on-light    ring #0D3B33 · ink #012E27 · gold #C5913B
//   on-petrol   ring #FFFFFF · ink #FFFFFF · gold #C5913B
//   mono-white  alles #FFFFFF
//   mono-black  alles #0F172A
//
// Der Schwung trägt in Figma einen WebGPU-Shader ("Water caustic"). Eine
// Shader-Runtime für ein Logo im Header wäre nicht vertretbar — bei den beiden
// Marken-Tones trägt ein Gradient zwischen denselben Goldtönen, bei Mono eine
// Vollfläche. Bei 22–40 px ist der Unterschied nicht auflösbar.
//
// Die Geometrie liegt in logo-paths.ts; dort steht auch, wie sie gegenüber dem
// Figma-Original optimiert wurde.

export type LogoTone = 'on-light' | 'on-petrol' | 'mono-white' | 'mono-black';
export type LogoLockup = 'horizontal' | 'stacked' | 'symbol' | 'wortmarke';

interface Palette {
  ring: string;
  ink: string;
  gold: string;
  /** null = Gradient zwischen #C6923B und #B07E36, sonst Vollfläche. */
  swoosh: string | null;
}

const TONE: Record<LogoTone, Palette> = {
  'on-light': { ring: '#0D3B33', ink: '#012E27', gold: '#C5913B', swoosh: null },
  'on-petrol': { ring: '#FFFFFF', ink: '#FFFFFF', gold: '#C5913B', swoosh: null },
  'mono-white': { ring: '#FFFFFF', ink: '#FFFFFF', gold: '#FFFFFF', swoosh: '#FFFFFF' },
  'mono-black': { ring: '#0F172A', ink: '#0F172A', gold: '#0F172A', swoosh: '#0F172A' },
};

// Maße aus dem Component-Set.
const MARK_W = 40.594;
const MARK_H = 40.018;
const WORD_W = 101;
const WORD_H = 20.701;
/** Abstand Bildmarke → Wortmarke: 3 px nebeneinander, 8 px gestapelt. */
const GAP_H = 3;
const GAP_V = 8;

const BOX: Record<LogoLockup, { w: number; h: number }> = {
  horizontal: { w: MARK_W + GAP_H + WORD_W, h: MARK_H },
  stacked: { w: WORD_W, h: MARK_H + GAP_V + WORD_H },
  symbol: { w: MARK_W, h: MARK_H },
  wortmarke: { w: WORD_W, h: WORD_H },
};

/** Default-Höhe je Lockup, wenn der Aufrufer keine Klasse mitgibt. */
const DEFAULT_H: Record<LogoLockup, string> = {
  horizontal: 'h-[47px]',
  stacked: 'h-16',
  symbol: 'h-8',
  wortmarke: 'h-5',
};

let seq = 0;

function Bildmarke({ tone, gradId }: { tone: LogoTone; gradId: string }) {
  const c = TONE[tone];
  return (
    <>
      <path d={MARK_ARC} fill={c.ring} transform="translate(2.11 0)" />
      <path d={MARK_ARC_LOWER} fill={c.ring} transform="translate(10.101 29.798)" />
      <path d={GLOBE} fill={c.ink} transform="translate(19.496 16.996)" />
      <path
        d={MARK_SWOOSH}
        fill={c.swoosh ?? `url(#${gradId})`}
        transform="translate(0 13.877)"
      />
    </>
  );
}

function Wortmarke({ tone }: { tone: LogoTone }) {
  const c = TONE[tone];
  return (
    <>
      {WORDMARK_INK.map((d, i) => (
        <path key={`i${i}`} d={d} fill={c.ink} />
      ))}
      {WORDMARK_GOLD.map((d, i) => (
        <path key={`g${i}`} d={d} fill={c.gold} />
      ))}
      {/* Claim-Zeile: Linie · "Always on your side" · Linie, 4 px Abstand. */}
      <g transform={`translate(0 ${WORD_H - 7})`}>
        <rect x="0" y="3.5" width="13.5" height="0.7" fill={c.gold} />
        <path d={CLAIM} fill={c.gold} transform="translate(17.5 0)" />
        <rect x="87.5" y="3.5" width="13.5" height="0.7" fill={c.gold} />
      </g>
    </>
  );
}

export interface LogoProps {
  /** Entspricht der Figma-Property "Lockup". */
  lockup?: LogoLockup;
  /** Entspricht der Figma-Property "Color". */
  tone?: LogoTone;
  /** Wrappt in einen Link. null rendert inline ohne Anker. */
  href?: string | null;
  className?: string;
}

/** Nur die Bildmarke — Kurzform für `<Logo lockup="symbol" />`. */
export function LogoMark({ tone = 'on-light', className }: { tone?: LogoTone; className?: string }) {
  return <Logo lockup="symbol" tone={tone} href={null} className={className} />;
}

export function Logo({
  lockup = 'horizontal',
  tone = 'on-light',
  href = '/',
  className,
}: LogoProps) {
  const gradId = `ch-swoosh-${++seq}`;
  const box = BOX[lockup];
  const needsGradient = TONE[tone].swoosh === null && lockup !== 'wortmarke';

  const svg = (
    <svg
      viewBox={`0 0 ${box.w} ${box.h}`}
      className={cn('block w-auto shrink-0', DEFAULT_H[lockup], className)}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {needsGradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C6923B" />
            <stop offset="100%" stopColor="#B07E36" />
          </linearGradient>
        </defs>
      )}

      {lockup === 'horizontal' && (
        <>
          <Bildmarke tone={tone} gradId={gradId} />
          <g transform={`translate(${MARK_W + GAP_H} ${(MARK_H - WORD_H) / 2})`}>
            <Wortmarke tone={tone} />
          </g>
        </>
      )}

      {lockup === 'stacked' && (
        <>
          <g transform={`translate(${(WORD_W - MARK_W) / 2} 0)`}>
            <Bildmarke tone={tone} gradId={gradId} />
          </g>
          <g transform={`translate(0 ${MARK_H + GAP_V})`}>
            <Wortmarke tone={tone} />
          </g>
        </>
      )}

      {lockup === 'symbol' && <Bildmarke tone={tone} gradId={gradId} />}
      {lockup === 'wortmarke' && <Wortmarke tone={tone} />}
    </svg>
  );

  if (href === null) return svg;
  return (
    <a href={href} className="inline-flex shrink-0 items-center" aria-label="CompliHub360 — Home">
      {svg}
    </a>
  );
}
