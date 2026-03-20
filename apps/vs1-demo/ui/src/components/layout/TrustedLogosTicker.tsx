import { motion } from 'framer-motion';

const PARTNERS = [
  { name: 'Deloitte', domain: 'deloitte.com' },
  { name: 'KPMG', domain: 'kpmg.com' },
  { name: 'Baker McKenzie', domain: 'bakermckenzie.com' },
  { name: 'DLA Piper', domain: 'dlapiper.com' },
  { name: 'Grant Thornton', domain: 'grantthornton.global' },
  { name: 'BDO', domain: 'bdo.global' },
];

// Duplicate list to create a seamless infinite loop
const TICKER_ITEMS = [...PARTNERS, ...PARTNERS, ...PARTNERS];

export function TrustedLogosTicker() {
  return (
    <section className="bg-white py-12 desktop-s:py-16 overflow-hidden flex flex-col items-center relative z-20 border-b border-neutral-100">
      <p className="text-[11px] font-bold text-neutral-400 tracking-[0.2em] uppercase mb-10 text-center px-6">
        Trusted by compliance teams at
      </p>

      {/* Ticker Container */}
      <div className="relative w-full flex overflow-hidden max-w-[1400px] mx-auto">
        {/* Gradients for fade effect on left and right */}
        <div className="absolute left-0 top-0 bottom-0 w-24 tablet:w-48 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 tablet:w-48 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <motion.div
          animate={{ x: ["0%", "-33.333333%"] }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
          className="flex items-center gap-6 w-max"
        >
          {TICKER_ITEMS.map((partner, i) => (
            <div
              key={`${partner.name}-${i}`}
              className="flex items-center justify-center px-8 w-[200px] shrink-0 transition-all duration-500 hover:scale-105 cursor-pointer group"
            >
              <img
                src={`https://logo.clearbit.com/${partner.domain}`}
                alt={`${partner.name} logo`}
                className="max-w-[180px] max-h-[48px] object-contain opacity-40 mix-blend-multiply grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500"
                onError={(e) => {
                  // Fallback if clearbit doesn't have the logo
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="font-bold text-neutral-400 text-xl tracking-tight opacity-50 transition-opacity hover:opacity-100">${partner.name}</span>`;
                  }
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
