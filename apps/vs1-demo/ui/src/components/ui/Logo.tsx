import { cn } from '../../lib/utils';

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Compass "Logo" component (Figma node 712:266 — variant set Lockup × Color).
// Mark = exact exported vector geometry (viewBox 0 0 40 39): an orbit ring + a
// node-dot, and the "360" numerals + degree. Colours are driven by `tone`,
// mirroring the four Compass colour variants exactly:
//   On Light   ring #D4AF37 · 360 #004D40 · CompliHub #004D40 · tagline #D4AF37
//   On Petrol  ring #D4AF37 · 360 #FFFFFF · CompliHub #FFFFFF · tagline #D4AF37
//   Mono White everything #FFFFFF
//   Mono Black everything #0F172A
// Wordmark = "CompliHub" Inter Bold 16 · Tagline = "Always on your side."
// Inter Regular 10 — values read straight from the source file.
// The claim replaced "Compliance. Simplified." on 2026-08-10 (Brand & Marketing
// Map V1 §5/§16): it names the brand's stance, not the product. Deliberately
// untranslated — a brand claim reads the same in every locale.

const RING =
  'M34.6393 29.9738C34.3416 30.4374 34.057 30.7874 33.7125 31.213C33.0472 31.9945 32.2935 32.8138 31.525 33.4962C28.5543 36.1237 24.8614 37.7967 20.9274 38.299C15.8109 38.8986 10.6645 37.4544 6.60706 34.2804C5.28726 33.2414 4.09624 32.0479 3.06018 30.7257C2.94065 30.5752 2.62258 30.2012 2.60315 30.0382C2.73954 30.0722 3.04754 30.2292 3.19202 30.2902C4.12546 30.6838 4.99861 30.8092 5.99866 30.8781C6.22617 31.1637 6.81113 31.7046 7.09338 31.9591C8.95712 33.64 11.4917 35.028 13.9215 35.6818C18.8562 37.0489 24.1424 36.1766 28.3766 33.297C28.9722 32.8908 29.5399 32.4452 30.0758 31.963C30.4385 31.6381 30.9259 31.0727 31.3287 30.8546C32.5497 30.8317 33.5763 30.5708 34.6393 29.9738ZM17.8248 17.9259C20.1457 17.4961 22.3724 19.0403 22.7838 21.3644C23.195 23.6885 21.6336 25.9022 19.3063 26.295C17.005 26.6832 14.8213 25.1429 14.4147 22.8448C14.0083 20.5471 15.5305 18.3511 17.8248 17.9259ZM21.2115 20.0089C20.954 19.5367 20.4137 19.2927 19.8893 19.4122C19.2436 19.5597 18.8382 20.2026 18.984 20.8488C19.13 21.4948 19.7721 21.9004 20.4186 21.756C20.7567 21.6804 21.0458 21.4626 21.2115 21.1583C21.4067 20.8 21.4068 20.3672 21.2115 20.0089ZM19.6207 0.0177002C25.4176 0.187211 31.4378 3.57748 34.6002 8.41321C33.3701 7.87302 32.7335 7.7275 31.3707 7.61145C30.7081 7.08665 30.1171 6.4166 29.3698 5.82727C27.0102 3.9667 24.2978 2.78169 21.3346 2.26965C20.7406 2.16703 19.7761 2.13009 19.1686 2.10071C18.9269 2.08815 18.6012 2.09017 18.3571 2.09387C14.3308 2.12419 10.4438 3.57187 7.37952 6.18372C6.82811 6.65177 6.36962 7.12455 5.86487 7.64368C4.53517 7.70609 3.75335 7.9624 2.5553 8.43176C3.00865 7.66526 3.92184 6.61212 4.53577 5.96692C8.06141 2.27262 12.91 0.129319 18.0153 0.00891113C18.5411 -0.00847492 19.0947 0.00233347 19.6207 0.0177002Z';

const NUM =
  'M5.70215 8.72598C7.00391 8.68478 8.03601 8.83042 9.19043 9.49942C10.4024 10.2136 11.2856 11.3756 11.6484 12.7348C11.9086 13.7249 11.8771 15.3342 11.5195 16.3119C11.1254 17.389 10.1055 18.5343 8.96289 18.8305C10.7735 19.6178 11.9551 20.9731 12.1455 22.9965C12.2966 24.8614 11.9337 26.6413 10.6074 28.0229C8.69848 30.0111 5.33355 30.3117 2.94043 29.0707C1.14013 28.1371 0.00544909 26.0585 0 24.0121L2.20508 24.0082C2.21178 24.0953 2.22088 24.1823 2.23145 24.269C2.36657 25.3753 2.81746 26.2712 3.69336 26.9555C5.21092 27.9955 7.7241 27.9082 8.99707 26.5014C10.3423 25.0143 10.3165 22.2586 8.81543 20.8793C7.81488 19.96 6.38023 19.856 5.08594 19.9262L5.08008 17.8861C6.35369 17.9003 7.17644 17.9796 8.30664 17.2309C8.89287 16.8305 9.45037 16.014 9.55176 15.3109C9.71752 14.0518 9.64301 12.8666 8.72559 11.9066C7.45078 10.5729 5.16252 10.5087 3.68945 11.5395C2.68165 12.2448 2.41135 13.2948 2.2168 14.4604L0.0292969 14.4525C0.164876 11.1337 2.38218 8.84297 5.70215 8.72598ZM31.5625 8.70547C34.2594 8.65801 36.4211 10.7054 37.0537 13.2397C37.4769 14.9104 37.2965 16.6951 37.3291 18.4106C37.3576 19.9155 37.3269 21.4437 37.333 22.9506C37.3411 24.9416 36.8069 26.857 35.334 28.2641C34.0627 29.4781 32.7478 29.8287 31.0215 29.7934C29.5836 29.7783 28.1468 29.0925 27.1865 28.0463C26.7235 27.5418 26.2356 26.9296 26.0078 26.2777C26.2276 25.5262 26.7292 24.8435 26.8887 23.9897C27.4069 21.2143 26.9085 19.4082 25.4473 17.0688C25.451 14.7264 25.2729 12.6617 26.9287 10.7211C27.9431 9.5324 29.1662 8.83797 30.7432 8.72501C31.0032 8.69553 31.3016 8.71006 31.5625 8.70547ZM20.3359 8.7543C19.5386 10.0512 18.7592 11.3597 17.998 12.6781C17.6095 13.3399 17.0238 14.2425 16.7158 14.9066C17.2099 14.8437 17.7846 14.7267 18.2598 14.6977C20.0271 14.5878 21.775 15.1229 23.1777 16.2035C24.7477 17.4282 25.7719 19.2232 26.0293 21.1977C26.2627 23.1321 25.7226 25.0807 24.5273 26.6195C21.944 29.9197 17.3228 30.5824 14.0068 27.977C13.5079 27.587 13.0595 27.136 12.6719 26.6352C13.0122 25.7785 13.1414 25.1862 13.1982 24.3354L13.2188 23.9535L13.1982 23.5023C13.1652 22.995 13.0979 22.3618 13.0264 21.9789L13.2725 21.9965C13.2621 22.4482 13.3097 22.8994 13.4131 23.3393L13.4795 23.5941C14.2241 26.1887 16.8072 27.8337 19.4961 27.3793C22.2716 26.9099 24.2052 24.3646 23.9131 21.5648C23.6207 18.7652 21.2032 16.6736 18.3906 16.7875C15.5779 16.9015 13.3373 19.1822 13.2725 21.9965L13.0264 21.9779C12.6944 20.9297 12.3668 20.3371 11.6631 19.4955C11.8924 18.7636 13.3615 16.4253 13.8359 15.6059L16.2627 11.4496C16.7482 10.6104 17.3158 9.55644 17.8301 8.76505C18.6378 8.76279 19.5363 8.77903 20.3359 8.7543ZM33.3486 11.4662C32.6366 10.9842 31.7388 10.7715 30.8828 10.9037C29.9921 11.0007 29.1763 11.4488 28.6172 12.1488C28.1835 12.6843 27.8904 13.3194 27.7627 13.9965C27.6143 14.7613 27.6509 15.6419 27.6514 16.4281L27.6553 19.391L27.6562 22.0619C27.6562 23.3652 27.5966 24.6702 28.2754 25.8422C29.0324 27.1488 30.3529 27.791 31.8506 27.5961C33.3697 27.2871 34.2644 26.576 34.7939 25.0775C35.1497 24.0707 35.0925 23.1726 35.0908 22.1264L35.0859 19.4135L35.0889 16.6068C35.0926 14.6902 35.1529 12.6883 33.3486 11.4662ZM37.6143 6.31583C38.7693 6.16316 39.8292 6.97619 39.9814 8.13126C40.1334 9.28636 39.3202 10.3458 38.165 10.4975C37.0108 10.6487 35.9519 9.83623 35.7998 8.68204C35.6478 7.52788 36.4602 6.46875 37.6143 6.31583ZM39.0713 8.13516C38.9254 7.48685 38.2844 7.07706 37.6348 7.21719C37.4342 7.26056 37.2472 7.35454 37.0928 7.48965C36.6748 7.85556 36.5591 8.45918 36.8125 8.95352C37.0663 9.44791 37.6249 9.7058 38.166 9.5795C38.8131 9.42801 39.2172 8.78363 39.0713 8.13516Z';

export type LogoTone = 'on-light' | 'on-petrol' | 'mono-white' | 'mono-black';
export type LogoLockup = 'horizontal' | 'stacked' | 'mark';

// Mark fills are Tailwind `fill-*` classes (not raw attributes) so the mark can
// flip in dark mode. 'on-light' is the only tone that adapts: in dark the mark
// swaps (ring → Petrol, 360 → Gold). The wordmark keeps --color-text-brand in
// both themes: the old dark override #097070 sat at 2.49:1 on the dark surface,
// while the token's own dark value #2cc0ad reads 6.47:1.
const TONE: Record<LogoTone, { ring: string; num: string; word: string; tag: string }> = {
  'on-light': { ring: 'fill-[#D4AF37] dark:fill-[#004D40]', num: 'fill-[#004D40] dark:fill-[#D4AF37]', word: 'text-fg-brand', tag: 'text-fg-accent' },
  'on-petrol': { ring: 'fill-[#D4AF37]', num: 'fill-[#FFFFFF]', word: 'text-fg-inverse', tag: 'text-fg-accent' },
  'mono-white': { ring: 'fill-white', num: 'fill-white', word: 'text-white', tag: 'text-white' },
  'mono-black': { ring: 'fill-[#0F172A]', num: 'fill-[#0F172A]', word: 'text-[#0F172A]', tag: 'text-[#0F172A]' },
};

export function LogoMark({ tone = 'on-light', className }: { tone?: LogoTone; className?: string }) {
  const c = TONE[tone];
  return (
    <svg
      viewBox="0 0 40 39"
      className={cn('block shrink-0', className)}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={RING} className={c.ring} />
      <path d={NUM} className={c.num} />
    </svg>
  );
}

export interface LogoProps {
  /** horizontal = mark + wordmark inline · stacked = mark over wordmark · mark = symbol only. */
  lockup?: LogoLockup;
  /** Colour treatment — mirrors the four Compass colour variants. */
  tone?: LogoTone;
  /** Wrap in an anchor. Pass null to render inline without a link. */
  href?: string | null;
  /** Mark height in px (defaults: 36 horizontal, 40 stacked, 32 mark). */
  markClassName?: string;
  className?: string;
}

function Wordmark({ tone, align }: { tone: LogoTone; align: 'left' | 'center' }) {
  const c = TONE[tone];
  return (
    <span className={cn('flex flex-col leading-none', align === 'center' && 'items-center')}>
      <span className={cn('font-sans text-[16px] font-bold leading-none tracking-tight', c.word)}>
        CompliHub
      </span>
      <span className={cn('mt-[3px] font-sans text-[10px] leading-none', c.tag)}>
        Always on your side.
      </span>
    </span>
  );
}

export function Logo({
  lockup = 'horizontal',
  tone = 'on-light',
  href = '/',
  markClassName,
  className,
}: LogoProps) {
  let content;
  if (lockup === 'mark') {
    content = <LogoMark tone={tone} className={cn('h-8 w-auto', markClassName, className)} />;
  } else if (lockup === 'stacked') {
    content = (
      <span className={cn('flex flex-col items-center gap-1.5', className)}>
        <LogoMark tone={tone} className={cn('h-10 w-auto', markClassName)} />
        <Wordmark tone={tone} align="center" />
      </span>
    );
  } else {
    content = (
      <span className={cn('flex items-center gap-2', className)}>
        <LogoMark tone={tone} className={cn('h-9 w-auto', markClassName)} />
        <Wordmark tone={tone} align="left" />
      </span>
    );
  }

  if (href === null) return content;
  return (
    <a href={href} className="inline-flex shrink-0 items-center" aria-label="CompliHub360 — Home">
      {content}
    </a>
  );
}
