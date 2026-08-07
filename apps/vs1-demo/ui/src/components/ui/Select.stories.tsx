import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const DESCRIPTION = `
**Select** — native \`<select>\` styled like Text Input with a trailing chevron.
Sizes sm·md·lg, styles outlined / filled, error + disabled states. Ships **light + dark**.
`;

const meta = {
  title: 'Atoms/Select',
  component: Select,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

const Countries = () => (
  <>
    <option value="de">Germany</option>
    <option value="fr">France</option>
    <option value="es">Spain</option>
  </>
);

const Demo = () => (
  <div className="max-w-xs space-y-5">
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Sizes</p>
      <Select inputSize="sm" defaultValue="de"><Countries /></Select>
      <Select inputSize="md" defaultValue="de"><Countries /></Select>
      <Select inputSize="lg" defaultValue="de"><Countries /></Select>
    </div>
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">Styles · states</p>
      <Select variant="filled" defaultValue="fr"><Countries /></Select>
      <Select error defaultValue="es"><Countries /></Select>
      <Select disabled defaultValue="de"><Countries /></Select>
    </div>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
