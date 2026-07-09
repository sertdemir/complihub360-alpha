import type { Meta, StoryObj } from '@storybook/react';
import { Plus, ArrowRight, Settings } from 'lucide-react';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'outline', 'danger', 'success', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    iconOnly: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Complete Setup',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Cancel Process',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Skip for now',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete Account',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small (32px)</Button>
      <Button size="md">Medium (40px)</Button>
      <Button size="lg">Large (48px)</Button>
    </div>
  ),
};

export const Disabled: Story = {
    args: {
        variant: 'primary',
        disabled: true,
        children: 'Not Allowed',
    }
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Approve',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Learn More',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Error</Button>
      <Button variant="info">Info</Button>
      <Button variant="accent">View ranking impact</Button>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button loading>Saving…</Button>
      <Button variant="secondary" loading>Loading</Button>
      <Button variant="success" loading>Approving</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button iconLeft={<Plus size={16} />}>Add Item</Button>
      <Button variant="secondary" iconRight={<ArrowRight size={16} />}>Next</Button>
      <Button iconOnly aria-label="Settings"><Settings size={16} /></Button>
    </div>
  ),
};

export const DarkVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark flex min-h-screen flex-wrap items-center gap-3 bg-[#1F2937] p-8">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Error</Button>
      <Button variant="info">Info</Button>
      <Button variant="accent">Explore expansion</Button>
      <Button loading>Saving…</Button>
      <Button iconLeft={<Plus size={16} />}>Add</Button>
      <Button iconOnly aria-label="Settings"><Settings size={16} /></Button>
    </div>
  ),
};
