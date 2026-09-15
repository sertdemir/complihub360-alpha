import { cn } from '../../lib/utils';
import {
  MARK_ARC,
  MARK_ARC_LOWER,
  MARK_SWOOSH,
  GLOBE as GLOBE_D,
  WORDMARK_INK,
  WORDMARK_GOLD,
  CLAIM,
} from './logo-paths';

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Compass-Komponente "Logo" (Figma-Node 712:266). Das Component-Set führt sechs
// Varianten über eine einzige Property: Lockup = bildmarke | wortmarke | default,
// jeweils light und dark. Diese API bildet das 1:1 ab — Figma ist die Quelle.
//
// Bildmarke: Kreisbogen + unterer Bogen (Ring-Farbe), Globus (Ink-Farbe) und der
// goldene Schwung darüber. Wortmarke: "CompliHub" in Ink, "360" in Gold, darunter
// der Claim zwischen zwei Linien.
//
// Farblogik — nur die Ink-Seite kippt, Gold bleibt in beiden Tones konstant:
//   ink    #012E27 → #FFFFFF   Globus · "CompliHub"
//   ring   #0D3B33 → #FFFFFF   die beiden Bögen
//   gold   #C5913B             "360" · Claim · Linien
//
// Der goldene Schwung trägt in Figma einen WebGPU-Shader ("Water caustic",
// #B07E36 → #C6923B). Ein Shader-Runtime für ein Logo, das auf jeder Seite im
// Header steht, wäre nicht vertretbar — die Anmutung trägt hier ein linearer
// Gradient zwischen denselben beiden Goldtönen. Bei den real verwendeten Größen
// (22–40 px) ist der Unterschied nicht auflösbar.
//
// Die Geometrie liegt in logo-paths.ts; dort steht auch, wie sie gegenüber dem
// Figma-Original optimiert wurde.

export type LogoTone = 'light' | 'dark';
export type LogoLockup = 'default' | 'bildmarke' | 'wortmarke';

const INK: Record<LogoTone, string> = { light: '#012E27', dark: '#FFFFFF' };
const RING: Record<LogoTone, string> = { light: '#0D3B33', dark: '#FFFFFF' };
const GOLD = '#C5913B';

/** Geometrie der Bildmarke, wie sie in Figma sitzt. */
const MARK_W = 40.594;
const MARK_H = 40.018;
/** Geometrie der Wortmarke. */
const WORD_W = 101;
const WORD_H = 20.701;
/** Abstand zwischen Bildmarke und Wortmarke im default-Lockup. */
const LOCKUP_GAP = 3;

let gradientSeq = 0;

function Bildmarke({ tone, idPrefix }: { tone: LogoTone; idPrefix: string }) {
  const gradId = `${idPrefix}-swoosh`;
  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C6923B" />
          <stop offset="100%" stopColor="#B07E36" />
        </linearGradient>
      </defs>
      <path d={MARK_ARC} fill={RING[tone]} transform="translate(2.11 0)" />
      <path d={MARK_ARC_LOWER} fill={RING[tone]} transform="translate(10.101 29.798)" />
      <path d={GLOBE_D} fill={INK[tone]} transform="translate(19.496 16.996)" />
      <path d={MARK_SWOOSH} fill={`url(#${gradId})`} transform="translate(0 13.877)" />
    </>
  );
}

function Wortmarke({ tone }: { tone: LogoTone }) {
  return (
    <>
      {WORDMARK_INK.map((d, i) => (
        <path key={`i${i}`} d={d} fill={INK[tone]} />
      ))}
      {WORDMARK_GOLD.map((d, i) => (
        <path key={`g${i}`} d={d} fill={GOLD} />
      ))}
      {/* Claim-Zeile: Linie · "Always on your side" · Linie, 4 px Abstand. */}
      <g transform={`translate(0 ${13.701})`}>
        <rect x="0" y="3.5" width="13.5" height="0.7" fill={GOLD} />
        <path d={CLAIM} fill={GOLD} transform="translate(17.5 0)" />
        <rect x="87.5" y="3.5" width="13.5" height="0.7" fill={GOLD} />
      </g>
    </>
  );
}

export interface LogoProps {
  /** default = Bildmarke + Wortmarke · bildmarke = Symbol · wortmarke = Schriftzug. */
  lockup?: LogoLockup;
  /** light = für helle Gründe · dark = für dunkle Gründe. */
  tone?: LogoTone;
  /** Wrappt in einen Link. null rendert inline ohne Anker. */
  href?: string | null;
  className?: string;
}

export function LogoMark({ tone = 'light', className }: { tone?: LogoTone; className?: string }) {
  const id = `chl${++gradientSeq}`;
  return (
    <svg
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      className={cn('block shrink-0', className)}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Bildmarke tone={tone} idPrefix={id} />
    </svg>
  );
}

export function Logo({ lockup = 'default', tone = 'light', href = '/', className }: LogoProps) {
  const id = `chl${++gradientSeq}`;
  let content;

  if (lockup === 'bildmarke') {
    content = <LogoMark tone={tone} className={cn('h-8 w-auto', className)} />;
  } else if (lockup === 'wortmarke') {
    content = (
      <svg
        viewBox={`0 0 ${WORD_W} ${WORD_H}`}
        className={cn('block h-5 w-auto shrink-0', className)}
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Wortmarke tone={tone} />
      </svg>
    );
  } else {
    content = (
      <svg
        viewBox={`0 0 ${MARK_W + LOCKUP_GAP + WORD_W} ${MARK_H}`}
        className={cn('block h-9 w-auto shrink-0', className)}
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Bildmarke tone={tone} idPrefix={id} />
        <g transform={`translate(${MARK_W + LOCKUP_GAP} ${(MARK_H - WORD_H) / 2})`}>
          <Wortmarke tone={tone} />
        </g>
      </svg>
    );
  }

  if (href === null) return content;
  return (
    <a href={href} className="inline-flex shrink-0 items-center" aria-label="CompliHub360 — Home">
      {content}
    </a>
  );
}
