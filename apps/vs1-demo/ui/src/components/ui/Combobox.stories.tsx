import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Combobox } from './Combobox';
import { FormField } from './FormField';

const DESCRIPTION = `
A **Combobox** molecule — a searchable select (typeahead). Like \`SelectMenu\`, but
the trigger is a text input that filters options case-insensitively by label as
you type. Focus/typing opens the listbox; ↑/↓ move the active option; Enter
selects; Esc closes and restores. ARIA combobox pattern (\`role="combobox"\` on the
input, \`aria-expanded\`/\`aria-controls\`, listbox + option roles). Light + dark.
`;

const meta = {
  title: 'Molecules/Combobox',
  component: Combobox,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof Combobox>;

const COUNTRIES = [
  { value: 'de', label: 'Germany', description: 'EU · DE' },
  { value: 'fr', label: 'France', description: 'EU · FR' },
  { value: 'it', label: 'Italy', description: 'EU · IT' },
  { value: 'es', label: 'Spain', description: 'EU · ES' },
  { value: 'nl', label: 'Netherlands', description: 'EU · NL' },
  { value: 'be', label: 'Belgium', description: 'EU · BE' },
  { value: 'at', label: 'Austria', description: 'EU · AT' },
  { value: 'pl', label: 'Poland', description: 'EU · PL' },
  { value: 'pt', label: 'Portugal', description: 'EU · PT', disabled: true },
];

const Demo = ({ open }: { open?: boolean }) => {
  const [country, setCountry] = React.useState<string | undefined>(undefined);
  return (
    <div className="max-w-sm space-y-6">
      <FormField label="Country of registration" htmlFor="cbx-country" helper="Type to filter the list.">
        <Combobox
          id="cbx-country"
          options={COUNTRIES}
          value={country}
          onChange={setCountry}
          placeholder="Search country…"
          defaultOpen={open}
        />
      </FormField>

      <FormField label="Sizes">
        <div className="space-y-2">
          <Combobox options={COUNTRIES} inputSize="sm" placeholder="Small" />
          <Combobox options={COUNTRIES} inputSize="md" placeholder="Medium" />
          <Combobox options={COUNTRIES} inputSize="lg" placeholder="Large" />
        </div>
      </FormField>

      <FormField label="Disabled">
        <Combobox options={COUNTRIES} disabled defaultValue="de" />
      </FormField>
    </div>
  );
};

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo({})}</div> };

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo({})}</div>,
};

// defaultOpen variants so the listbox is visible in docs/screenshots.
export const OpenLight: Story = {
  render: () => <div className="min-h-[420px] bg-neutral-50 p-6">{Demo({ open: true })}</div>,
};

export const OpenDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-[480px] bg-[#1F2937] p-8">{Demo({ open: true })}</div>,
};
