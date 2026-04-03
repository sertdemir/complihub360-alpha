interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showClaim?: boolean;
  className?: string;
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      {/* Shield base - Primary Green */}
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
        fill="#004D40"
      />
      {/* Shield inner highlight */}
      <path
        d="M32 8L12 18.4v13.6c0 12.32 8.53 23.84 20 27.44V8z"
        fill="#003E33"
      />
      {/* Circular arc - Accent Gold (360 motif) */}
      <path
        d="M32 12c-11.05 0-20 8.95-20 20h4c0-8.84 7.16-16 16-16V12z"
        fill="#D4AF37"
        opacity="0.9"
      />
      <path
        d="M52 32c0-11.05-8.95-20-20-20v4c8.84 0 16 7.16 16 16h4z"
        fill="#D4AF37"
        opacity="0.6"
      />
      {/* Checkmark - Accent Gold */}
      <path
        d="M22 32l7 7 13-14"
        stroke="#D4AF37"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dynamic swoosh arrow */}
      <path
        d="M44 20l4-4m0 0l-4-1m4 1l-1 4"
        stroke="#D4AF37"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const sizeMap = {
  sm: { icon: 'w-7 h-7', text: 'text-sm', claim: 'text-[9px]' },
  md: { icon: 'w-9 h-9', text: 'text-lg', claim: 'text-[10px]' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl', claim: 'text-xs' },
};

export function Logo({ size = 'sm', showClaim = false, className = '' }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon className={`${s.icon} shrink-0`} />
      <div className="flex flex-col">
        <span className={`font-serif font-semibold text-neutral-900 tracking-tight leading-tight ${s.text}`}>
          CompliHub<span className="text-primary-500">360</span>
        </span>
        {showClaim && (
          <span className={`text-neutral-500 tracking-wide uppercase font-medium leading-tight ${s.claim}`}>
            Global Compliance. Simplified.
          </span>
        )}
      </div>
    </div>
  );
}

export { LogoIcon };
