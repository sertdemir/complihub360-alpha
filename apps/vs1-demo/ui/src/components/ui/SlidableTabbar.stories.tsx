import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ListFilter, FileCheck2, ShieldCheck, Recycle, PackageCheck, ScanFace, Leaf, Building2 } from 'lucide-react';
import { SlidableTabbar, type SlidableTab } from './SlidableTabbar';

const DESCRIPTION = `
**Slidable Tabbar** — the horizontally scrollable mobile filter-pill row, mirrored
from the Compass *Mobile Slidable Tabbar* (Figma 614:261) + *Mobile Slidable Tab
Item* (613:212) on the Tabbar page (607:2).

- Underline-indicator pattern: active tab = \`text/brand\` label + \`border/brand\`
  underline bar; default = \`text/secondary\`; disabled = \`text/disabled\`.
- The container scrolls horizontally with a hidden scrollbar and \`-mx\` edge bleed;
  the clipped last tab signals there's more to scroll. 44px touch target.
- Per-tab \`icon\` (Label-only vs Icon+Label) and optional \`count\` badge.
- Keyboard: Arrow Left/Right (+ Home/End) move focus between tabs, Enter/Space
  selects. \`role="tablist"\`/\`role="tab"\` with \`aria-selected\`.
- Distinct from the desktop \`<Tabs>\` and the fixed \`<BottomTabBar>\`.

Ships **light + dark** via semantic tokens.
`;

const meta = {
  title: 'Molecules/Slidable Tabbar',
  component: SlidableTabbar,
  parameters: {
    layout: 'centered',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SlidableTabbar>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILTER_TABS: SlidableTab[] = [
  { key: 'all', label: 'All' },
  { key: 'tax', label: 'Tax & VAT' },
  { key: 'gdpr', label: 'GDPR' },
  { key: 'epr', label: 'EPR' },
  { key: 'product', label: 'Product safety' },
  { key: 'aml', label: 'AML/KYC' },
  { key: 'esg', label: 'ESG' },
  { key: 'corp', label: 'Corporate' },
];

const ICON_TABS: SlidableTab[] = [
  { key: 'all', label: 'All', icon: <ListFilter />, count: 42 },
  { key: 'tax', label: 'Tax & VAT', icon: <FileCheck2 />, count: 12 },
  { key: 'gdpr', label: 'GDPR', icon: <ShieldCheck />, count: 8 },
  { key: 'epr', label: 'EPR', icon: <Recycle />, count: 5 },
  { key: 'product', label: 'Product safety', icon: <PackageCheck />, count: 9 },
  { key: 'aml', label: 'AML/KYC', icon: <ScanFace />, count: 3 },
  { key: 'esg', label: 'ESG', icon: <Leaf />, count: 0, disabled: true },
  { key: 'corp', label: 'Corporate', icon: <Building2 />, count: 6 },
];

// A 360px device frame that clips, so the row overflows and scrolls.
function DeviceFrame({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={dark ? 'dark' : undefined}>
      <div className="mx-auto w-[360px] overflow-hidden rounded-2xl border border-stroke bg-surface">
        <div className="px-4 pb-4 pt-3">{children}</div>
      </div>
    </div>
  );
}

function Interactive({ tabs, dark }: { tabs: SlidableTab[]; dark?: boolean }) {
  const [active, setActive] = useState('tax');
  return (
    <DeviceFrame dark={dark}>
      <SlidableTabbar tabs={tabs} active={active} onChange={setActive} />
    </DeviceFrame>
  );
}

export const LabelOnly: Story = {
  name: 'Label only · Light',
  render: () => <Interactive tabs={FILTER_TABS} />,
  args: { tabs: [], active: "tax" },
};

export const LabelOnlyDark: Story = {
  name: 'Label only · Dark',
  render: () => <Interactive tabs={FILTER_TABS} dark />,
  args: { tabs: [], active: "tax" },
};

export const IconsAndCounts: Story = {
  name: 'Icons + counts · Light',
  render: () => <Interactive tabs={ICON_TABS} />,
  args: { tabs: [], active: "tax" },
};

export const IconsAndCountsDark: Story = {
  name: 'Icons + counts · Dark',
  render: () => <Interactive tabs={ICON_TABS} dark />,
  args: { tabs: [], active: "tax" },
};
