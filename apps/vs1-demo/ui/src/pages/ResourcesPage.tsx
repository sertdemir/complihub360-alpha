import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Users,
  TrendingUp,
  Globe,
  FileText,
  Download,
  Calendar,
  Clock,
  Tag,
} from 'lucide-react';
import { Typography } from '../components/ui/Typography';


// ─── Customer Story Data ──────────────────────────────────────────────────────

const STORIES = [
  {
    id: 'story-1',
    company: 'NordicHealth GmbH',
    logo: '🏥',
    industry: 'HealthTech',
    market: '🇩🇪 → 🇬🇧',
    challenge: 'Expanding a health supplement D2C brand from Germany to the UK — unsure about UK VAT registration, EPR packaging, and UK GDPR requirements.',
    outcome: 'Full risk profile in under 2 minutes. Matched with a UK VAT specialist who confirmed registration within 3 days.',
    metrics: [
      { value: '< 2 min', label: 'Risk profile' },
      { value: '3 days', label: 'Expert confirmed' },
      { value: '€0', label: 'Platform fee' },
    ],
    tags: ['Tax & VAT', 'EPR', 'UK GDPR'],
  },
  {
    id: 'story-2',
    company: 'ShopWave Inc.',
    logo: '🛒',
    industry: 'E-Commerce SaaS',
    market: '🇺🇸 → 🇪🇺',
    challenge: 'A US-based e-commerce SaaS wanted to serve EU merchants but needed GDPR compliance for data processing and cookie consent across 5 EU countries.',
    outcome: 'The Privacy Wizard identified 4 high-risk tracking tools in their stack. Matched with a GDPR specialist who delivered a compliant setup in 2 weeks.',
    metrics: [
      { value: '4', label: 'Tools flagged' },
      { value: '2 weeks', label: 'Full compliance' },
      { value: '100%', label: 'Source-grounded' },
    ],
    tags: ['Data & Privacy', 'GDPR'],
  },
  {
    id: 'story-3',
    company: 'GreenPack Logistics',
    logo: '📦',
    industry: 'Logistics',
    market: '🇬🇧 → 🇩🇪 🇫🇷',
    challenge: 'UK-based dropshipper expanding to Germany and France, with no clarity on packaging liability across jurisdictions.',
    outcome: 'Our "Assume Yes" safety logic correctly flagged the EPR requirement. Matched with specialists in both markets within 48h.',
    metrics: [
      { value: '48h', label: 'Specialist match' },
      { value: '2', label: 'Markets covered' },
      { value: 'High', label: 'Risk identified' },
    ],
    tags: ['EPR & Packaging', 'VerpackG'],
  },
];

// ─── Guides Data ──────────────────────────────────────────────────────────────

const GUIDES = [
  {
    id: 'guide-1',
    title: 'The Complete EU VAT Guide for E-Commerce',
    desc: 'Everything you need to know about OSS, delivery thresholds, and when VAT registration becomes mandatory across EU member states.',
    category: 'Tax & VAT',
    categoryColor: 'bg-error-50 text-error-600',
    readTime: '12 min read',
    date: 'March 2026',
    type: 'Guide',
  },
  {
    id: 'guide-2',
    title: 'EPR Packaging Laws: Germany vs. UK vs. France',
    desc: 'A side-by-side comparison of packaging compliance requirements for merchants selling physical goods across these three key markets.',
    category: 'EPR & Packaging',
    categoryColor: 'bg-warning-bg text-warning-text',
    readTime: '8 min read',
    date: 'March 2026',
    type: 'Whitepaper',
  },
  {
    id: 'guide-3',
    title: 'GDPR for SaaS Founders: The Tracking Stack Checklist',
    desc: 'Which tracking tools violate GDPR? How to audit your analytics, ad pixels, and CRM integrations before expanding to the EU.',
    category: 'Data & Privacy',
    categoryColor: 'bg-primary-50 text-primary-600',
    readTime: '10 min read',
    date: 'February 2026',
    type: 'Guide',
  },
  {
    id: 'guide-4',
    title: 'Setting Up a GmbH for Non-German Founders',
    desc: 'Step-by-step guide on establishing a German limited company, including notary requirements, trade office registration, and tax ID setup.',
    category: 'Corporate Structure',
    categoryColor: 'bg-success-bg text-success-500',
    readTime: '15 min read',
    date: 'January 2026',
    type: 'Whitepaper',
  },
];


// ─── Tab Navigation ───────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const tabs = [
    { id: 'stories', label: 'Customer Stories', icon: Users },
    { id: 'guides', label: 'Guides & Whitepapers', icon: BookOpen },
  ];

  return (
    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center justify-center gap-1 py-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => {
                onChange(t.id);
                document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-ui-small font-semibold whitespace-nowrap transition-colors ${
                active === t.id ? 'text-primary-700 bg-primary-50' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({ story, index }: { story: typeof STORIES[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group"
    >
      {/* Header Gradient */}
      <div className="bg-gradient-to-br from-primary-900 to-primary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{story.logo}</span>
            <div>
              <Typography variant="ui-small" weight="bold" className="text-white block">{story.company}</Typography>
              <Typography variant="caption" className="text-primary-300 block normal-case tracking-normal">{story.industry}</Typography>
            </div>
          </div>
          <span className="text-sm bg-primary-800 border border-primary-600 text-primary-200 px-3 py-1 rounded-lg font-medium">
            {story.market}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <Typography variant="caption" className="text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
          Challenge
        </Typography>
        <Typography variant="body" className="text-neutral-600 mb-5 leading-relaxed">
          {story.challenge}
        </Typography>

        <Typography variant="caption" className="text-success-500 font-semibold uppercase tracking-wider mb-2 block">
          Outcome
        </Typography>
        <Typography variant="body" className="text-neutral-700 mb-5 leading-relaxed font-medium">
          {story.outcome}
        </Typography>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {story.metrics.map(m => (
            <div key={m.label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-center">
              <Typography variant="h3" weight="bold" className="text-primary-600 block">{m.value}</Typography>
              <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal text-[10px]">{m.label}</Typography>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {story.tags.map(t => (
            <span key={t} className="text-xs bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-md text-neutral-500 font-medium">
              <Tag size={10} className="inline mr-1" />{t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Guide Card ───────────────────────────────────────────────────────────────

function GuideCard({ guide, index }: { guide: typeof GUIDES[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-white border border-neutral-200 rounded-2xl p-6 hover:shadow-md transition-shadow group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${guide.categoryColor}`}>{guide.category}</span>
          <span className="text-xs bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded text-neutral-400 font-medium">{guide.type}</span>
        </div>
        <ArrowUpRight size={16} className="text-neutral-300 group-hover:text-primary-500 transition-colors shrink-0" />
      </div>

      <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2 group-hover:text-primary-700 transition-colors">
        {guide.title}
      </Typography>
      <Typography variant="body" className="text-neutral-600 mb-5 leading-relaxed">
        {guide.desc}
      </Typography>

      <div className="flex items-center gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1"><Clock size={12} />{guide.readTime}</span>
        <span className="flex items-center gap-1"><Calendar size={12} />{guide.date}</span>
      </div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function ResourcesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('stories');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setActiveTab(id === 'guides' ? 'guides' : 'stories');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Customer Stories */}
      <section id="stories" className="py-16 desktop-s:py-20 bg-background scroll-mt-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              Customer Stories
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              Real Compliance Outcomes,<br className="hidden tablet:block" /> Not Marketing Claims
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
              See how businesses like yours used CompliHub360 to navigate complex cross-border compliance — from uncertainty to resolution.
            </Typography>
          </div>

          <div className="grid tablet:grid-cols-3 gap-6">
            {STORIES.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Guides & Whitepapers */}
      <section id="guides" className="py-16 desktop-s:py-20 bg-neutral-50 scroll-mt-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-12">
            <Typography variant="caption" className="text-primary-500 mb-3 block font-semibold">
              Guides & Whitepapers
            </Typography>
            <Typography variant="display" weight="bold" className="text-neutral-900 mb-5 leading-tight">
              Knowledge That Builds<br className="hidden tablet:block" /> Compliance Confidence
            </Typography>
            <Typography variant="body" className="text-neutral-600 text-lg leading-relaxed">
              In-depth market deep-dives, regulatory breakdowns, and practical checklists — curated by our compliance intelligence engine and reviewed by specialists.
            </Typography>
          </div>

          <div className="grid tablet:grid-cols-2 gap-6">
            {GUIDES.map((guide, i) => (
              <GuideCard key={guide.id} guide={guide} index={i} />
            ))}
          </div>

          {/* Knowledge base info box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-10 bg-primary-900 rounded-2xl p-8 flex flex-col tablet:flex-row items-center gap-6"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center shrink-0">
              <BookOpen size={26} className="text-accent-400" />
            </div>
            <div className="flex-1">
              <Typography variant="h3" weight="bold" className="text-white mb-2">
                Living Knowledge Base
              </Typography>
              <Typography variant="body" className="text-primary-300 leading-relaxed">
                Every platform update, new compliance rule, or partner integration triggers a dedicated content update. Our guides are evergreen — automatically maintained and verified against the latest regulatory sources.
              </Typography>
            </div>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary-900 font-bold text-sm shadow-md hover:bg-neutral-100 transition-colors shrink-0"
            >
              Get Notified
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 desktop-s:py-24 bg-primary-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Typography variant="display" weight="bold" className="text-white mb-5">
            Ready to become compliant?
          </Typography>
          <Typography variant="body" className="text-primary-300 mb-10 text-lg">
            Join businesses that turned compliance uncertainty into structured action plans.
          </Typography>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/wizard')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-900 font-bold text-base shadow-lg hover:bg-neutral-100 transition-colors"
            >
              Start Free Assessment
            </button>
            <button
              onClick={() => navigate('/platform')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-primary-400 text-white font-bold text-base hover:bg-primary-800 transition-colors"
            >
              Explore Platform
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-900 py-10 text-center">
        <Typography variant="caption" className="text-neutral-500 block normal-case tracking-normal">
          © {new Date().getFullYear()} CompliHub360. Built in Berlin.
        </Typography>
      </footer>
    </div>
  );
}
