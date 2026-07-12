import { useState } from 'react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { RankingImpactDrawer } from '../../components/provider/ProviderDrawers';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { DomainCard } from '../../components/ui/DomainCard';
import { Card } from '../../components/ui/Card';

// ─── Provider /coverage ───────────────────────────────────────────────────────
// Mirrors "Provider · /coverage · + Languages & SLA" (2694:2): rank banner ·
// public identity · markets + languages chips · domain cards · gold expansion
// banner · SLA target picker. Design fixture data until the profile API lands.

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        <p className="mt-0.5 text-[12px] text-fg-tertiary">{sub}</p>
      </div>
      <a href="#" className="shrink-0 text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">Edit</a>
    </div>
  );
}

const MARKETS = [
  { label: '✓ Germany · rank #3 of 47', selected: true },
  { label: '✓ Austria · rank #5 of 18', selected: true },
  { label: 'Netherlands', selected: false },
  { label: 'Switzerland', selected: false },
  { label: '+ Add market', selected: false },
];

const DOMAINS = [
  { eyebrow: 'VAT', title: 'VAT & Indirect Tax', meta: '8 active engagements · rank #3' },
  { eyebrow: 'EPR', title: 'Producer Responsibility', meta: '3 active · rank #2 (top-tier)' },
  { eyebrow: 'DAT', title: 'Data Privacy', meta: '1 active · rank #14 (improving)' },
];

const LANGUAGES = [
  { label: '✓ Deutsch', selected: true }, { label: '✓ English', selected: true }, { label: '✓ Italiano', selected: true },
  { label: 'Français', selected: false }, { label: 'Español', selected: false }, { label: 'Nederlands', selected: false }, { label: 'Polski', selected: false },
];

const SLA = [
  { title: 'Confirm within 6h', sub: 'top-tier', selected: false },
  { title: 'Confirm within 12h', sub: 'recommended', selected: true },
  { title: 'Confirm within 24h', sub: 'standard', selected: false },
];

export function CoveragePage() {
  const [rankingOpen, setRankingOpen] = useState(false);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">Coverage</h1>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <a href="#" className="text-[12px] font-medium text-fg underline underline-offset-2">Preview public profile</a>
            <Button size="sm" onClick={() => setRankingOpen(true)}>View ranking impact</Button>
          </div>
        </div>
        <p className="-mt-4 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">
          Your public profile + matching weights. Every edit affects search ranking and lead routing within 60 seconds.
          Adding a market triggers 2-business-day re-verification before it goes live.
        </p>

        <Banner status="brand" title="Current search rank: #3 of 47 verified DE partners · last 30 days">
          Adding markets, removing domains, or changing SLA-target each shifts your ranking within ~60 sec.
          Verification re-check required for new markets.
        </Banner>

        <section className="space-y-3">
          <SectionHeader title="Public identity" sub="How clients see you in search results" />
          <Card styleVariant="outlined" className="flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d4af37] text-[13px] font-bold text-[#101411]">DC</span>
            <div className="min-w-0">
              <p className="font-serif text-[17px] font-semibold text-fg">Dahlmann CPA Steuerberatungs GmbH</p>
              <p className="mt-0.5 truncate text-[12px] text-fg-secondary">
                Boutique Steuerberatungs-Praxis · Munich · 8 partners, 24 staff · cross-border e-commerce VAT, EPR
                registrations, GoBD audits for D2C + marketplace seller segment.
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Markets covered" sub="2 active · adding a market = 2-BD re-verification + ranking re-index" />
          <div className="flex flex-wrap items-center gap-2.5">
            {MARKETS.map((m) => (
              <FilterChip key={m.label} selected={m.selected}>{m.label}</FilterChip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Compliance domains handled" sub="3 active · each domain has independent ranking weight" />
          <div className="grid gap-3 lg:grid-cols-3">
            {DOMAINS.map((d) => (
              <DomainCard key={d.eyebrow} {...d} interactive />
            ))}
          </div>
        </section>

        <Banner
          status="accent"
          title="Expanding into Customs & Excise (CST) would unlock rank-#1 contender position"
          action={<Button size="sm" variant="accent">Explore expansion</Button>}
        >
          14 customers ran Risk Maps last month with DE + CST coverage gaps · only 4 partners cover both · adding CST
          &gt; est. €18-24k MRR + likely top-3 in CST domain.
        </Banner>

        <section className="space-y-3">
          <SectionHeader title="Languages spoken" sub="Clients filter partners by language · affects matching" />
          <div className="flex flex-wrap items-center gap-2">
            {LANGUAGES.map((l) => (
              <FilterChip key={l.label} size="sm" selected={l.selected}>{l.label}</FilterChip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="SLA target" sub="How fast you commit to confirm · directly affects your ranking" />
          <div className="grid gap-3 lg:grid-cols-3">
            {SLA.map((s) => (
              <Card key={s.title} styleVariant="outlined" interactive selected={s.selected} className="p-4">
                <p className={s.selected ? 'text-[14px] font-semibold text-fg-brand' : 'text-[14px] font-semibold text-fg'}>{s.title}</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">{s.sub}</p>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-fg-tertiary">
            Faster targets lift your rank — but missing them hurts your trust score. Pick what you can reliably hit.
          </p>
        </section>
      </div>
      <RankingImpactDrawer open={rankingOpen} onClose={() => setRankingOpen(false)} />
    </ProviderShell>
  );
}
