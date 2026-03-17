import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './Typography';

const meta = {
  title: 'Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['display', 'h1', 'h2', 'h3', 'body', 'ui-small', 'caption'],
    },
    weight: {
      control: 'select',
      options: ['regular', 'medium', 'semibold', 'bold'],
    },
  },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  args: { children: '' },
  render: () => (
    <div className="flex flex-col gap-6">
      <Typography variant="display">Display: CompliHub 360 (56px)</Typography>
      <Typography variant="h1">H1: CompliHub 360 (36px)</Typography>
      <Typography variant="h2">H2: CompliHub 360 (28px)</Typography>
      <Typography variant="h3">H3: CompliHub 360 (20px)</Typography>
      <hr className="border-neutral-200" />
      <Typography variant="body">Body (16px): CompliHub 360 is the best compliance tool on earth.</Typography>
      <Typography variant="ui-small">Small UI (14px): CompliHub 360 is the best compliance tool on earth.</Typography>
      <Typography variant="caption">Caption (12px): CompliHub 360 is the best compliance tool on earth.</Typography>
    </div>
  ),
};

export const Weights: Story = {
    args: { children: '' },
    render: () => (
      <div className="flex flex-col gap-4">
        <Typography variant="body" weight="regular">Regular Weight</Typography>
        <Typography variant="body" weight="medium">Medium Weight</Typography>
        <Typography variant="body" weight="semibold">Semibold Weight</Typography>
        <Typography variant="body" weight="bold">Bold Weight</Typography>
      </div>
    ),
  };
