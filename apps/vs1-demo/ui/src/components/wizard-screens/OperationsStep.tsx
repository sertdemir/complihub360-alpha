import { ArrowLeft, ArrowRight } from 'lucide-react';
import { WizardScreen, WizardOptionCard } from './WizardScreen';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const steps = [{ label: 'Markets' }, { label: 'Operations' }, { label: 'Domains' }, { label: 'Review' }];

const businessModels = [
  { title: 'D2C e-commerce', desc: 'Direct-to-consumer online sales', selected: true },
  { title: 'B2B / wholesale', desc: 'Sell to businesses or distributors' },
  { title: 'Marketplace', desc: 'You connect buyers + sellers' },
  { title: 'SaaS / digital products', desc: 'Software, subscriptions, no physical shipment' },
  { title: 'Hybrid', desc: 'Mix of B2B and B2C channels' },
  { title: 'Other', desc: 'Tell us in a sentence' },
];

const revenueBands = ['< €500K', '€500K — €2M', '€2M — €5M', '€5M — €25M', '€25M+'];
const selectedBand = '€2M — €5M';

export function OperationsStep() {
  return (
    <WizardScreen
      steps={steps}
      current={1}
      stepLabel="Step 2 of 4"
      title="What do your operations look like?"
      subtitle="We use this to scope the regulations that actually apply — not just to your market, but to your operation."
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Business model</p>
      <p className="mb-3 text-[13px] text-fg-secondary">Pick one. Determines which regulations actually apply.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {businessModels.map((m) => (
          <WizardOptionCard key={m.title} title={m.title} desc={m.desc} selected={m.selected} />
        ))}
      </div>

      <p className="mt-8 text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">Annual revenue</p>
      <p className="mb-3 text-[13px] text-fg-secondary">Pick a band. We tune obligation thresholds against your scale.</p>
      <div className="flex flex-wrap gap-2">
        {revenueBands.map((band) => {
          const on = band === selectedBand;
          return (
            <span
              key={band}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium',
                on ? 'border-stroke-brand bg-brand-light/60 text-fg-brand' : 'border-stroke text-fg-secondary',
              )}
            >
              {band}
            </span>
          );
        })}
      </div>
    </WizardScreen>
  );
}
