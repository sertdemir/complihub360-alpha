import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from './Radio';

const meta = {
  title: 'Atoms/Radio',
  component: Radio,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    error: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    checked: {
        control: 'boolean',
    }
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Option 1',
    name: 'demo',
  },
};

export const Checked: Story = {
  args: {
    label: 'Selected Option',
    checked: true,
    name: 'demo',
  },
};

export const WithError: Story = {
  args: {
    label: 'Invalid Option',
    error: true,
    name: 'demo',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Unavailable',
    disabled: true,
    name: 'demo',
  },
};

export const DisabledChecked: Story = {
    args: {
      label: 'Selected but disabled',
      disabled: true,
      checked: true,
      name: 'demo',
    },
  };

export const RadioGroupDemo: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
        <Radio name="choose" label="Yes, I agree" />
        <Radio name="choose" label="No, I disagree" />
        <Radio name="choose" label="Maybe later" disabled />
    </div>
  )
}
