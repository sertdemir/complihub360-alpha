import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
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
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'I accept the terms and conditions',
  },
};

export const Checked: Story = {
  args: {
    label: 'Subscribe to newsletter',
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'You must check this box',
    error: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Cannot select this currently',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
    args: {
      label: 'Pre-selected option',
      disabled: true,
      checked: true,
    },
  };
