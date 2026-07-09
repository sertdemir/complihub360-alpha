import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { Input } from './Input';
import { Textarea } from './Textarea';

const DESCRIPTION = `
**FormField** composes a label (required / optional), a control, and a helper or error
message — the canonical onboarding / wizard / login field wrapper. Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/FormField',
  component: FormField,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof FormField>;

const Demo = () => (
  <div className="max-w-md space-y-5">
    <FormField label="Company name" htmlFor="co" required helper="As registered in your jurisdiction.">
      <Input id="co" placeholder="e.g. Dahlmann CPA GmbH" />
    </FormField>
    <FormField label="VAT ID" htmlFor="vat" optional error="This VAT ID format is not valid for DE.">
      <Input id="vat" error defaultValue="DE12" />
    </FormField>
    <FormField label="Notes" htmlFor="notes" helper="Optional context for the provider.">
      <Textarea id="notes" placeholder="Anything the provider should know…" />
    </FormField>
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
