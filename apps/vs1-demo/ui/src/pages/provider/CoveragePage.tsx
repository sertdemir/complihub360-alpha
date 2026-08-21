import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { RankingImpactDrawer } from '../../components/provider/ProviderDrawers';
import { AddMarketDrawer } from '../../components/provider/AddMarketDrawer';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { FilterChip } from '../../components/ui/Badge';
import { DomainCard } from '../../components/ui/DomainCard';
import { Card } from '../../components/ui/Card';

// ─── Provider /coverage ───────────────────────────────────────────────────────
// Mirrors "Provider · /coverage · + Languages & SLA" (2694:2): rank banner ·
// public identity · markets + languages chips · domain cards · gold expansion
// banner · SLA target picker. Design fixture data until the profile API lands.

function SectionHeader({ title, sub, editLabel }: { title: string; sub: string; editLabel: string }) {
  // v2 polish: edit links point at the real self-service surface (Settings →
  // Matchmaking panel) instead of a dead anchor.
  const { i18n } = useTranslation('providerws');
  const base = `/${i18n.resolvedLanguage || 'en'}/partner-dashboard/settings`;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        <p className="mt-0.5 text-[12px] text-fg-tertiary">{sub}</p>
      </div>
      <Link to={base} className="shrink-0 text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline">{editLabel}</Link>
    </div>
  );
}

// Rank figures are design-fixture data; the visible labels come from providerws.
const MARKETS = [
  { labelKey: 'coverage.marketGermany', selected: true },
  { labelKey: 'coverage.marketAustria', selected: true },
  { labelKey: 'coverage.marketNetherlands', selected: false },
  { labelKey: 'coverage.marketSwitzerland', selected: false },
];

const DOMAINS = [
  { eyebrow: 'VAT', titleKey: 'coverage.domainVatTitle', metaKey: 'coverage.domainVatMeta' },
  { eyebrow: 'EPR', titleKey: 'coverage.domainEprTitle', metaKey: 'coverage.domainEprMeta' },
  { eyebrow: 'DAT', titleKey: 'coverage.domainDatTitle', metaKey: 'coverage.domainDatMeta' },
];

// Language names stay endonyms (Deutsch, English, …) — they are not translated.
const LANGUAGES = [
  { label: '✓ Deutsch', selected: true }, { label: '✓ English', selected: true }, { label: '✓ Italiano', selected: true },
  { label: 'Français', selected: false }, { label: 'Español', selected: false }, { label: 'Nederlands', selected: false }, { label: 'Polski', selected: false },
];

const SLA = [
  { titleKey: 'coverage.sla6hTitle', subKey: 'coverage.sla6hSub', selected: false },
  { titleKey: 'coverage.sla12hTitle', subKey: 'coverage.sla12hSub', selected: true },
  { titleKey: 'coverage.sla24hTitle', subKey: 'coverage.sla24hSub', selected: false },
];

export function CoveragePage() {
  const { t, i18n } = useTranslation('providerws');
  const [rankingOpen, setRankingOpen] = useState(false);
  // B5: "+ Add market" → drawer; freshly added markets show as pending chips.
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('coverage.title')}</h1>
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <Link to={`/${i18n.resolvedLanguage || 'en'}/partner-dashboard/settings`} className="text-[12px] font-medium text-fg underline underline-offset-2">{t('coverage.previewProfile')}</Link>
            <Button size="sm" onClick={() => setRankingOpen(true)}>{t('coverage.viewRankingImpact')}</Button>
          </div>
        </div>
        <p className="-mt-4 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">
          {t('coverage.subtitle')}
        </p>

        <Banner status="brand" title={t('coverage.rankBannerTitle')}>
          {t('coverage.rankBannerBody')}
        </Banner>

        <section className="space-y-3">
          <SectionHeader title={t('coverage.publicIdentityTitle')} sub={t('coverage.publicIdentitySub')} editLabel={t('coverage.edit')} />
          <Card styleVariant="outlined" className="flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-accent text-[13px] font-bold text-fg-on-accent">DC</span>
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
          <SectionHeader title={t('coverage.marketsTitle')} sub={t('coverage.marketsSub')} editLabel={t('coverage.edit')} />
          <div className="flex flex-wrap items-center gap-2.5">
            {MARKETS.map((m) => (
              <FilterChip key={m.labelKey} selected={m.selected}>{t(m.labelKey)}</FilterChip>
            ))}
            {pending.map((c) => (
              <FilterChip key={c} selected>{t('coverage.pendingMarketChip', { code: c })}</FilterChip>
            ))}
            <FilterChip selected={false} onClick={() => setAddOpen(true)}>{t('coverage.addMarketChip')}</FilterChip>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title={t('coverage.domainsTitle')} sub={t('coverage.domainsSub')} editLabel={t('coverage.edit')} />
          <div className="grid gap-3 lg:grid-cols-3">
            {DOMAINS.map((d) => (
              <DomainCard key={d.eyebrow} eyebrow={d.eyebrow} title={t(d.titleKey)} meta={t(d.metaKey)} interactive />
            ))}
          </div>
        </section>

        <Banner
          status="accent"
          title={t('coverage.expansionBannerTitle')}
          action={<Button size="sm" variant="accent">{t('coverage.exploreExpansion')}</Button>}
        >
          {t('coverage.expansionBannerBody')}
        </Banner>

        <section className="space-y-3">
          <SectionHeader title={t('coverage.languagesTitle')} sub={t('coverage.languagesSub')} editLabel={t('coverage.edit')} />
          <div className="flex flex-wrap items-center gap-2">
            {LANGUAGES.map((l) => (
              <FilterChip key={l.label} size="sm" selected={l.selected}>{l.label}</FilterChip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title={t('coverage.slaTitle')} sub={t('coverage.slaSub')} editLabel={t('coverage.edit')} />
          <div className="grid gap-3 lg:grid-cols-3">
            {SLA.map((s) => (
              <Card key={s.titleKey} styleVariant="outlined" interactive selected={s.selected} className="p-4">
                <p className={s.selected ? 'text-[14px] font-semibold text-fg-brand' : 'text-[14px] font-semibold text-fg'}>{t(s.titleKey)}</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">{t(s.subKey)}</p>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-fg-tertiary">
            {t('coverage.slaNote')}
          </p>
        </section>
      </div>
      <RankingImpactDrawer open={rankingOpen} onClose={() => setRankingOpen(false)} />
      <AddMarketDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={(c) => setPending((p) => (p.includes(c) ? p : [...p, c]))} />
    </ProviderShell>
  );
}
