import { cn } from '../../lib/utils';
import { useTheme } from '../../lib/theme';
import { useEffect, useRef } from 'react';
import {
  MARK_ARC,
  MARK_ARC_LOWER,
  MARK_SWOOSH,
  WORDMARK_INK,
  WORDMARK_GOLD,
  CLAIM,
} from './logo-paths';
import { RUHE_PFAD, dreheMit } from './globe-spin';

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
  /**
   * Eigene Farbe für die Claim-Zeile. Sie ist die einzige echte TEXT-Fläche im
   * Logo — 17,5 % der Logo-Höhe, also 6,3 px bei h-9 und ebenso bei h-[36px]. Das
   * Marken-Gold #C5913B trägt sie nicht: 2,80:1 auf Weiß und 3,51:1 auf
   * Petrol, beides unter den 4,5:1, die kleiner Text braucht. Ein einziger Ton
   * schafft beide Gründe nicht, darum hängt er am Tone.
   *
   * Das gilt NUR für den Claim. "360" bleibt Marken-Gold: es ist Logotype,
   * keine Fließschrift, und in der Wortmarken-Größe unverwechselbar.
   */
  claim: string;
}

const TONE: Record<LogoTone, Palette> = {
  // claim-Werte sind KEINE Einzelfarben, sondern die Compass-Primitives
  // accent/800 und accent/300 — dieselben Variablen, an die das
  // Component-Set 2101:1151 seine Claim-Vektoren bindet:
  //   accent/800  #6A5B1E   6,71:1 auf Weiß
  //   accent/300  #F4C44A   6,01:1 auf petrol-500
  // Dieselbe Rechnung, die in AdminShell und ProviderShell schon die
  // 9-px-Badges auf accent-strong gezogen hat.
  'on-light': { ring: '#0D3B33', ink: '#012E27', gold: '#C5913B', swoosh: null, claim: '#6A5B1E' },
  'on-petrol': { ring: '#FFFFFF', ink: '#FFFFFF', gold: '#C5913B', swoosh: null, claim: '#F4C44A' },
  'mono-white': { ring: '#FFFFFF', ink: '#FFFFFF', gold: '#FFFFFF', swoosh: '#FFFFFF', claim: '#FFFFFF' },
  'mono-black': { ring: '#0F172A', ink: '#0F172A', gold: '#0F172A', swoosh: '#0F172A', claim: '#0F172A' },
};

// Maße aus dem Component-Set.
const MARK_W = 40.594;
const MARK_H = 40.018;
const WORD_W = 101;
const WORD_H = 20.701;
/**
 * Höhe des reinen Wortzeichens "CompliHub360", ohne die Claim-Zeile darunter.
 * Kein geschätzter Wert: Bounding-Box der Pfade WORDMARK_INK + WORDMARK_GOLD,
 * im Browser über getBBox() abgenommen. Der Claim belegt die restlichen 7,0.
 */
const WORD_TEXT_H = 13.7;
/** Abstand Bildmarke → Wortmarke: 3 px nebeneinander, 8 px gestapelt. */
const GAP_H = 3;
const GAP_V = 8;
/**
 * Um diesen Faktor wächst das Wortzeichen, wenn der Claim wegfällt: es füllt
 * exakt die frei werdende Höhe, 13,7 → 20,701. Bei den 36 px, die jede echte
 * Platzierung fährt, wächst das Wortzeichen damit von 12,3 auf 18,6 px.
 *
 * Das kostet Breite, denn es skaliert proportional mit: das Lockup geht von
 * 130 auf 177 px (bei 36 px Höhe).
 *
 * DAS KOSTET BREITE, und die Startseite ist dabei die Grenze, nicht die
 * Navigation. Im Browser nachgemessen, jeweils die rechte Kante des
 * MarketingHeader bei 1440:
 *
 *   Logo-Höhe   Lockup    rechte Kante bei 1440
 *   47 px       230 px    1471  — laeuft 31 px ueber
 *   38 px       186 px    passt erst ab 1520
 *   36 px       177 px    passt bei 1440       <- dieser Stand
 *
 * Genau deshalb 36 und nicht 38: bei 36 px trägt der MarketingHeader das
 * volle Lockup schon bei 1440. Der Umschaltpunkt Bildmarke → Lockup steht
 * damit wieder auf dem Grid-Token desktop-l (1440) statt auf einem
 * gemessenen Sonderwert min-[1520px] — eine Zahl weniger im System, und
 * jeder 1440er-Laptop sieht das Wortzeichen.
 */
const WORD_SCALE = WORD_H / WORD_TEXT_H;

/** Maße des Wortmarken-Blocks, je nachdem ob die Claim-Zeile mitläuft. */
function wordBox(claim: boolean) {
  const scale = claim ? 1 : WORD_SCALE;
  return { scale, w: WORD_W * scale, h: (claim ? WORD_H : WORD_TEXT_H) * scale };
}

function boxFor(lockup: LogoLockup, claim: boolean): { w: number; h: number } {
  const word = wordBox(claim);
  switch (lockup) {
    case 'horizontal':
      return { w: MARK_W + GAP_H + word.w, h: MARK_H };
    case 'stacked':
      return { w: Math.max(word.w, MARK_W), h: MARK_H + GAP_V + word.h };
    case 'symbol':
      return { w: MARK_W, h: MARK_H };
    case 'wortmarke':
      return { w: word.w, h: word.h };
  }
}

/** Default-Höhe je Lockup, wenn der Aufrufer keine Klasse mitgibt. */
const DEFAULT_H: Record<LogoLockup, string> = {
  horizontal: 'h-[36px]',
  stacked: 'h-16',
  symbol: 'h-8',
  wortmarke: 'h-5',
};

let seq = 0;

function Bildmarke({ tone, gradId }: { tone: LogoTone; gradId: string }) {
  const c = TONE[tone];
  const globus = useRef<SVGPathElement>(null);

  // Die Erde dreht sich — sphaerisch gerechnet, nicht als Bildfolge, damit sie
  // Vektor bleibt und sich ueber die Tones umfaerbt. Der Taktgeber laeuft fuer
  // alle Marken der Seite gemeinsam und haelt an, sobald keine mehr im Bild ist.
  // Bei prefers-reduced-motion startet er nicht; dann bleibt RUHE_PFAD stehen,
  // und genau der steht auch im Markup, bevor JavaScript laeuft.
  useEffect(() => {
    const el = globus.current;
    return el ? dreheMit(el) : undefined;
  }, []);

  return (
    <>
      <path d={MARK_ARC} fill={c.ring} transform="translate(2.11 0)" />
      <path d={MARK_ARC_LOWER} fill={c.ring} transform="translate(10.101 29.798)" />
      <path ref={globus} d={RUHE_PFAD} fill={c.ink} />
      <path
        d={MARK_SWOOSH}
        fill={c.swoosh ?? `url(#${gradId})`}
        transform="translate(0 13.877)"
      />
    </>
  );
}

function Wortmarke({ tone, claim }: { tone: LogoTone; claim: boolean }) {
  const c = TONE[tone];
  return (
    <>
      {WORDMARK_INK.map((d, i) => (
        <path key={`i${i}`} d={d} fill={c.ink} />
      ))}
      {WORDMARK_GOLD.map((d, i) => (
        <path key={`g${i}`} d={d} fill={c.gold} />
      ))}
      {/* Claim-Zeile: Linie · "Always on your side" · Linie, 4 px Abstand.
          Linien und Schrift teilen sich c.claim — sie lesen sich als ein
          Element, ein Farbsprung dazwischen zerfiele optisch. */}
      {claim && (
        <g transform={`translate(0 ${WORD_H - 7})`}>
          <rect x="0" y="3.5" width="13.5" height="0.7" fill={c.claim} />
          <path d={CLAIM} fill={c.claim} transform="translate(17.5 0)" />
          <rect x="87.5" y="3.5" width="13.5" height="0.7" fill={c.claim} />
        </g>
      )}
    </>
  );
}

export interface LogoProps {
  /** Entspricht der Figma-Property "Lockup". */
  lockup?: LogoLockup;
  /**
   * Entspricht der Figma-Property "Color". OHNE Angabe folgt das Logo dem
   * App-Theme: hell → `on-light`, dunkel → `on-petrol`.
   *
   * Setzen muss man ihn nur dort, wo der Grund NICHT mit dem Theme kippt —
   * eine fest dunkle Seite (`bg-[#0b1620]`, ein lokales `dark`), ein Foto,
   * eine Marken-Fläche. Ein fest gesetztes `on-light` auf einer Fläche, die
   * mitkippt, ist der Fehler, den dieser Default abschafft: im Dark Mode
   * stand die Ink-Wortmarke auf dunklem Grund.
   */
  tone?: LogoTone;
  /**
   * Claim-Zeile "Always on your side" unter dem Wortzeichen. Entspricht der
   * Figma-Property "Claim" (Ohne · Mit).
   *
   * DEFAULT IST OHNE — und das ist eine Messung, keine Geschmacksfrage: der
   * Claim ist 17 % der Logo-Höhe, also 6,3 px bei den 36 px, die JEDE echte
   * Platzierung fährt (Header, Footer, Auth-Seiten, Shells). Bei 8 px ist er
   * nicht lesbar, egal in welcher Farbe — die Kontrastkorrektur auf accent/800
   * hat das Problem gemildert, nicht gelöst. Statt einer unlesbaren Zeile
   * bekommt das Wortzeichen ihren Platz und wächst um 40 %.
   *
   * `claim` setzt man dort, wo das Logo groß genug dafür ist: Print, Keynote,
   * eine Markenseite, ein Export ab etwa 90 px Höhe. Dort ist die Geometrie
   * bitgenau die von vorher.
   */
  claim?: boolean;
  /** Wrappt in einen Link. null rendert inline ohne Anker. */
  href?: string | null;
  className?: string;
}

/** Nur die Bildmarke — Kurzform für `<Logo lockup="symbol" />`. */
export function LogoMark({ tone, className }: { tone?: LogoTone; className?: string }) {
  return <Logo lockup="symbol" tone={tone} href={null} className={className} />;
}

export function Logo({ lockup = 'horizontal', tone, claim = false, href = '/', className }: LogoProps) {
  const { isDark } = useTheme();
  const resolved: LogoTone = tone ?? (isDark ? 'on-petrol' : 'on-light');
  const gradId = `ch-swoosh-${++seq}`;
  const box = boxFor(lockup, claim);
  const word = wordBox(claim);
  const needsGradient = TONE[resolved].swoosh === null && lockup !== 'wortmarke';

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
          <Bildmarke tone={resolved} gradId={gradId} />
          <g transform={`translate(${MARK_W + GAP_H} ${(MARK_H - word.h) / 2}) scale(${word.scale})`}>
            <Wortmarke tone={resolved} claim={claim} />
          </g>
        </>
      )}

      {lockup === 'stacked' && (
        <>
          <g transform={`translate(${(box.w - MARK_W) / 2} 0)`}>
            <Bildmarke tone={resolved} gradId={gradId} />
          </g>
          <g transform={`translate(${(box.w - word.w) / 2} ${MARK_H + GAP_V}) scale(${word.scale})`}>
            <Wortmarke tone={resolved} claim={claim} />
          </g>
        </>
      )}

      {lockup === 'symbol' && <Bildmarke tone={resolved} gradId={gradId} />}
      {lockup === 'wortmarke' && (
        <g transform={`scale(${word.scale})`}>
          <Wortmarke tone={resolved} claim={claim} />
        </g>
      )}
    </svg>
  );

  if (href === null) return svg;
  return (
    <a href={href} className="inline-flex shrink-0 items-center" aria-label="CompliHub360 — Home">
      {svg}
    </a>
  );
}
