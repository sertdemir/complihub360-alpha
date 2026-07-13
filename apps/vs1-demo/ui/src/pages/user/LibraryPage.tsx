import { useState } from 'react';
import { Bookmark, Play, FileText, BookOpen, Wrench, Radio } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { Card } from '../../components/ui/Card';

// ─── User Dashboard · Library (Knowledge Hub) ─────────────────────────────────
// Mirrors "User · Library (Desktop)": TYPE + DOMAIN filter rows and the
// knowledge grid (videos · articles · webinars · guides · tools). Fixture data
// (item rows are demo content and stay untranslated).

type ItemType = 'VIDEO' | 'ARTICLE' | 'WEBINAR' | 'GUIDE' | 'TOOL';

const TYPE_ICON: Record<ItemType, typeof Play> = {
  VIDEO: Play, ARTICLE: FileText, WEBINAR: Radio, GUIDE: BookOpen, TOOL: Wrench,
};

const ITEMS: { title: string; source: string; type: ItemType; domain: string }[] = [
  { title: 'Italian VAT registration: step-by-step', source: 'CompliHub Editorial · 8 min', type: 'VIDEO', domain: 'TAX & VAT' },
  { title: 'GDPR cookie consent setup checklist', source: 'CompliHub Editorial · 12 steps', type: 'GUIDE', domain: 'PRIVACY' },
  { title: 'Health claims regulation: what you cannot say', source: 'Lex Marketing · 8 min read', type: 'ARTICLE', domain: 'MARKETING' },
  { title: 'DPA generator (DE/EN)', source: 'CompliHub Tools · Interactive', type: 'TOOL', domain: 'PRIVACY' },
  { title: 'OSS vs IOSS: live Q&A with Schmidt tax experts', source: 'CompliHub Live · Mar 14 · 90 min', type: 'WEBINAR', domain: 'TAX & VAT' },
  { title: 'EPR France: who needs to register?', source: 'PackComply GmbH · 14 min', type: 'VIDEO', domain: 'PACKAGING' },
  { title: 'Setting up a German GmbH from abroad', source: 'CompliHub Editorial · 22 steps', type: 'GUIDE', domain: 'CORPORATE' },
  { title: 'CONAI vs LUCID: comparison for EU sellers', source: 'CompliHub Editorial · 10 min read', type: 'ARTICLE', domain: 'PACKAGING' },
  { title: 'EU VAT threshold calculator', source: 'CompliHub Tools · Interactive', type: 'TOOL', domain: 'TAX & VAT' },
  { title: 'GDPR audit walkthrough — recorded webinar', source: 'Lex Privacy LLP · Feb 12 · 60 min', type: 'WEBINAR', domain: 'PRIVACY' },
  { title: 'Reverse charge mechanism explained', source: 'Tax Specialists EU · 11 min', type: 'VIDEO', domain: 'TAX & VAT' },
  { title: 'When does Partita IVA become mandatory?', source: 'Studio Bianchi · 6 min read', type: 'ARTICLE', domain: 'TAX & VAT' },
];

const TYPE_FILTERS: { key: string; labelKey: string }[] = [
  { key: 'all', labelKey: 'filterAll' }, { key: 'VIDEO', labelKey: 'filterVideos' }, { key: 'ARTICLE', labelKey: 'filterArticles' },
  { key: 'WEBINAR', labelKey: 'filterWebinars' }, { key: 'GUIDE', labelKey: 'filterGuides' }, { key: 'TOOL', labelKey: 'filterTools' },
];
const DOMAIN_FILTER_KEYS = ['filterAllDomains', 'filterTaxVat', 'filterPrivacy', 'filterPackaging', 'filterMarketing', 'filterCorporate'];

export function LibraryPage() {
  const { t } = useTranslation('userws');
  const [typeFilter, setTypeFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState(DOMAIN_FILTER_KEYS[0]);
  const list = ITEMS.filter((i) => typeFilter === 'all' || i.type === typeFilter);

  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="library.title" components={{ accent: <span className="text-fg-accent" /> }} />
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">{t('library.sub')}</p>
          </div>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Bookmark size={13} /> {t('shared.bookmarks')}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('library.rowType')}</span>
            {TYPE_FILTERS.map((f) => (
              <FilterChip key={f.key} size="sm" selected={typeFilter === f.key} onClick={() => setTypeFilter(f.key)}>{t(`library.${f.labelKey}`)}</FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('library.rowDomain')}</span>
            {DOMAIN_FILTER_KEYS.map((f) => (
              <FilterChip key={f} size="sm" selected={domainFilter === f} onClick={() => setDomainFilter(f)}>{t(`library.${f}`)}</FilterChip>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <Card key={item.title} styleVariant="filled" interactive className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-fg-brand">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-fg">{item.title}</p>
                    <p className="mt-1 text-[11px] text-fg-tertiary">{item.source}</p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <Tag tone="neutral">{item.type}</Tag>
                      <Tag tone="brand">{item.domain}</Tag>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </UserShell>
  );
}
