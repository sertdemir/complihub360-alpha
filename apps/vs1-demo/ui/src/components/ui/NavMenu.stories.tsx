import type { Meta, StoryObj } from '@storybook/react';
import { Receipt, Recycle, ShieldCheck, Megaphone, Building2, Globe } from 'lucide-react';
import { NavMenu } from './NavMenu';
import { RiskBadge } from './RiskBadge';

// The sheet is positioned `absolute top-full` against the nearest positioned
// ancestor — in the app that is the fixed <header>. The decorator supplies one
// so the story shows what the header shows.
const meta: Meta<typeof NavMenu> = {
  title: 'Navigation/NavMenu',
  component: NavMenu,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative min-h-[520px] bg-background">
        <div className="relative flex h-16 items-center gap-4 border-b border-stroke-subtle bg-surface px-6">
          <span className="text-body-sm font-bold text-fg">CompliHub360</span>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NavMenu>;

const AREAS = [
  { slug: 'tax-vat', icon: Receipt, title: 'Tax & VAT', desc: 'Cross-Border VAT, Delivery Thresholds & Digital Taxation', risk: 'high' as const },
  { slug: 'product-packaging', icon: Recycle, title: 'EPR & Packaging', desc: 'Extended Producer Responsibility, VerpackG & Recycling Targets', risk: 'high' as const },
  { slug: 'data-privacy', icon: ShieldCheck, title: 'Data & Privacy', desc: 'GDPR, UK GDPR, Cookie Compliance & Data Transfers', risk: 'critical' as const },
  { slug: 'marketing-seo', icon: Megaphone, title: 'Marketing Compliance', desc: 'Advertising Claims, Health & Sustainability, Consumer Protection', risk: 'medium' as const },
  { slug: 'corporate-structure', icon: Building2, title: 'Corporate Structure', desc: 'International Company Setup, Legal Form & Local Substance', risk: 'medium' as const },
];

/** The header sheet: full width, two columns, a description under every label. */
export const AreasSheet: Story = {
  render: () => (
    <NavMenu panel="sheet" columns={2}>
      <NavMenu.Trigger label="Compliance areas" />
      <NavMenu.Panel
        title="Choose a compliance area"
        aside={
          <div className="flex flex-col items-start gap-3">
            <NavMenu.Footer href="/en/compliance">All compliance areas</NavMenu.Footer>
            <p className="text-body-xs leading-relaxed text-fg-secondary">
              Every area lists the duties it carries, the statute behind each one, and what it
              costs to get wrong.
            </p>
          </div>
        }
      >
        {AREAS.map((a) => (
          <NavMenu.Item
            key={a.slug}
            href={`/en/compliance/${a.slug}`}
            icon={<a.icon size={18} />}
            description={a.desc}
            isCurrent={a.slug === 'data-privacy'}
          >
            {a.title}
          </NavMenu.Item>
        ))}
      </NavMenu.Panel>
    </NavMenu>
  ),
};

/** With the severity carried in the trailing meta slot. */
export const SheetWithRisk: Story = {
  render: () => (
    <NavMenu panel="sheet" columns={2}>
      <NavMenu.Trigger label="Compliance areas" />
      <NavMenu.Panel title="Choose a compliance area">
        {AREAS.map((a) => (
          <NavMenu.Item
            key={a.slug}
            href={`/en/compliance/${a.slug}`}
            icon={<a.icon size={18} />}
            description={a.desc}
            meta={<RiskBadge level={a.risk} size="sm">{a.risk}</RiskBadge>}
          >
            {a.title}
          </NavMenu.Item>
        ))}
      </NavMenu.Panel>
    </NavMenu>
  ),
};

/** The compact variant — a language switcher, aligned to the trigger's right edge. */
export const LanguagePopover: Story = {
  render: () => (
    <div className="ml-auto">
      <NavMenu panel="popover" align="end">
        <NavMenu.Trigger label="Language" iconOnly icon={<Globe size={18} />} />
        <NavMenu.Panel>
          {[
            { code: 'en', label: 'English' },
            { code: 'de', label: 'Deutsch' },
            { code: 'es', label: 'Español' },
            { code: 'tr', label: 'Türkçe' },
          ].map((l) => (
            <NavMenu.Item key={l.code} href={`/${l.code}`} isCurrent={l.code === 'de'}>
              {l.label}
            </NavMenu.Item>
          ))}
        </NavMenu.Panel>
      </NavMenu>
    </div>
  ),
};

/** One column, no descriptions — the lateral switcher between sibling pages. */
export const CompactSwitcher: Story = {
  render: () => (
    <NavMenu panel="popover">
      <NavMenu.Trigger label="Tax & VAT" />
      <NavMenu.Panel>
        {AREAS.map((a) => (
          <NavMenu.Item
            key={a.slug}
            href={`/en/compliance/${a.slug}`}
            icon={<a.icon size={15} />}
            isCurrent={a.slug === 'tax-vat'}
          >
            {a.title}
          </NavMenu.Item>
        ))}
      </NavMenu.Panel>
    </NavMenu>
  ),
};
