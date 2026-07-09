import { ArrowLeft, ArrowRight } from 'lucide-react';
import { WizardScreen, WizardOptionCard } from './WizardScreen';
import { Button } from '../ui/Button';

const steps = [{ label: 'Markets' }, { label: 'Operations' }, { label: 'Domains' }, { label: 'Review' }];

const markets = [
  { title: 'Germany', desc: 'Primary VAT regime · LUCID register', selected: true },
  { title: 'United Kingdom', desc: 'Post-Brexit packaging + VAT' },
  { title: 'Netherlands', desc: 'VAT + WEEE register' },
  { title: 'France', desc: 'EPR + AGEC compliance' },
  { title: 'Italy', desc: 'VAT + REACH' },
  { title: 'Spain', desc: 'VAT + ecodesign' },
  { title: 'United States', desc: 'Sales-tax nexus · marketplace facilitator' },
  { title: 'Türkiye', desc: 'VAT (KDV) · e-fatura / e-arşiv' },
  { title: 'Others', desc: 'Open country list →' },
];

export function MarketsStep() {
  return (
    <WizardScreen
      steps={steps}
      current={0}
      stepLabel="Step 1 of 4"
      title="Where do you operate?"
      subtitle="Multi-select. We map regulations against the markets you actually sell into."
      topbarRight={
        <a className="text-[12px] font-semibold uppercase tracking-wide text-fg-brand hover:text-fg cursor-pointer">
          Save progress with a free account →
        </a>
      }
      footerLeft={
        <button className="inline-flex items-center gap-1.5 text-[14px] font-medium text-fg-tertiary hover:text-fg-secondary">
          <ArrowLeft size={16} /> Back
        </button>
      }
      footerRight={
        <Button>
          Next <ArrowRight size={16} className="ml-1.5" />
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <WizardOptionCard key={m.title} title={m.title} desc={m.desc} selected={m.selected} />
        ))}
      </div>
      <p className="mt-6 text-center text-[13px] text-fg-tertiary">
        Don't see your market? Tell us — we route to the right partner anyway.
      </p>
    </WizardScreen>
  );
}
