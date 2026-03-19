import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown, ArrowRight, ShieldCheck, Lock, Scale } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { Card } from '../ui/Card';

const SLIDE_INTERVAL = 3000;
const SCENARIOS = [
  { region: 'Global Markets', text: 'Translate worldwide regulatory fragmentation into a clear, unified action plan.' },
  { region: 'Post-Brexit UK', text: 'Navigate Tax & VAT obligations and EPR requirements with precision.' },
  { region: 'the European Union', text: 'Map your OSS thresholds and mandatory EPR registrations across 27 countries.' }
];

export function HeroSection() {
  const navigate = useNavigate();
  const [country, setCountry] = useState('uk');
  const [category, setCategory] = useState('tax-vat');
  
  const [sliderIndex, setSliderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSliderIndex((prev) => (prev + 1) % SCENARIOS.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleQualify = () => {
    navigate(`/wizard?category=${category}&country=${country}`);
  };

  const currentScenario = SCENARIOS[sliderIndex];

  return (
    <section className="bg-background relative">
      <div className="max-w-7xl mx-auto px-6 py-10 desktop-s:py-16 grid desktop-s:grid-cols-2 gap-10 items-start">
        
        {/* Left — Headline & Slider */}
        <div className="pt-2 desktop-s:pt-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand-surface border border-primary-200 text-primary-700 text-caption font-semibold px-3 py-1 rounded-md mb-6">
            <Sparkles size={14} />
            AI-Powered Advisory System
          </div>

          <Typography variant="display" weight="bold" className="text-neutral-900 leading-tight mb-5 min-h-[140px]">
            Your Compliance{' '}
            <span className="text-primary-500">Compass</span>{' '}
            for <br />
            <span 
              className="transition-opacity duration-500 ease-in-out underline decoration-primary-300 decoration-4 underline-offset-8 inline-block animate-[fadeIn_1s_ease-in-out]"
              key={currentScenario.region}
            >
              {currentScenario.region}
            </span>
          </Typography>

          <Typography 
            variant="body" 
            className="text-neutral-600 max-w-md mb-9 min-h-[60px] animate-[fadeIn_1s_ease-in-out]"
            key={currentScenario.text}
          >
            {currentScenario.text}
          </Typography>

          <ul className="flex flex-col gap-4">
            <li className="flex items-center gap-3 text-ui-small text-neutral-600">
              <div className="bg-brand-surface p-1.5 rounded-md">
                <ShieldCheck size={18} className="text-primary-600 shrink-0" />
              </div>
              <span className="font-medium text-neutral-700">Privacy-first architecture</span>
            </li>
            <li className="flex items-center gap-3 text-ui-small text-neutral-600">
              <div className="bg-brand-surface p-1.5 rounded-md">
                <Lock size={18} className="text-primary-600 shrink-0" />
              </div>
              <span className="font-medium text-neutral-700">No PII stored without consent</span>
            </li>
            <li className="flex items-center gap-3 text-ui-small text-neutral-600">
              <div className="bg-brand-surface p-1.5 rounded-md">
                <Scale size={18} className="text-primary-600 shrink-0" />
              </div>
              <span className="font-medium text-neutral-700">Grounded regulatory sources</span>
            </li>
          </ul>
        </div>

        {/* Right — Intent-Gate (Sticky) */}
        <div className="desktop-s:sticky desktop-s:top-24 z-20">
          <Card className="shadow-lg p-8 border border-neutral-200 border-t-4 border-t-primary-500">
            <Typography variant="h3" weight="bold" className="text-neutral-900 mb-2 font-sans tracking-tight">
              Start your qualification
            </Typography>
            <Typography variant="ui-small" className="text-neutral-500 mb-8">
              Select your market and category to receive a personalised compliance dossier.
            </Typography>

            <div className="space-y-5 mb-8">
              {/* Country */}
              <div>
                <label className="block text-ui-small font-semibold text-neutral-700 mb-2">
                  Target Market
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-12 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                  >
                    <option value="uk">🇬🇧 United Kingdom (Post-Brexit)</option>
                    <option value="eu">🇪🇺 European Union</option>
                    <option value="global">🌐 Global / Multi-Market</option>
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-ui-small font-semibold text-neutral-700 mb-2">
                  Compliance Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md h-12 px-4 pr-10 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
                  >
                    <option value="tax-vat">Tax & VAT — Cross-border limits</option>
                    <option value="epr">EPR / Packaging — Producer Responsibility</option>
                    <option value="data-privacy">Data & Privacy — GDPR</option>
                    <option value="marketing-seo">Marketing & Advertising Standards</option>
                    <option value="corporate">Corporate & Legal Structure</option>
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
            </div>

            <button
              onClick={handleQualify}
              className="w-full h-14 bg-accent-500 hover:bg-accent-600 text-primary-900 font-bold text-body rounded-md transition-all flex items-center justify-center gap-2 shadow-sm hover:translate-y-[-1px] hover:shadow-md"
            >
              Qualify in max. 5 Steps
              <ArrowRight size={18} />
            </button>

            <Typography variant="caption" className="text-neutral-400 text-center mt-5 block normal-case tracking-normal">
              No account required · Secure & Private
            </Typography>
          </Card>
        </div>
        
      </div>
    </section>
  );
}
