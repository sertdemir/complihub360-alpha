import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabList, Tab, type TabsVariant } from './Tabs';

const DESCRIPTION = `
**Tabs** — mirrors the Compass *Desktop Tab Item / Tabbar* (609:2 / 612:344). Active tab is
petrol (\`text/brand\`), inactive \`text/secondary\`. Three **styles**: \`underline\` ·
\`filled\` · \`boxed\` (segmented). Sizes **sm · md · lg**. Compositional API:
\`<Tabs><TabList><Tab/></TabList></Tabs>\`, controlled or uncontrolled. Optional per-tab
\`icon\` and \`badge\` (count). Ships **light + dark**.
`;

const meta = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'radio', options: ['underline', 'filled', 'boxed'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ variant = 'underline' as TabsVariant }) {
  const [v, setV] = useState('active');
  return (
    <Tabs value={v} onValueChange={setV} variant={variant}>
      <TabList>
        <Tab value="active" badge={8}>Active</Tab>
        <Tab value="archive">Archive</Tab>
        <Tab value="drafts">Drafts</Tab>
        <Tab value="locked" disabled>Locked</Tab>
      </TabList>
    </Tabs>
  );
}

export const Playground: Story = {
  args: { variant: 'underline', size: 'md', children: null as never },
  render: (args) => (
    <Tabs {...args} defaultValue="active">
      <TabList>
        <Tab value="active" badge={8}>Active</Tab>
        <Tab value="archive">Archive</Tab>
        <Tab value="drafts">Drafts</Tab>
      </TabList>
    </Tabs>
  ),
};

export const Styles: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="space-y-8">
      {(['underline', 'filled', 'boxed'] as const).map((vr) => (
        <div key={vr}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{vr}</p>
          <Demo variant={vr} />
        </div>
      ))}
    </div>
  ),
};

const TRIPLE = (
  <div className="space-y-6">
    {(['underline', 'filled', 'boxed'] as const).map((vr) => <Demo key={vr} variant={vr} />)}
  </div>
);

export const Light: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => <div className="rounded-xl bg-white p-6">{TRIPLE}</div>,
};

export const Dark: Story = {
  args: { children: null as never },
  parameters: { controls: { disable: true } },
  render: () => <div className="dark rounded-xl bg-[#1F2937] p-6 text-fg">{TRIPLE}</div>,
};
