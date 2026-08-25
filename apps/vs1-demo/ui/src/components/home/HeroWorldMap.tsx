import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Scale, ShieldCheck, User, Users, type LucideIcon } from 'lucide-react';
import { useInViewOnce } from '../../lib/useInViewOnce';

// ─── Hero key-visual: dotted world map with an animated compliance route ──────
// The dot map is the user's own world.svg asset, background stripped and its
// 9,496 bezier dots reduced to 4,760 <circle> elements (public/img/
// world-dots.svg, ~185 kB instead of 5 MB). It loads as a plain <img> so the
// 4,760 nodes never enter the React tree; only the six pins and five arcs
// below are live SVG.
//
// The animation walks the chain once per cycle: a chip pops (spring), the arc
// draws itself to the next station (pathLength 0→1), the next chip pops — until
// the route ends at the destination pin. Then a pause, and the loop restarts.
// prefers-reduced-motion renders the completed image with no motion at all.

const VIEW = { w: 640, h: 420 };

const CHIPS: { x: number; y: number; r: number; Icon: LucideIcon; icon: number }[] = [
  { x: 184, y: 332, r: 19, Icon: User, icon: 17 },
  { x: 193, y: 211, r: 29, Icon: FileText, icon: 25 },
  { x: 127, y: 106, r: 27, Icon: Scale, icon: 24 },
  { x: 351, y: 117, r: 30, Icon: ShieldCheck, icon: 27 },
  { x: 363, y: 286, r: 27, Icon: Users, icon: 24 },
];

// The route ends just above the destination pin's orbit, not at the pin's
// centre — the arc slips underneath the marker exactly like on the canvas.
const DEST = { x: 506, y: 200 };

// Quadratic arc between two stations: control point = midpoint pushed out along
// the perpendicular, the bulge alternating sides so the route meanders instead
// of swinging into a lens shape.
function arc(a: { x: number; y: number }, b: { x: number; y: number }, k: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `M ${a.x} ${a.y} Q ${(mx - dy * k).toFixed(1)} ${(my + dx * k).toFixed(1)} ${b.x} ${b.y}`;
}

const STATIONS = [...CHIPS.map(({ x, y }) => ({ x, y })), DEST];
const ARCS = STATIONS.slice(0, -1).map((from, i) => arc(from, STATIONS[i + 1], i % 2 === 0 ? 0.22 : -0.22));

// One station per STEP; its outgoing arc starts DRAW_LAG later and lands
// exactly when the next station pops. Cycle = full route + a reading pause.
const STEP = 0.75;
const DRAW_LAG = 0.3;
const DRAW = STEP - DRAW_LAG;
const CYCLE_MS = 6500;

const POP = { type: 'spring', stiffness: 260, damping: 19 } as const;
const chipStyle = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

export function HeroWorldMap({ className = '' }: { className?: string }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>('-40px');
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  // Remounting the overlay group replays every enter animation — that IS the loop.
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [animate]);

  return (
    <div ref={ref} aria-hidden className={`relative ${className}`} style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
      <img src="/img/world-dots.svg" alt="" decoding="async" className="absolute inset-0 h-full w-full" />
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} fill="none" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="hero-chip-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="9" floodColor="#0f172a" floodOpacity="0.13" />
          </filter>
        </defs>

        <g key={reduced ? 'static' : cycle}>
          {/* Route — drawn first so the chips mask the arc endpoints. */}
          {ARCS.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              stroke="#D4AF37"
              strokeWidth={1.4}
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={animate || reduced ? { pathLength: 1, opacity: 0.85 } : {}}
              transition={{ delay: i * STEP + DRAW_LAG, duration: DRAW, ease: 'easeInOut' }}
            />
          ))}

          {/* Stations */}
          {CHIPS.map(({ x, y, r, Icon, icon }, i) => (
            <motion.g
              key={`${x}-${y}`}
              style={chipStyle}
              initial={reduced ? false : { scale: 0, opacity: 0 }}
              animate={animate || reduced ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: i * STEP, ...POP }}
            >
              <g filter="url(#hero-chip-shadow)">
                <circle cx={x} cy={y} r={r} fill="#ffffff" />
              </g>
              <Icon x={x - icon / 2} y={y - icon / 2} width={icon} height={icon} strokeWidth={1.7} color="#004D40" />
            </motion.g>
          ))}

          {/* Destination pin with its gold orbit — the route's arrival point. */}
          <motion.g
            style={chipStyle}
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={animate || reduced ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: CHIPS.length * STEP, ...POP }}
          >
            <ellipse cx="506" cy="207" rx="38" ry="13" stroke="#D4AF37" strokeWidth={1.4} opacity="0.9" />
            <ellipse cx="506" cy="207" rx="20" ry="7" fill="#D4AF37" opacity="0.25" />
            <g filter="url(#hero-chip-shadow)">
              <path
                d="M506 152 C520 152 531 163 531 177 C531 194 506 215 506 215 C506 215 481 194 481 177 C481 163 492 152 506 152 Z"
                fill="#004D40"
              />
              <circle cx="506" cy="176" r="9" fill="#ffffff" />
            </g>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
