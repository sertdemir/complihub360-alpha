import type { Meta, StoryObj } from '@storybook/react';
import { ProgressSidebar, ProgressStep } from './ProgressSidebar';

const meta = {
  title: 'Molecules/ProgressSidebar',
  component: ProgressSidebar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSteps: ProgressStep[] = [
  { id: '1', title: 'Company Details', status: 'completed' },
  { id: '2', title: 'Entity Structure', status: 'completed' },
  { id: '3', title: 'Compliance Requirements', status: 'current' },
  { id: '4', title: 'Documents Review', status: 'upcoming' },
  { id: '5', title: 'Finalization', status: 'upcoming' },
];

export const Default: Story = {
  args: {
    steps: sampleSteps,
    className: 'pt-4',
  },
};

export const AllCompleted: Story = {
  args: {
    steps: sampleSteps.map(s => ({ ...s, status: 'completed' })),
    className: 'pt-4',
  },
};

export const JustStarting: Story = {
  args: {
    steps: sampleSteps.map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'upcoming' })),
    className: 'pt-4',
  },
};
