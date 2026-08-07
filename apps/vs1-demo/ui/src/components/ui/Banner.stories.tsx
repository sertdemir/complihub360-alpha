import type { Meta, StoryObj } from '@storybook/react';
import { Banner } from './Banner';

const DESCRIPTION = `
**Banner / Alert** — derived from the **screens** (provider dashboard sticky warning
banner + inline alert card), not the light-only Compass Alert. Ships **light AND dark**:
the app/dashboards are dark slate (\`#0F172A\`/\`#1F2937\`), marketing is light. Dark uses a
translucent status tint over the dark surface with white text — exactly like the
"response time has slipped" banner (amber \`#f59e0b\`, white title, white@85% description).

- **\`status\`** — info · success · warning · error. (At-risk states use **warning amber**, never red.)
- **\`variant\`** — \`card\` (rounded inline alert) · \`strip\` (square full-bleed sticky top banner).
- **\`action\`** (trailing link/button) · **\`onClose\`** (dismiss ✕) · **\`icon\`** (override / false).
- Toggle dark via the \`dark\` class on any ancestor.
`;

const meta = {
  title: 'Molecules/Banner',
  component: Banner,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'radio', options: ['info', 'success', 'warning', 'error'] },
    variant: { control: 'radio', options: ['card', 'strip'] },
    surface: { control: 'radio', options: ['light', 'medium', 'strong', 'solid'] },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    status: 'warning',
    title: 'Molecules/Banner',
    children: 'avg_confirm_time is 11h 42m (target <6h for top-3). Bring it under 6h by Wed 2026-05-21.',
  },
};

const ALL = (
  <div className="space-y-3">
    <Banner status="info" title="Heads up" onClose={() => {}}>
      Your assessment results are ready to review.
    </Banner>
    <Banner status="success" title="Engagement confirmed" onClose={() => {}}>
      The provider accepted your request — you can now share documents.
    </Banner>
    <Banner
      status="warning"
      title="Pre-downgrade warning · 4 days to fix"
      action={<a href="#" className="underline">Open queue</a>}
      onClose={() => {}}
    >
      Your avg_confirm_time has trended above the top-3 threshold. Without action, you'd move out of the
      top-3 DE-VAT ranking on 2026-05-21. Trust score is not affected — only ranking.
    </Banner>
    <Banner status="error" title="Payment failed" action={<a href="#" className="underline">Update billing</a>}>
      We couldn't process your subscription. 7-day grace period remaining before the workspace locks.
    </Banner>
  </div>
);

export const Light: Story = {
  args: { title: 'Molecules/Banner' },
  parameters: { controls: { disable: true } },
  render: () => <div className="max-w-2xl bg-white p-6">{ALL}</div>,
};

export const Dark: Story = {
  args: { title: 'Molecules/Banner' },
  parameters: { controls: { disable: true }, backgrounds: { default: 'dark' } },
  render: () => <div className="dark max-w-2xl rounded-xl bg-[#1F2937] p-6">{ALL}</div>,
};

// Compass Alert set 445:2 — Status × Surface matrix.
const STATUSES = ['info', 'success', 'warning', 'error', 'brand', 'accent'] as const;
const SURFACES = ['light', 'medium', 'strong', 'solid'] as const;

const SurfaceMatrix = () => (
  <div className="space-y-6">
    {SURFACES.map((surface) => (
      <div key={surface}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{surface}</p>
        <div className="space-y-2">
          {STATUSES.map((status) => (
            <Banner key={status} status={status} surface={surface} title={`${status} · ${surface}`}>
              The provider response time is being tracked against your top-3 ranking threshold.
            </Banner>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SurfacesLight: Story = {
  name: 'Surfaces × statuses (light)',
  args: { title: 'Molecules/Banner' },
  parameters: { controls: { disable: true } },
  render: () => <div className="max-w-2xl bg-white p-6">{<SurfaceMatrix />}</div>,
};

export const SurfacesDark: Story = {
  name: 'Surfaces × statuses (dark)',
  args: { title: 'Molecules/Banner' },
  parameters: { controls: { disable: true }, backgrounds: { default: 'dark' } },
  render: () => <div className="dark max-w-2xl rounded-xl bg-[#1F2937] p-6">{<SurfaceMatrix />}</div>,
};

export const StickyBannerDark: Story = {
  name: 'Sticky strip (dashboard, dark)',
  args: { title: 'Molecules/Banner' },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark min-h-[220px] bg-[#0F172A] pt-0">
      <Banner
        variant="strip"
        status="warning"
        title="Your response time has slipped — risk losing top-3 ranking"
        action={<a href="#" className="underline">Review unanswered</a>}
        onClose={() => {}}
      >
        avg_confirm_time is 11h 42m (target &lt;6h for top-3). Bring it under 6h by Wed 2026-05-21 to avoid
        downgrade. Grace period: 4 days remaining.
      </Banner>
    </div>
  ),
};

// Brand (petrol) + Accent (gold) — mirrors Compass Alert Status=Brand/Accent.
// Content = the two real /coverage banners (search rank + expansion upsell).
export const BrandAccentDark: Story = {
  name: 'Brand + Accent (coverage banners, dark)',
  args: { title: 'Molecules/Banner' },
  parameters: { controls: { disable: true }, backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark max-w-3xl space-y-4 rounded-xl bg-[#1F2937] p-6">
      <Banner
        status="brand"
        title="Current search rank: #3 of 47 verified DE partners · last 30 days"
      >
        Adding markets, removing domains, or changing SLA-target each shifts your ranking within ~60 sec.
        Verification re-check required for new markets.
      </Banner>
      <Banner
        status="accent"
        title="Expanding into Customs & Excise (CST) would unlock rank-#1 contender position"
        action={
          <button
            type="button"
            className="rounded-lg bg-[#d4af37] px-3.5 py-2 text-[12px] font-semibold text-[#101411] no-underline transition-colors hover:bg-[#e6c964]"
          >
            Explore expansion
          </button>
        }
      >
        14 customers ran Risk Maps last month with DE + CST coverage gaps · only 4 partners cover both.
      </Banner>
    </div>
  ),
};
