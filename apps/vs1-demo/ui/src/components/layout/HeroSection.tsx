import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ArrowRight, ShieldCheck, Zap, Rocket } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { Card } from '../ui/Card';

const SCENARIOS = [
  { 
    segments: [
      { text: "Your Compliance " },
      { text: "Shortcut", highlight: true },
      { text: " to Global Markets" }
    ],
    text: 'Identify regulatory gaps instantly and match with vetted local experts for seamless execution.' 
  },
  { 
    segments: [
      { text: "From Regulatory Risk to " },
      { text: "Action Plan", highlight: true },
      { text: " in Minutes" }
    ],
    text: 'Translate local fragmentation into a clear roadmap. We help you understand faster and decide safer.' 
  },
  { 
    segments: [
      { text: "The Fastest Way to " },
      { text: "Local Compliance Experts", highlight: true }
    ],
    text: 'Stop guessing. Get your customized assessment and connect with the right partner firm immediately.' 
  }
];

export function HeroSection() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('uk');
  const [category, setCategory] = useState('tax-vat');
  const [sliderIndex, setSliderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentScenario = SCENARIOS[sliderIndex];
    if (!currentScenario) return;
    
    const fullLength = currentScenario.segments.reduce((acc, seg) => acc + seg.text.length, 0);
    let timeoutId: NodeJS.Timeout;

    if (!isDeleting && charIndex < fullLength) {
      timeoutId = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 95);
    } else if (!isDeleting && charIndex === fullLength) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true);
      }, 4000);
    } else if (isDeleting && charIndex > 0) {
      timeoutId = setTimeout(() => {
        setCharIndex((prev) => prev - 1);
      }, 40);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setSliderIndex((prev) => (prev + 1) % SCENARIOS.length);
    }

    return () => clearTimeout(timeoutId);
  }, [charIndex, isDeleting, sliderIndex]);

  const displayedSegments = [];
  if (SCENARIOS[sliderIndex]) {
    let charCountTracker = 0;
    for (const seg of SCENARIOS[sliderIndex].segments) {
      if (charCountTracker >= charIndex) break;
      const remaining = charIndex - charCountTracker;
      const visibleText = seg.text.substring(0, remaining);
      displayedSegments.push({ ...seg, text: visibleText });
      charCountTracker += seg.text.length;
    }
  }

  const handleQualify = () => {
    navigate(`/wizard?category=${category}&country=${country}`);
  };

  return (
    <section className="bg-transparent relative pt-16 desktop-s:pt-28 pb-16 desktop-s:pb-24 overflow-hidden z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 flex flex-col items-center text-center">
        
        {/* Top Content (Centered) */}
        <div className="flex flex-col items-center w-full">
          {/* Title & Description Typewriter Container */}
          <div className="w-full mb-8 min-h-[300px] md:min-h-[340px] flex flex-col justify-start items-center">
            
            {/* TYPEWRITER TITLE */}
            <h1 className="font-bold text-6xl md:text-7xl lg:text-[90px] tracking-tighter text-neutral-900 leading-[1.05] mb-6 w-full max-w-[1200px] text-center" style={{ fontFamily: '"IBM Plex Serif", serif' }}>
              {displayedSegments.map((segment, segIdx) => (
                <span key={segIdx} className={segment.highlight ? 'text-primary-500' : 'text-neutral-900'}>
                  {segment.text}
                </span>
              ))}
              {/* Blinking Cursor */}
              <motion.span 
                animate={{ opacity: [1, 0, 1] }} 
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="inline-block w-[4px] md:w-[6px] h-[0.8em] bg-accent-500 mx-1 md:mx-2 align-middle"
              />
            </h1>

            {/* Fading Description */}
            <div className="min-h-[80px]">
              <AnimatePresence>
                {!isDeleting && charIndex === SCENARIOS[sliderIndex].segments.reduce((acc, seg) => acc + seg.text.length, 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <Typography variant="body" className="text-neutral-600 max-w-2xl text-lg leading-relaxed text-center">
                      {SCENARIOS[sliderIndex].text}
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Dark Green Master Container for Funnel, CTA, and Pills */}
        <div className="w-full max-w-[1100px] rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-2xl relative z-20 mb-4 flex flex-col items-center border border-white/10 bg-primary-950 overflow-hidden isolate transform-gpu">
          
          {/* Animated Mesh Gradient Background */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-90 mix-blend-screen mix-blend-lighten rounded-[32px]">
            {/* Soft Primary Green Blob */}
            <motion.div
              animate={{ 
                x: ["0%", "8%", "-4%", "0%"],
                y: ["0%", "-4%", "6%", "0%"],
                scale: [1, 1.1, 0.95, 1],
                rotate: [0, 10, -5, 0]
              }}
              transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] bg-primary-700/80 rounded-full blur-[100px]"
            />
            {/* Lighter Green Accent Blob */}
            <motion.div
              animate={{ 
                x: ["0%", "-6%", "4%", "0%"],
                y: ["0%", "5%", "-6%", "0%"],
                scale: [1, 1.15, 0.9, 1],
                rotate: [0, -10, 5, 0]
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] -right-[15%] w-[65%] h-[65%] bg-primary-500/50 rounded-full blur-[120px]"
            />
            {/* Deep Base Blob */}
            <motion.div
              animate={{ 
                x: ["0%", "4%", "-8%", "0%"],
                y: ["0%", "8%", "-4%", "0%"],
                scale: [1, 0.95, 1.1, 1],
                rotate: [0, 5, -10, 0]
              }}
              transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-[30%] left-[15%] w-[75%] h-[75%] bg-primary-600/60 rounded-full blur-[140px]"
            />
          </div>

          <div className="relative z-10 w-full flex flex-col items-center pt-2">
            
            {/* PROMPT TO TEST */}
            <div className="text-center mb-8 px-4">
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 leading-tight">Test your compliance readiness</h3>
              <p className="text-primary-100 font-medium text-lg max-w-2xl mx-auto">Select your market and challenge to start the free assessment.</p>
            </div>

            {/* 1) Funnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr_auto] gap-4 lg:gap-6 items-start w-full mb-10">
              {/* Target Market */}
              <div className="w-full flex flex-col items-start gap-2">
                <label className="text-[11px] font-bold text-primary-200 tracking-wider uppercase ml-1">I need to comply in</label>
                <div className="relative w-full">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full appearance-none bg-white border-transparent rounded-xl h-14 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <option value="uk">🇬🇧 United Kingdom</option>
                    <option value="eu">🇪🇺 European Union</option>
                    <option value="global">🌐 Global / Multi-Market</option>
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              {/* Compliance Category */}
              <div className="w-full flex flex-col items-start gap-2">
                <label className="text-[11px] font-bold text-primary-200 tracking-wider uppercase ml-1">My biggest challenge is</label>
                <div className="relative w-full">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-white border-transparent rounded-xl h-14 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <option value="tax-vat">Tax & VAT — Cross-border limits</option>
                    <option value="epr">EPR / Packaging — Producer Responsibility</option>
                    <option value="data-privacy">Data & Privacy — GDPR</option>
                    <option value="marketing-seo">Marketing & Advertising Standards</option>
                    <option value="corporate">Corporate & Legal Structure</option>
                  </select>
                  <ChevronDown size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              {/* Secondary CTA Button (formerly Primary) */}
              <div className="w-full flex flex-col items-center justify-start mt-2 lg:mt-0">
                <div className="hidden lg:block h-[26px]"></div>
                <button
                  onClick={handleQualify}
                  className="w-full lg:w-auto min-w-[260px] h-14 px-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm whitespace-nowrap shadow-sm hover:shadow-md"
                >
                  Start free assessment
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            {/* 2) MAIN CONVERSION: Request Expert Match (Animated Ghost Button) */}
            <div className="flex justify-center w-full mb-6 relative group">
              <div className="relative w-full sm:w-auto min-w-[320px] rounded-2xl p-[1px] overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.15)] group-hover:shadow-[0_0_60px_rgba(250,204,21,0.3)] transition-shadow duration-500">
                {/* Spinning gradient */}
                <span 
                  className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_50%,#facc15_100%)] pointer-events-none" 
                  style={{ animation: 'spin 8s linear infinite' }} 
                />
                {/* Inner Ghost Button */}
                <button 
                  onClick={() => navigate('/register?intent=expert')} 
                  className="relative flex items-center justify-center w-full h-[62px] sm:h-[78px] px-10 bg-primary-950/90 hover:bg-primary-900/90 text-white font-semibold text-xl sm:text-2xl rounded-[15px] transition-all gap-4 backdrop-blur-xl group-hover:bg-primary-900/95"
                >
                  Request expert match instantly <ArrowRight size={28} className="text-accent-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* 3) Outcome USPs (Clean Icons) */}
            <ul className="grid grid-cols-3 gap-4 md:gap-12 w-full max-w-2xl mx-auto mt-6 mb-2">
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <Zap size={44} className="text-accent-400 group-hover:text-accent-300 transition-colors drop-shadow-md" strokeWidth={1.5} />
                <span className="font-normal text-white text-base md:text-lg whitespace-nowrap">Understand faster</span>
              </li>
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <ShieldCheck size={44} className="text-accent-400 group-hover:text-accent-300 transition-colors drop-shadow-md" strokeWidth={1.5} />
                <span className="font-normal text-white text-base md:text-lg whitespace-nowrap">Decide safer</span>
              </li>
              <li className="flex flex-col items-center justify-start gap-4 text-center group cursor-default">
                <Rocket size={44} className="text-accent-400 group-hover:text-accent-300 transition-colors drop-shadow-md" strokeWidth={1.5} />
                <span className="font-normal text-white text-base md:text-lg whitespace-nowrap">Match instantly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
