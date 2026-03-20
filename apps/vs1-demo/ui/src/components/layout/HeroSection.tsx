import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight, ShieldCheck, Zap, Rocket } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { HeroMeshBackground } from './HeroMeshBackground';

const SCENARIOS = [
  {
    segments: [
      { text: "Your Compliance " },
      { text: "Shortcut", highlight: true },
      { text: " to Global Markets" }
    ],
    text: 'Identify regulatory gaps instantly and match with vetted local experts for seamless execution.',
    cta: 'Find my compliance shortcut',
  },
  {
    segments: [
      { text: "From Regulatory Risk to " },
      { text: "Action Plan", highlight: true },
      { text: " in Minutes" }
    ],
    text: 'Translate local fragmentation into a clear roadmap. We help you understand faster and decide safer.',
    cta: 'Build my action plan now',
  },
  {
    segments: [
      { text: "The Fastest Way to " },
      { text: "Local Compliance Experts", highlight: true }
    ],
    text: 'Stop guessing. Get your customized assessment and connect with the right partner firm immediately.',
    cta: 'Connect with an expert now',
  },
];

export function HeroSection() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('uk');
  const [category, setCategory] = useState('tax-vat');
  const [sliderIndex, setSliderIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setSliderIndex((prev) => (prev + 1) % SCENARIOS.length);
      }
    }, 5500);
    return () => clearInterval(id);
  }, []);

  const handleQualify = () => {
    navigate(`/wizard?category=${category}&country=${country}`);
  };

  return (
    <section className="bg-transparent relative pt-16 desktop-s:pt-28 pb-16 desktop-s:pb-24 overflow-hidden z-10">

      {/* ── Mesh Animation ──────────────────────────────────────── */}
      <HeroMeshBackground />

      {/* ── Depth Layer ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Linear gradient bottom → top, slowly drifting */}
        <motion.div
          className="absolute -left-[5%] -right-[5%] -bottom-[15%] h-[130%]"
          animate={{ y: ['0%', '-4%', '2%', '-3%', '0%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'linear-gradient(to top, rgba(0,62,51,0.18) 0%, rgba(102,187,106,0.20) 45%, rgba(244,196,74,0.08) 75%, transparent 100%)',
          }}
        />
        {/* Edge vignette — darkens corners for depth */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 10%, transparent 40%, rgba(0,0,0,0.05) 100%)' }} />
      </div>
      {/* ──────────────────────────────────────────────────────────── */}

      <div className="w-full max-w-[1440px] mx-auto px-6 flex flex-col items-center text-center relative z-10">
        
        {/* Top Content (Centered) */}
        <div className="flex flex-col items-center w-full">
          {/* Title & Description Fade Container */}
          <div className="w-full mb-4 min-h-[300px] md:min-h-[340px] flex flex-col justify-start items-center">

            {/* FADE TITLE */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={sliderIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1] }}
                className="font-bold text-6xl md:text-7xl lg:text-[90px] tracking-tighter text-neutral-900 leading-[1.05] mb-6 w-full max-w-[1200px] text-center"
                style={{ fontFamily: '"IBM Plex Serif", serif' }}
              >
                {SCENARIOS[sliderIndex].segments.map((segment, segIdx) => (
                  <span key={segIdx} className={segment.highlight ? 'text-primary-500' : 'text-neutral-900'}>
                    {segment.text}
                  </span>
                ))}
              </motion.h1>
            </AnimatePresence>

            {/* FADE DESCRIPTION */}
            <div className="min-h-[80px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={sliderIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1], delay: 0.18 }}
                >
                  <Typography variant="body" className="text-neutral-600 max-w-2xl text-lg leading-relaxed text-center">
                    {SCENARIOS[sliderIndex].text}
                  </Typography>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── CTA Button — rhythmisch mit Titel ─────────────────── */}
        <div className="flex justify-center w-full mb-4 relative group">
          <AnimatePresence mode="wait">
            <motion.div
              key={sliderIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 1.2, ease: [0.45, 0, 0.55, 1], delay: 0.36 }}
              className="relative w-full sm:w-auto min-w-[256px] rounded-xl p-[1px] overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.2)] group-hover:shadow-[0_0_60px_rgba(250,204,21,0.4)] transition-shadow duration-500"
            >
              <span
                className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_50%,#facc15_100%)] pointer-events-none"
                style={{ animation: 'spin 8s linear infinite' }}
              />
              <button
                onClick={() => navigate('/register?intent=expert')}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                className="relative flex items-center justify-center w-full h-[50px] sm:h-[62px] px-8 bg-primary-950 hover:bg-primary-900 text-white font-semibold text-base sm:text-xl rounded-[12px] transition-all gap-3 group-hover:bg-primary-900"
              >
                {SCENARIOS[sliderIndex].cta}
                <ArrowRight size={22} className="text-accent-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Input Container ────────────────────────────────────── */}
        {/* Light Green Master Container for Funnel, CTA, and Pills */}
        <div className="w-full max-w-[1100px] rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-xl relative z-20 mb-4 flex flex-col items-center border border-white/50 bg-white/30 backdrop-blur-xl overflow-hidden transform-gpu">

          <div className="relative z-10 w-full flex flex-col items-center pt-2">

            {/* PROMPT TO TEST */}
            <div className="text-center mb-8 px-4">
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-primary-950 mb-2 leading-tight">Test your compliance readiness</h3>
              <p className="text-primary-800 font-medium text-lg max-w-2xl mx-auto">Select your market and challenge to start the free assessment.</p>
            </div>

            {/* 1) Funnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr_auto] gap-4 lg:gap-6 items-start w-full mb-10">
              {/* Target Market */}
              <div className="w-full flex flex-col items-start gap-2">
                <label className="text-[11px] font-bold text-primary-700 tracking-wider uppercase ml-1">I need to comply in</label>
                <div className="relative w-full">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full appearance-none bg-white border border-primary-300 rounded-xl h-14 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <option value="uk">🇬🇧 United Kingdom</option>
                    <option value="eu">🇪🇺 European Union</option>
                    <option value="global">🌐 Global / Multi-Market</option>
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              {/* Compliance Category */}
              <div className="w-full flex flex-col items-start gap-2">
                <label className="text-[11px] font-bold text-primary-700 tracking-wider uppercase ml-1">My biggest challenge is</label>
                <div className="relative w-full">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-white border border-primary-300 rounded-xl h-14 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <option value="tax-vat">Tax & VAT — Cross-border limits</option>
                    <option value="epr">EPR / Packaging — Producer Responsibility</option>
                    <option value="data-privacy">Data & Privacy — GDPR</option>
                    <option value="marketing-seo">Marketing & Advertising Standards</option>
                    <option value="corporate">Corporate & Legal Structure</option>
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              {/* Secondary CTA Button */}
              <div className="w-full flex flex-col items-center justify-start mt-2 lg:mt-0">
                <div className="hidden lg:block h-[26px]"></div>
                <button
                  onClick={handleQualify}
                  className="w-full lg:w-auto min-w-[260px] h-14 px-8 bg-primary-700 hover:bg-primary-800 text-white border border-primary-700 hover:border-primary-800 font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 whitespace-nowrap shadow-sm hover:shadow-md"
                >
                  Start free assessment
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            {/* 2) Outcome USPs (Clean Icons) */}
            <ul className="grid grid-cols-3 gap-4 md:gap-12 w-full max-w-2xl mx-auto mt-6 mb-2">
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <Zap size={44} className="text-primary-700 group-hover:text-primary-600 transition-colors" strokeWidth={1.5} />
                <span className="font-medium text-primary-950 text-base md:text-lg whitespace-nowrap">Understand faster</span>
              </li>
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <ShieldCheck size={44} className="text-primary-700 group-hover:text-primary-600 transition-colors" strokeWidth={1.5} />
                <span className="font-medium text-primary-950 text-base md:text-lg whitespace-nowrap">Decide safer</span>
              </li>
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <Rocket size={44} className="text-primary-700 group-hover:text-primary-600 transition-colors" strokeWidth={1.5} />
                <span className="font-medium text-primary-950 text-base md:text-lg whitespace-nowrap">Match instantly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
