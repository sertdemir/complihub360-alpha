import type { Meta, StoryObj } from '@storybook/react';
import { OptionCard } from './OptionCard';
import { useState } from 'react';

const meta = {
  title: 'Molecules/OptionCard',
  component: OptionCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    selected: { control: 'boolean' },
    type: { control: 'select', options: ['radio', 'checkbox'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof OptionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Limited Liability Company (GmbH)',
    description: 'A popular legal structured for mid-sized enterprises.',
    type: 'radio',
    selected: false,
  },
};

export const Selected: Story = {
  args: {
    title: 'Freelancer (Freiberufler)',
    description: 'Perfect for independent professionals without a corporate structure.',
    type: 'radio',
    selected: true,
  },
};

export const CheckboxVariant: Story = {
  args: {
    title: 'ISO 27001 Requirements',
    description: 'Include information security management compliance steps.',
    type: 'checkbox',
    selected: true,
  },
};

export const Disabled: Story = {
    args: {
      title: 'Banking License',
      description: 'Requires BaFin approval. Not available for your current entity type.',
      type: 'checkbox',
      disabled: true,
    },
  };

export const InteractiveGroup = {
  render: () => {
    const [selected, setSelected] = useState('gmbh');
    return (
      <div className="flex flex-col gap-4 max-w-md w-full">
        <OptionCard
          title="GmbH"
          description="Limited liability company."
          value="gmbh"
          selected={selected === 'gmbh'}
          onSelect={setSelected}
        />
        <OptionCard
          title="AG"
          description="Stock corporation."
          value="ag"
          selected={selected === 'ag'}
          onSelect={setSelected}
        />
        <OptionCard
          title="Sole Proprietorship"
          description="Single owner business with full liability."
          value="sole"
          selected={selected === 'sole'}
          onSelect={setSelected}
        />
      </div>
    );
  },
};
