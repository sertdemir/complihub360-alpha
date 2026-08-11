import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Globe,
  Shield,
  MessageSquare,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { WizardScreen, WizardOptionCard } from './WizardScreen';

const steps = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains' },
  { label: 'Review' },
];

const topbarRight = (
  <a className="text-[12px] font-semibold uppercase tracking-wide text-fg-brand hover:text-fg cursor-pointer">
    Save progress<span className="hidden sm:inline"> with a free account</span> →
  </a>
);

const footerLeft = (
  <button className="inline-flex items-center gap-1.5 text-[14px] font-medium text-fg-tertiary hover:text-fg-secondary">
    <ArrowLeft size={16} /> Back
  </button>
);

export function DomainsStep({ className }: { className?: string }) {
  return (
    <WizardScreen
      className={className}
      steps={steps}
      current={2}
      stepLabel="Step 3 of 4"
      title="Which compliance areas concern you?"
      subtitle="Multi-select. We prioritize the obligations in these domains. You can add more later."
      topbarRight={topbarRight}
      footerLeft={footerLeft}
      footerRight={
        <Button>
          Review answers <ArrowRight size={16} className="ml-1.5" />
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <WizardOptionCard
          icon={<BarChart3 size={22} />}
          title="Tax & VAT"
          desc="Cross-border VAT, OSS/IOSS, thresholds"
          selected
        />
        <WizardOptionCard
          icon={<Globe size={22} />}
          title="EPR & Packaging"
          desc="Producer responsibility, packaging registers"
          selected
        />
        <WizardOptionCard
          icon={<Shield size={22} />}
          title="Data & Privacy"
          desc="DPIA, RoPA, processor agreements"
          selected
        />
        <WizardOptionCard
          icon={<MessageSquare size={22} />}
          title="Marketing Compliance"
          desc="Consent, cookies, dark-pattern audits"
        />
        <WizardOptionCard
          icon={<Building2 size={22} />}
          title="Corporate & Structure"
          desc="Annual statements, beneficial owners"
        />
        <WizardOptionCard
          icon={<ShieldCheck size={22} />}
          title="Full Coverage"
          desc="Cross-domain partner routing"
        />
      </div>
      <p className="mt-6 text-center text-[13px] text-fg-tertiary">
        Not sure? Skip and we'll route based on your business model and markets.
      </p>
    </WizardScreen>
  );
}
