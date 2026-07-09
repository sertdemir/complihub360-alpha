import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './chart';

/* -------------------------------------------------------------------------- */
/*  TrendAreaChart                                                             */
/* -------------------------------------------------------------------------- */

export interface TrendAreaChartProps {
  /** Rows of data; each row holds the x value and the series value(s). */
  data: Record<string, unknown>[];
  /** ChartConfig mapping series keys to labels + brand colors. */
  config: ChartConfig;
  /** Key in each row holding the numeric series to plot. */
  dataKey: string;
  /** Key in each row holding the x-axis category (e.g. month). */
  xKey: string;
  className?: string;
}

/**
 * Single-series Area chart for KPI trends (e.g. match-rate over time).
 * Renders inside a ChartContainer with a gradient fill + token-driven tooltip.
 */
export function TrendAreaChart({
  data,
  config,
  dataKey,
  xKey,
  className,
}: TrendAreaChartProps) {
  const gradientId = React.useId().replace(/:/g, '');

  return (
    <ChartContainer
      config={config}
      className={cn('text-fg-tertiary', className)}
    >
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={`var(--color-${dataKey})`}
              stopOpacity={0.35}
            />
            <stop
              offset="95%"
              stopColor={`var(--color-${dataKey})`}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: 'currentColor', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={32}
          tick={{ fill: 'currentColor', fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*  DomainBarChart                                                            */
/* -------------------------------------------------------------------------- */

export interface DomainBarChartProps {
  /** Rows of data; each row holds the x category + one value per series. */
  data: Record<string, unknown>[];
  /** ChartConfig mapping every series key to labels + brand colors. */
  config: ChartConfig;
  /** One or more series keys to render as bars. */
  dataKeys: string[];
  /** Key in each row holding the x-axis category (e.g. domain name). */
  xKey: string;
  className?: string;
}

/**
 * One- or multi-series Bar chart for per-domain counts
 * (e.g. open vs. resolved obligations per compliance domain).
 */
export function DomainBarChart({
  data,
  config,
  dataKeys,
  xKey,
  className,
}: DomainBarChartProps) {
  return (
    <ChartContainer
      config={config}
      className={cn('text-fg-tertiary', className)}
    >
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: 'currentColor', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={32}
          tick={{ fill: 'currentColor', fontSize: 11 }}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.08 }}
          content={<ChartTooltipContent />}
        />
        {dataKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sparkline                                                                 */
/* -------------------------------------------------------------------------- */

export interface SparklineProps {
  /** Rows of data; each row holds at least the plotted numeric value. */
  data: Record<string, unknown>[];
  /** Key in each row holding the numeric value to plot. */
  dataKey: string;
  /** Explicit line color (hex). Defaults to brand petrol. */
  color?: string;
  className?: string;
}

/**
 * Tiny axis-less, tooltip-less line for embedding inside KPI cards.
 * Uses recharts directly (no ChartContainer) for minimal overhead.
 */
export function Sparkline({
  data,
  dataKey,
  color = '#004D40',
  className,
}: SparklineProps) {
  return (
    <div className={cn('h-[40px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <Line
            dataKey={dataKey}
            type="monotone"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
