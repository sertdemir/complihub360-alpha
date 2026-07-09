import type { Meta, StoryObj } from '@storybook/react';

import { DomainBarChart, Sparkline, TrendAreaChart } from './Charts';
import type { ChartConfig } from './chart';

const DESCRIPTION = `
**Chart** — thin convenience wrappers over the shadcn \`chart.tsx\` recharts
container, tuned for the CompliHub360 dashboard:

- **\`TrendAreaChart\`** — gradient-filled Area chart for a single KPI trend
  (e.g. match-rate over 6 months).
- **\`DomainBarChart\`** — one- or multi-series Bar chart for per-domain counts
  (e.g. open vs. resolved obligations across Tax / GDPR / EPR / Safety).
- **\`Sparkline\`** — a ~40px axis-less, tooltip-less line for embedding in KPI cards.

Series colors come from a \`ChartConfig\` (brand petrol \`#004D40\` / lighter
\`#2f7d6e\` / gold \`#BCA033\`) and are injected as \`var(--color-<key>)\`. Axis ticks
use \`currentColor\` so they stay legible in both light and dark mode.
`;

/* -------------------------------------------------------------------------- */
/*  Brand colors + configs                                                    */
/* -------------------------------------------------------------------------- */

const PETROL = '#004D40';
const PETROL_LIGHT = '#2f7d6e';
const GOLD = '#BCA033';

const trendConfig = {
  matchRate: { label: 'Match rate', color: PETROL },
} satisfies ChartConfig;

const domainConfig = {
  open: { label: 'Open', color: GOLD },
  resolved: { label: 'Resolved', color: PETROL },
} satisfies ChartConfig;

/* -------------------------------------------------------------------------- */
/*  Realistic compliance data                                                 */
/* -------------------------------------------------------------------------- */

const matchRateTrend = [
  { month: 'Jan', matchRate: 71 },
  { month: 'Feb', matchRate: 74 },
  { month: 'Mar', matchRate: 78 },
  { month: 'Apr', matchRate: 76 },
  { month: 'May', matchRate: 83 },
  { month: 'Jun', matchRate: 88 },
];

const obligationsByDomain = [
  { domain: 'Tax', open: 12, resolved: 41 },
  { domain: 'GDPR', open: 7, resolved: 33 },
  { domain: 'EPR', open: 18, resolved: 22 },
  { domain: 'Safety', open: 4, resolved: 29 },
];

const sparkOpenObligations = [
  { v: 34 },
  { v: 31 },
  { v: 29 },
  { v: 33 },
  { v: 27 },
  { v: 24 },
  { v: 21 },
];
const sparkAuditScore = [
  { v: 62 },
  { v: 64 },
  { v: 61 },
  { v: 68 },
  { v: 72 },
  { v: 75 },
  { v: 79 },
];
const sparkDeadlines = [
  { v: 9 },
  { v: 8 },
  { v: 11 },
  { v: 7 },
  { v: 6 },
  { v: 8 },
  { v: 5 },
];

/* -------------------------------------------------------------------------- */
/*  Card helpers                                                              */
/* -------------------------------------------------------------------------- */

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-stroke bg-surface p-4 ${className ?? ''}`}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-fg-secondary">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function KpiSparkCard({
  label,
  value,
  data,
  color,
}: {
  label: string;
  value: string;
  data: { v: number }[];
  color: string;
}) {
  return (
    <div className="rounded-xl border border-stroke bg-surface p-4">
      <p className="text-xs font-medium text-fg-secondary">{label}</p>
      <p className="mb-2 text-2xl font-semibold text-fg">{value}</p>
      <Sparkline data={data} dataKey="v" color={color} />
    </div>
  );
}

function Gallery() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <ChartCard
        title="Match-rate trend"
        subtitle="Last 6 months · % of assessments matched to a provider"
      >
        <TrendAreaChart
          data={matchRateTrend}
          config={trendConfig}
          dataKey="matchRate"
          xKey="month"
          className="aspect-[3/1]"
        />
      </ChartCard>

      <ChartCard
        title="Open obligations per domain"
        subtitle="Open vs. resolved across compliance domains"
      >
        <DomainBarChart
          data={obligationsByDomain}
          config={domainConfig}
          dataKeys={['open', 'resolved']}
          xKey="domain"
          className="aspect-[3/1]"
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiSparkCard
          label="Open obligations"
          value="21"
          data={sparkOpenObligations}
          color={GOLD}
        />
        <KpiSparkCard
          label="Audit readiness"
          value="79%"
          data={sparkAuditScore}
          color={PETROL}
        />
        <KpiSparkCard
          label="Upcoming deadlines"
          value="5"
          data={sparkDeadlines}
          color={PETROL_LIGHT}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Storybook meta                                                            */
/* -------------------------------------------------------------------------- */

const meta: Meta<typeof TrendAreaChart> = {
  title: 'Molecules/Chart',
  component: TrendAreaChart,
  parameters: {
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TrendAreaChart>;

export const Light: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="bg-neutral-50 p-6">
      <Gallery />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="dark min-h-screen bg-[#1F2937] p-8">
      <Gallery />
    </div>
  ),
};
