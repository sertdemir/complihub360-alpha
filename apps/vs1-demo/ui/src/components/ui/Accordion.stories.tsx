import type { Meta, StoryObj } from '@storybook/react';
import { ShieldCheck } from 'lucide-react';
import { Accordion, AccordionItem } from './Accordion';

const DESCRIPTION = `
**Accordion** — vertical disclosure list, mirrored 1:1 from the Compass *Accordion*
component (Figma 573:2). Each item is a self-contained box; a group stacks them
with a small gap.

- **\`styleVariant\`** — \`default\` (bordered) · \`filled\` (neutral-100) · \`ghost\` (borderless).
- **\`size\`** — \`sm\` · \`md\` · \`lg\` (header 40 / 52 / 64, radius 8 / 10 / 12, title 13 / 14 / 16 Semi Bold).
- **\`type\`** — \`single\` (FAQ default, one open) · \`multiple\` (several open).
- **\`iconLeft\`** (per item) · **\`disabled\`** (per item).
- The title stays default-dark when expanded (not petrol) — the chevron + revealed
  content are the only active affordances, per the Compass spec. Fully keyboard- and
  screen-reader-accessible (\`aria-expanded\` / \`aria-controls\` / labelled region).
`;

const meta = {
  title: 'Molecules/Accordion',
  component: Accordion,
  parameters: {
    layout: 'padded',
    docs: { description: { component: DESCRIPTION } },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const FAQ = [
  {
    value: 'q1',
    q: 'How does CompliHub match me with a provider?',
    a: 'After your assessment we score every vetted partner against your jurisdictions, compliance areas and risk profile, then surface the best fit with a transparent match percentage — no cold calls, no guesswork.',
  },
  {
    value: 'q2',
    q: 'Is my company data shared before I accept a match?',
    a: 'No. Providers only see an anonymised dossier until you explicitly accept a match. Your identity and documents stay private until you decide to engage.',
  },
  {
    value: 'q3',
    q: 'Which compliance areas are covered?',
    a: 'Tax & VAT, Data Privacy (GDPR), EPR & packaging, Marketing standards and Corporate setup — across 27+ EU jurisdictions, kept current with regulatory drift alerts.',
  },
];

export const FAQSingle: Story = {
  name: 'FAQ (single · default)',
  args: { children: null },
  render: () => (
    <div className="mx-auto max-w-2xl">
      <Accordion type="single" styleVariant="default" size="md" defaultValue="q1">
        {FAQ.map((f) => (
          <AccordionItem key={f.value} value={f.value} title={f.q}>
            {f.a}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export const Styles: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
      {(['default', 'filled', 'ghost'] as const).map((sv) => (
        <div key={sv}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{sv}</p>
          <Accordion type="single" styleVariant={sv} size="md" defaultValue="q1">
            {FAQ.slice(0, 3).map((f) => (
              <AccordionItem key={f.value} value={f.value} title={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((sz) => (
        <div key={sz}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{sz}</p>
          <Accordion type="single" styleVariant="default" size={sz} defaultValue="q1">
            {FAQ.slice(0, 2).map((f) => (
              <AccordionItem key={f.value} value={f.value} title={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  ),
};

export const WithIconAndDisabled: Story = {
  name: 'Icon left · disabled',
  args: { children: null },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="mx-auto max-w-2xl">
      <Accordion type="single" styleVariant="filled" size="md" defaultValue="q1">
        <AccordionItem value="q1" title="Verified providers only" iconLeft={<ShieldCheck size={18} />}>
          Every provider in the network passes accountability and qualification checks before they can receive a match.
        </AccordionItem>
        <AccordionItem value="q2" title="Coming soon — API access" disabled>
          Programmatic access to matching is on the roadmap.
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Dark: Story = {
  args: { children: null },
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark grid gap-8 bg-[#1F2937] p-8 md:grid-cols-3">
      {(['default', 'filled', 'ghost'] as const).map((sv) => (
        <div key={sv}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">{sv}</p>
          <Accordion type="single" styleVariant={sv} size="md" defaultValue="q1">
            {FAQ.slice(0, 2).map((f) => (
              <AccordionItem key={f.value} value={f.value} title={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  ),
};
