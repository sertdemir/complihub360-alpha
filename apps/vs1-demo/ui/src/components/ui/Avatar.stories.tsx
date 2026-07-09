import type { Meta, StoryObj } from '@storybook/react';
import { Building2 } from 'lucide-react';
import { Avatar } from './Avatar';

const DESCRIPTION = `
**Avatar** — mirrors the Compass *Avatar* set (482:2). Type resolves automatically:
**image** (\`src\`) → **initials** → **icon** → **placeholder**. Sizes **XS · SM · MD · LG · XL**
(24/32/40/48/64). Initials sit on a petrol (brand) fill with white text. Optional
**status dot** (online · away · offline) with a surface-coloured ring.

Ships **light + dark** — on dark dashboards the status-dot ring flips to the app
surface so the dot reads as a clean cut-out.
`;

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: { layout: 'centered', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    status: { control: 'radio', options: ['none', 'online', 'away', 'offline'] },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { size: 'md', initials: 'GD', status: 'online' },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-4">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <Avatar key={s} size={s} initials="GD" />
      ))}
    </div>
  ),
};

export const Types: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="lg" src="https://i.pravatar.cc/96?img=12" alt="Person" />
      <Avatar size="lg" initials="GD" />
      <Avatar size="lg" icon={<Building2 size={24} />} />
      <Avatar size="lg" />
    </div>
  ),
};

export const Statuses: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="lg" initials="GD" status="online" />
      <Avatar size="lg" initials="LM" status="away" />
      <Avatar size="lg" initials="TR" status="offline" />
    </div>
  ),
};

const ROW = (
  <div className="flex items-center gap-4">
    <Avatar size="md" initials="GD" status="online" />
    <Avatar size="md" src="https://i.pravatar.cc/80?img=5" alt="Person" status="away" />
    <Avatar size="md" icon={<Building2 size={20} />} />
    <Avatar size="md" />
  </div>
);

export const Light: Story = {
  parameters: { controls: { disable: true } },
  render: () => <div className="rounded-xl bg-white p-6">{ROW}</div>,
};

export const Dark: Story = {
  parameters: { controls: { disable: true } },
  render: () => <div className="dark rounded-xl bg-[#1F2937] p-6">{ROW}</div>,
};
