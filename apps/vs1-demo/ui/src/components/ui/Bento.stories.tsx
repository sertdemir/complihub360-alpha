import type { Meta, StoryObj } from '@storybook/react';
import { TrendingUp } from 'lucide-react';
import { BentoGrid, BentoTile } from './Bento';
import { Stat } from './Stat';

const DESCRIPTION = `
The Compass **Bento** layout. A responsive bento grid (\`BentoGrid\`, \`columns\` ·
\`layout\` custom/hero/symmetric/showcase) of spanning surface tiles (\`BentoTile\`,
\`colSpan\` 1–4 · \`rowSpan\` 1–2 · \`interactive\` · \`tone\` default/cta).
Tiles are mode-aware surface cards. Light + dark.
`;

const meta = {
  title: 'Organisms/Bento',
  component: BentoTile,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof BentoTile>;
export default meta;
type Story = StoryObj<typeof BentoTile>;

const Demo = () => (
  <BentoGrid className="max-w-3xl">
    <BentoTile colSpan={2} interactive>
      <Stat label="Match rate" value="94%" trend={{ value: '+12%', direction: 'up', label: 'MoM' }} />
    </BentoTile>
    <BentoTile>
      <Stat label="Active clients" value="37" />
    </BentoTile>
    <BentoTile>
      <TrendingUp size={20} className="text-fg-brand" />
      <p className="mt-auto text-[13px] text-fg-secondary">Trending up</p>
    </BentoTile>
    <BentoTile colSpan={2}>
      <p className="text-[15px] font-semibold text-fg">EU compliance score</p>
      <p className="mt-1 text-body-sm text-fg-secondary">Across 6 domains, 12 jurisdictions.</p>
    </BentoTile>
  </BentoGrid>
);

export const Light: Story = { render: () => <div className="bg-neutral-50 p-6">{Demo()}</div> };
export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{Demo()}</div>,
};

// Hero layout (1 big lead tile + supporting) with a brand-filled CTA tile.
const HeroDemo = () => (
  <BentoGrid layout="hero" className="max-w-3xl">
    <BentoTile colSpan={2} rowSpan={2} interactive>
      <p className="text-[15px] font-semibold text-fg">EU compliance score</p>
      <Stat label="Overall" value="94%" trend={{ value: '+12%', direction: 'up', label: 'MoM' }} />
      <p className="mt-auto text-body-sm text-fg-secondary">Across 6 domains, 12 jurisdictions.</p>
    </BentoTile>
    <BentoTile>
      <Stat label="Active clients" value="37" />
    </BentoTile>
    <BentoTile>
      <TrendingUp size={20} className="text-fg-brand" />
      <p className="mt-auto text-[13px] text-fg-secondary">Trending up</p>
    </BentoTile>
    <BentoTile tone="cta" colSpan={2} interactive>
      <p className="text-[15px] font-semibold">Add a new jurisdiction</p>
      <p className="mt-1 text-body-sm opacity-90">Expand coverage in one click.</p>
    </BentoTile>
  </BentoGrid>
);

export const HeroLight: Story = { render: () => <div className="bg-neutral-50 p-6">{HeroDemo()}</div> };
export const HeroDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{HeroDemo()}</div>,
};
