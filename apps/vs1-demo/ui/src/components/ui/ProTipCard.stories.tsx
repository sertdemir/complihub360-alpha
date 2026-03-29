import type { Meta, StoryObj } from '@storybook/react';
import { ProTipCard } from './ProTipCard';

const meta = {
  title: 'Molecules/ProTipCard',
  component: ProTipCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    variant: {
        control: 'select',
        options: ['primary', 'accent', 'warning', 'error', 'success'],
    }
  },
} satisfies Meta<typeof ProTipCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Did you know?',
    description: 'Companies structured as a GmbH must have a minimum starting capital of €25,000 in Germany.',
    variant: 'accent',
  },
};

export const Info: Story = {
  args: {
    title: 'Documentation Required',
    description: 'You will need to upload your Articles of Association on the next screen.',
    variant: 'primary',
  },
};

export const Warning: Story = {
  args: {
    title: 'Action Requires Notary',
    description: 'Changing your director settings will require a certified notary appointment.',
    variant: 'warning',
  },
};

export const ErrorState: Story = {
  args: {
    title: 'Missing KYC',
    description: 'We cannot proceed until the KYC background check has been initiated.',
    variant: 'error',
  },
};

export const Success: Story = {
  args: {
    title: 'Verification Complete',
    description: 'Your business identity has been fully verified across all required registries.',
    variant: 'success',
  },
};
