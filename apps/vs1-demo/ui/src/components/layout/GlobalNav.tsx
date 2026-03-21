import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
  CircleDot, ChevronDown, ArrowRight,
  Zap, Users, Globe, Building2,
  Rocket, Layers, Scale,
  MessageSquare, FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Typography } from '../ui/Typography';

const HEADER_MENU: {
  id: string;
  label: string;
  path?: string;
  items: { icon: LucideIcon; anim: object; title: string; desc: string; path: string }[];
}[] = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { icon: Zap,       anim: { scale: 1.2, rotate: 15 },        title: 'The AI Engine',     desc: 'Secure data extraction & mapping', path: '/platform#engine' },
      { icon: Users,     anim: { scale: 1.15, y: -3 },            title: 'Partner Matching',  desc: 'From risk to local execution',     path: '/platform#matching' },
      { icon: Globe,     anim: { scale: 1.1, rotate: 20 },        title: 'Global Coverage',   desc: 'UK, EU, Germany & US',             path: '/platform#coverage' },
      { icon: Building2, anim: { scale: 1.15, y: -2 },            title: 'For Partner Firms', desc: 'Lead generation for advisors',     path: '/platform#partners' },
    ],
  },
  {
    id: 'solutions',
    label: 'Solutions',
    items: [
      { icon: Rocket, anim: { scale: 1.2, y: -6, rotate: -8 },   title: 'Founders & CEOs',   desc: 'Minimise risk & scale faster',  path: '/solutions#founders' },
      { icon: Layers, anim: { scale: 1.15, y: -3 },               title: 'Operations Teams',  desc: 'Automate daily compliance',     path: '/solutions#operations' },
      { icon: Scale,  anim: { scale: 1.1, rotate: -12 },          title: 'In-House Counsel',  desc: 'Cut research time by 90%',      path: '/solutions#counsel' },
    ],
  },
  {
    id: 'areas',
    label: 'Compliance Areas',
    path: '/compliance',
    items: [],
  },
  {
    id: 'resources',
    label: 'Resources',
    items: [
      { icon: MessageSquare, anim: { scale: 1.15, y: -2, x: 2 }, title: 'Customer Stories',     desc: 'See real compliance outcomes', path: '/resources#stories' },
      { icon: FileText,      anim: { scale: 1.15, y: -3 },        title: 'Guides & Whitepapers', desc: 'In-depth market deep-dives',   path: '/resources#guides' },
    ],
  },
];

// Routes where the global nav should not render
const HIDDEN_PATHS = ['/login', '/register', '/verify-email', '/dashboard'];

export function GlobalNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const isHidden =
    HIDDEN_PATHS.includes(location.pathname) ||
    location.pathname.startsWith('/wizard');

  useEffect(() => {
    const handleScroll = () => setActiveMenu(null);
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('header')) setActiveMenu(null);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  if (isHidden) return null;

  return (
    <header className="fixed top-5 inset-x-0 z-50 flex flex-col items-center pointer-events-none">

      {/* ── Floating Glass Pill ─────────────────────────────────── */}
      <div className="pointer-events-auto flex items-center justify-between gap-3 px-7 h-12 w-full max-w-[1100px] mx-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_4px_32px_rgba(0,0,0,0.08)] whitespace-nowrap">

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0 px-2"
          aria-label="CompliHub360 Home"
        >
          <div className="w-5 h-5 bg-primary-500 rounded-sm flex items-center justify-center">
            <CircleDot size={12} className="text-white" />
          </div>
          <span className="font-sans font-bold text-neutral-900 tracking-tight text-sm">
            CompliHub<span className="text-primary-500">360</span>
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-neutral-200 mx-1 shrink-0" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {HEADER_MENU.map((menu) => (
            <div key={menu.id} className="flex items-center">
              <button
                onClick={() => {
                  if (menu.path) navigate(menu.path);
                  else setActiveMenu(activeMenu === menu.id ? null : menu.id);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeMenu === menu.id
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
                }`}
              >
                {menu.label}
                {menu.items.length > 0 && (
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${activeMenu === menu.id ? 'rotate-180 text-primary-600' : 'text-neutral-400'}`}
                  />
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="w-px h-5 bg-neutral-200 mx-1 shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            className="text-neutral-600 hover:text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-neutral-100/80 transition-colors"
            onClick={() => navigate('/login')}
          >
            Log in
          </button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
            Sign up for free
          </Button>
        </div>
      </div>

      {/* ── Floating Dropdown ───────────────────────────────────── */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-auto mt-2 w-full max-w-[1100px] mx-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <div className="px-8 py-6">
              <div className="flex flex-nowrap justify-center gap-10">
                {HEADER_MENU.find(m => m.id === activeMenu)?.items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => { navigate(item.path); setActiveMenu(null); }}
                    className="text-left group flex items-start gap-3 p-3 -m-3 rounded-xl hover:bg-neutral-100/60 transition-colors"
                  >
                    <motion.div
                      className="flex items-start justify-center shrink-0 pt-0.5"
                      whileHover={item.anim}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    >
                      <item.icon size={32} className="text-primary-600 group-hover:text-primary-500 transition-colors" strokeWidth={1.5} />
                    </motion.div>
                    <div className="mt-0.5">
                      <Typography variant="ui-small" weight="bold" className="text-neutral-900 flex items-center gap-1 mb-1 group-hover:text-primary-700 transition-colors">
                        {item.title}
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 w-0 group-hover:w-auto overflow-hidden group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-500" />
                      </Typography>
                      <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
                        {item.desc}
                      </Typography>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
