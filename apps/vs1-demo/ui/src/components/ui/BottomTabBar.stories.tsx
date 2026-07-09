import type { Meta, StoryObj } from '@storybook/react';
import { Home, Search, Bell, MessageSquare, User } from 'lucide-react';
import { BottomTabBar } from './BottomTabBar';

const DESCRIPTION = `
The Compass **Mobile Tabbar** (607:2) — the fixed bottom navigation on app mobile
surfaces. Icon + label, optional count \`badge\`, active = brand. Use \`embedded\` to
render within a relative parent (e.g. a device frame); omit it for a real
viewport-fixed bar. Light + dark.
`;

const meta = {
  title: 'Molecules/Bottom Tab Bar',
  component: BottomTabBar,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof BottomTabBar>;
export default meta;
type Story = StoryObj<typeof BottomTabBar>;

const TABS = [
  { key: 'home', label: 'Home', icon: <Home size={20} /> },
  { key: 'search', label: 'Search', icon: <Search size={20} /> },
  { key: 'alerts', label: 'Alerts', icon: <Bell size={20} />, badge: 3 },
  { key: 'msgs', label: 'Messages', icon: <MessageSquare size={20} /> },
  { key: 'me', label: 'Profile', icon: <User size={20} /> },
];

const Demo = () => (
  <div className="relative mx-auto w-[360px] overflow-hidden rounded-2xl border border-stroke bg-surface-secondary">
    <div className="h-44" />
    <BottomTabBar embedded tabs={TABS} active="home" />
  </div>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};
