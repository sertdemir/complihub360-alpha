import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { WizardScreen } from './WizardScreen';

const steps = [
  { label: 'Markets' },
  { label: 'Operations' },
  { label: 'Domains' },
  { label: 'Review' },
];

const topbarRight = (
  <a className="text-[12px] font-semibold uppercase tracking-wide text-fg-brand hover:text-fg cursor-pointer">
    Save progress with a free account →
  </a>
);

const footerLeft = (
  <button className="inline-flex items-center gap-1.5 text-[14px] font-medium text-fg-tertiary hover:text-fg-secondary">
    <ArrowLeft size={16} /> Back
  </button>
);

const summaryRows = [
  { caption: 'MARKETS', value: 'Germany · United Kingdom · Netherlands' },
  { caption: 'OPERATIONS', value: 'D2C e-commerce · €2M — €5M' },
  { caption: 'COMPLIANCE DOMAINS', value: 'VAT & Tax · EPR & Packaging · GDPR & Privacy' },
];

export function ReviewStep() {
  return (
    <WizardScreen
      steps={steps}
      current={3}
      stepLabel="Step 4 of 4"
      title="Your situation, summarized."
      subtitle="Here's what we'll use. Edit anything you need, then generate your risk map."
      topbarRight={topbarRight}
      footerLeft={footerLeft}
      footerRight={
        <Button className="bg-accent-500 text-primary-900 hover:bg-accent-600">
          Generate my risk map <ArrowRight size={16} className="ml-1.5" />
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl rounded-xl border-2 border-accent-400/70 bg-surface p-1">
        <div className="divide-y divide-stroke">
          {summaryRows.map((row) => (
            <div key={row.caption} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-tertiary">
                  {row.caption}
                </p>
                <p className="mt-1 text-[15px] text-fg">{row.value}</p>
              </div>
              <button className="text-[13px] font-semibold text-fg-brand">Edit</button>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-[12px] text-fg-tertiary">
        Anonymous · No account required to see your risk map · Processed in ~4 seconds
      </p>
    </WizardScreen>
  );
}
