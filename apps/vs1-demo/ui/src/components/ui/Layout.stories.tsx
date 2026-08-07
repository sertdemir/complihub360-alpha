import type { Meta, StoryObj } from '@storybook/react';
import { Container, type ContainerSize } from './Container';
import { Section } from './Section';

// Foundations/Layout — documents the Compass responsive container system.
// Breakpoints: xs360 · sm600 · md768 · lg1024 · xl1440 · 2xl1920.
// Containers: sm600 · md768 · lg1024 · xl1200(★ marketing) · 2xl1440(★ max).
// Side margins grow fluidly: 16 (mobile) → 40 (tablet) → 80 (desktop); beyond the
// max-width only the outer margins grow (content stays centered).

const meta = {
  title: 'Foundations/Layout',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const SIZES: { size: ContainerSize; label: string; note: string }[] = [
  { size: 'sm', label: 'container/sm · 600px', note: 'Reading · Login · Modal' },
  { size: 'md', label: 'container/md · 768px', note: 'Article · Body · Wizard' },
  { size: 'lg', label: 'container/lg · 1024px', note: 'App + Sidebar' },
  { size: 'xl', label: 'container/xl · 1200px', note: '★ Standard Marketing / Hero' },
  { size: '2xl', label: 'container/2xl · 1440px', note: '★ Compass Max' },
];

export const ContainerSizes: Story = {
  render: () => (
    <div className="space-y-3 bg-surface-secondary py-8">
      {SIZES.map(({ size, label, note }) => (
        <Container key={size} size={size}>
          <div className="rounded-2xl border-md border-stroke-brand bg-surface px-6 py-5 shadow-md">
            <p className="font-sans text-sm font-semibold text-fg">{label}</p>
            <p className="font-sans text-sm text-fg-secondary">{note}</p>
          </div>
        </Container>
      ))}
      <p className="px-4 text-center font-sans text-xs text-fg-tertiary md:px-10 lg:px-20">
        Resize the viewport: side margins grow 16 → 40 → 80; past the max-width the band stays centered.
      </p>
    </div>
  ),
};

export const SectionTones: Story = {
  render: () => (
    <div>
      {(['default', 'secondary', 'tertiary', 'brand', 'inverse'] as const).map((tone) => (
        <Section key={tone} tone={tone} spacing="md" reveal={false}>
          <p className="font-sans text-sm font-semibold">tone="{tone}"</p>
          <p className="font-sans text-sm opacity-80">
            Full-bleed band · centered container/xl · Compass surface doctrine.
          </p>
        </Section>
      ))}
    </div>
  ),
};
