import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import {
  type LucideIcon,
  CircleDot, ChevronDown, ArrowRight,
  Zap, Users, Globe as GlobeIcon, Building2,
  Rocket, Layers, Scale,
  MessageSquare, FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Typography } from '../ui/Typography';

const HIDDEN_PATHS = ['/login', '/register', '/verify-email', '/dashboard'];

export function GlobalNav() {
  const { t, i18n } = useTranslation('common');
  const currentLang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const pathWithoutLang = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  const isHidden = HIDDEN_PATHS.includes(pathWithoutLang) || pathWithoutLang.startsWith('/wizard');

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

  const navTo = (path: string) => {
    setActiveMenu(null);
    if (path.startsWith('/')) {
      navigate(`/${currentLang}${path}`);
    } else {
      navigate(path);
    }
  };

  const HEADER_MENU: {
    id: string;
    label: string;
    path?: string;
    items: { icon: LucideIcon; anim: any; title: string; desc: string; path: string }[];
  }[] = [
    {
      id: 'platform',
      label: t('nav.platform', 'Platform'),
      items: [
        { icon: Zap,       anim: { scale: 1.2, rotate: 15 },        title: t('nav.items.aiEngine.title'),     desc: t('nav.items.aiEngine.desc'), path: '/platform#engine' },
        { icon: Users,     anim: { scale: 1.15, y: -3 },            title: t('nav.items.partnerMatching.title'),  desc: t('nav.items.partnerMatching.desc'),     path: '/platform#matching' },
        { icon: GlobeIcon, anim: { scale: 1.1, rotate: 20 },        title: t('nav.items.globalCoverage.title'),   desc: t('nav.items.globalCoverage.desc'),             path: '/platform#coverage' },
        { icon: Building2, anim: { scale: 1.15, y: -2 },            title: t('nav.items.forPartners.title'), desc: t('nav.items.forPartners.desc'),     path: '/platform#partners' },
      ],
    },
    {
      id: 'solutions',
      label: t('nav.solutions', 'Solutions'),
      items: [
        { icon: Rocket, anim: { scale: 1.2, y: -6, rotate: -8 },   title: t('nav.items.founders.title'),   desc: t('nav.items.founders.desc'),  path: '/solutions#founders' },
        { icon: Layers, anim: { scale: 1.15, y: -3 },               title: t('nav.items.operations.title'),  desc: t('nav.items.operations.desc'),     path: '/solutions#operations' },
        { icon: Scale,  anim: { scale: 1.1, rotate: -12 },          title: t('nav.items.counsel.title'),  desc: t('nav.items.counsel.desc'),      path: '/solutions#counsel' },
      ],
    },
    {
      id: 'areas',
      label: t('nav.complianceAreas', 'Compliance Areas'),
      path: '/compliance',
      items: [],
    },
    {
      id: 'resources',
      label: t('nav.resources', 'Resources'),
      items: [
        { icon: MessageSquare, anim: { scale: 1.15, y: -2, x: 2 }, title: t('nav.items.stories.title'),     desc: t('nav.items.stories.desc'), path: '/resources#stories' },
        { icon: FileText,      anim: { scale: 1.15, y: -3 },        title: t('nav.items.guides.title'), desc: t('nav.items.guides.desc'),   path: '/resources#guides' },
      ],
    },
    {
      id: 'ai-governance',
      label: t('nav.aiGovernance', 'AI Governance'),
      path: '/ai-governance',
      items: [],
    },
  ];

  if (isHidden) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">

      {/* ── Full Width Header ─────────────────────────────────── */}
      <div className="pointer-events-auto w-full bg-white/40 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_32px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-6 px-6 lg:px-10 py-6 w-full max-w-7xl mx-auto whitespace-nowrap">

        {/* Logo */}
        <button
          onClick={() => navTo('/')}
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
        <div className="w-px h-5 bg-neutral-200 shrink-0 hidden md:block" />

        {/* Nav */}
        <nav className="flex items-center justify-center flex-1 gap-2 md:gap-8 overflow-x-auto">
          {HEADER_MENU.map((menu) => (
            <div key={menu.id} className="flex items-center">
              <button
                onClick={() => {
                  if (menu.path) navTo(menu.path);
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
        <div className="w-px h-5 bg-neutral-200 shrink-0 hidden md:block" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          
          <button
            className="text-neutral-600 hover:text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-neutral-100/80 transition-colors ml-1"
            onClick={() => navTo('/login')}
          >
            {t('nav.login', 'Log in')}
          </button>
          <Button variant="primary" size="sm" onClick={() => navTo('/register')}>
            {t('nav.signup', 'Sign up for free')}
          </Button>
        </div>
        </div>
      </div>

      {/* ── Floating Dropdown ───────────────────────────────────── */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' } as any}
            className="pointer-events-auto mt-2 w-full max-w-[1100px] mx-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden"
          >
            <div className="px-8 py-6">
              <div className="flex flex-nowrap justify-center gap-10">
                {HEADER_MENU.find(m => m.id === activeMenu)?.items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navTo(item.path)}
                    className="text-left group flex items-start gap-3 p-3 -m-3 rounded-xl hover:bg-neutral-100/60 transition-colors"
                  >
                    <motion.div
                      className="flex items-start justify-center shrink-0 pt-0.5"
                      whileHover={item.anim}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 } as any}
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
