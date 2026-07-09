import type { Meta, StoryObj } from '@storybook/react';
import { ShieldCheck, Bell, FileText, Star, CheckCircle, AlertTriangle, XCircle, Info, Ban } from 'lucide-react';
import { Icon } from './Icon';

const DESCRIPTION = `**Icon** — thin wrapper standardising lucide icon size (\`xs/sm/md/lg\` → 14/16/20/24) and the Compass color axis (\`default/brand/accent/success/warning/error/info/inverse/disabled\`, plus \`secondary/tertiary\`). Ships **light + dark** via mode-aware tokens.`;

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof Icon>;

function Demo() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Sizes</span>
        <div className="flex items-end gap-4">
          <Icon icon={ShieldCheck} size="xs" />
          <Icon icon={ShieldCheck} size="sm" />
          <Icon icon={ShieldCheck} size="md" />
          <Icon icon={ShieldCheck} size="lg" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm text-fg-secondary">Tones</span>
        <div className="flex flex-wrap items-center gap-4">
          <Icon icon={ShieldCheck} tone="default" />
          <Icon icon={Bell} tone="secondary" />
          <Icon icon={FileText} tone="tertiary" />
          <Icon icon={ShieldCheck} tone="brand" />
          <Icon icon={Star} tone="accent" />
          <Icon icon={CheckCircle} tone="success" />
          <Icon icon={AlertTriangle} tone="warning" />
          <Icon icon={XCircle} tone="error" />
          <Icon icon={Info} tone="info" />
          <Icon icon={Ban} tone="disabled" />
          <span className="inline-flex rounded-md bg-brand p-1">
            <Icon icon={ShieldCheck} tone="inverse" />
          </span>
        </div>
      </div>
    </div>
  );
}

export const Light: Story = {
  render: () => <div className="bg-neutral-50 p-6">{Demo()}</div>,
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>
  ),
};
