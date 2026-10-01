import type { Meta, StoryObj } from '@storybook/react';
import { RequestCard } from './RequestCard';
import { Button } from './Button';

// Compass "Request Card" (1444:605), Canvas-Wahl 1 V3 — Titel + Status-Pille,
// Kontextzeile (Bereich · Markt · Eingang · ID), Anliegen, Frist, Aktion.
const meta = {
  title: 'Organisms/Request Card',
  component: RequestCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof RequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    context: 'Verpackung & EPR · Deutschland · vor 12 Min. · RQ-7C41',
    status: 'awaiting-confirm',
    company: '🔒 Anonymisierte Anfrage',
    meta: 'EPR-Setup für den Marktplatz-Start in Deutschland: LUCID, Systembeteiligung, Mengenmeldung.',
    slaValue: '23h 48m',
    action: <Button variant="primary" size="sm">Open · confirm</Button>,
  },
};

export const StatesDark: Story = {
  args: Default.args,
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark min-h-screen space-y-2.5 bg-[#1F2937] p-8">
      <RequestCard
        context="Verpackung & EPR · Deutschland · vor 12 Min. · RQ-7C41" status="awaiting-confirm"
        company="🔒 Anonymisierte Anfrage"
        meta="D2C · €4.2M revenue · target launch Q3 · sells furniture cross-border via own webshop + Amazon DE/AT marketplaces"
        slaValue="23h 48m"
        action={<Button variant="primary" size="sm">Open · confirm</Button>}
      />
      <RequestCard
        context="Steuern & USt · Vereinigtes Königreich · gestern · RQ-7A92" status="awaiting-reply"
        company="Brunnen Living Ltd."
        meta="D2C + Marketplace · €12M revenue · renewing annual VAT advisory retainer · prior engagements 2023+2024"
        slaValue="36h 18m"
        action={<Button size="sm">Reply</Button>}
      />
      <RequestCard
        context="Steuern & USt · Deutschland · vor 4 Tagen · RQ-79D8" status="active"
        company="KraftKaffee GmbH"
        meta="D2C · €2.4M revenue · quarterly OSS filing in progress · Q2 deadline 2026-07-31"
        action={<Button variant="ghost" size="sm">View</Button>}
      />
    </div>
  ),
};
