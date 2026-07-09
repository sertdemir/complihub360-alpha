import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { FilterChip } from '../../components/ui/Badge';
import { Tag } from '../../components/ui/Tag';
import { EntityCard } from '../../components/ui/Cards';

// ─── User Dashboard · Saved Providers ─────────────────────────────────────────
// Mirrors "User · Saved Providers (Desktop)" (2675:342). Fixture data.

const FILTERS = ['All · 2', 'VAT · 2', 'Privacy', 'Packaging', 'Marketing', 'Corporate'];

const PROVIDERS = [
  { initials: 'SB', name: 'Studio Bianchi SRL', city: 'Milano, IT',
    sub: 'VERIFIED · Italian VAT registration + fiscal representation · DE·IT bilingual' },
  { initials: 'MT', name: 'Madrid Tax Consultancy', city: 'Madrid, ES',
    sub: 'VERIFIED · Iberian VAT (ES/PT) · monthly filing · marketplace optimization' },
];

export function SavedProvidersPage() {
  const [filter, setFilter] = useState('All · 2');
  return (
    <UserShell activeDomain="Tax & VAT">
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              Saved <span className="text-fg-accent">providers</span>
            </h1>
            <p className="mt-1 text-body-sm text-fg-secondary">Providers you bookmarked from your risk maps and threads.</p>
          </div>
          <button type="button" className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-fg-secondary transition-colors hover:text-fg">
            <Bookmark size={13} /> Bookmarks (12)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} size="sm" selected={filter === f} onClick={() => setFilter(f)}>{f}</FilterChip>
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
