import type { Meta, StoryObj } from '@storybook/react';
import { ProviderMatchCard } from './ProviderMatchCard';

// Compass "Provider Match Card" (1530:628) — anonymised provider listing item
// for the Risk-Map results page: pseudonym label · verified badge · match score ·
// specializations · countries/languages · rating · response time · billing model.
const meta = {
  title: 'Organisms/Provider Match Card',
  component: ProviderMatchCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof ProviderMatchCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Verifizierte Steuerkanzlei · Norditalien',
    eyebrow: 'Mailand · aktiv seit 2015',
    match: '96% Match',
    matchTier: 'high',
    isVerified: true,
    tags: ['VAT & OSS', 'E-Commerce', 'EU-weit'],
    countries: 'IT · DE · EN',
    rating: '4,9 · 210 Mandate',
    responseTime: 'Ø 3 Std. Antwortzeit',
    billing: 'Projektbasiert',
  },
};

export const ListingDark: Story = {
  args: Default.args,
  parameters: { layout: 'fullscreen', controls: { disable: true } },
  render: () => (
    <div className="dark min-h-screen space-y-4 bg-[#1F2937] p-8">
      <ProviderMatchCard
        title="Verifizierte Steuerkanzlei · Norditalien" eyebrow="Mailand · aktiv seit 2015"
        match="96% Match" matchTier="high"
        tags={['VAT & OSS', 'E-Commerce', 'EU-weit']} countries="IT · DE · EN"
        rating="4,9 · 210 Mandate" responseTime="Ø 3 Std. Antwortzeit" billing="Projektbasiert"
      />
      <ProviderMatchCard
        title="Grenzüberschreitende Compliance-Beratung" eyebrow="Berlin · aktiv seit 2018"
        match="82% Match" matchTier="strong"
        tags={['VAT & OSS', 'Datenschutz', 'EU-weit']} countries="DE · EN · FR"
        rating="4,7 · 96 Mandate" responseTime="Ø 5 Std. Antwortzeit" billing="Abomodell"
      />
      <ProviderMatchCard
        title="VAT- & OSS-Spezialist · Südeuropa" eyebrow="Rom · aktiv seit 2020"
        match="71% Match" matchTier="moderate"
        tags={['VAT & OSS', 'E-Commerce']} countries="IT · EN"
        rating="4,5 · 41 Mandate" responseTime="Ø 8 Std. Antwortzeit" billing="Stundenbasis"
      />
    </div>
  ),
};
