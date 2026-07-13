import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { EntityCard } from '../../components/ui/Cards';

// ─── User Dashboard · Saved Providers ─────────────────────────────────────────
// Mirrors "User · Saved Providers (Desktop)" (2675:342). Fixture data (provider
// rows are demo content and stay untranslated).

const FILTER_KEYS = ['filterAll', 'filterVat', 'filterPrivacy', 'filterPackaging', 'filterMarketing', 'filterCorporate'];

const PROVIDERS = [
  { initials: 'SB', name: 'Studio Bianchi SRL', city: 'Milano, IT',
    sub: 'VERIFIED · Italian VAT registration + fiscal representation · DE·IT bilingual' },
  { initials: 'MT', name: 'Madrid Tax Consultancy', city: 'Madrid, ES',
    sub: 'VERIFIED · Iberian VAT (ES/PT) · monthly filing · marketplace optimization' },
];

export function SavedProvidersPage() {
  const { t } = useTranslation('userws');
  const [filter, setFilter] = useState('filterAll');
  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <Trans t={t} i18nKey="savedProviders.title" components={{ accent: <span className="text-fg-accent" /> }} />
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">{t('savedProviders.sub')}</p>
          </div>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Bookmark size={13} /> {t('shared.bookmarks')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_KEYS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{t(`savedProviders.${f}`)}</FilterChip>
          ))}
        </div>

        <div className="space-y-2.5">
          {PROVIDERS.map((p) => (
            <EntityCard
              key={p.initials}
              avatar={<span className="grid h-10 w-10 place-items-center rounded-full bg-[#004d40]/40 text-[12px] font-bold text-[#2cc0ad]">{p.initials}</span>}
              name={p.name}
              badge={<Tag tone="brand">✓ PARTNER</Tag>}
              meta={p.sub}
              trailing={<span className="text-[11px] text-fg-tertiary">{p.city}</span>}
              interactive
            />
          ))}
        </div>
      </div>
    </UserShell>
  );
}
