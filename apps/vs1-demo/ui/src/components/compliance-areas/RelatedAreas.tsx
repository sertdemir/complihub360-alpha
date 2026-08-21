import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { DOMAIN_BY_SLUG } from '../../lib/domains';
import { getAreaProfile } from '../../lib/areaProfiles';
import { AREAS } from './areas';
import type { DomainSlug } from '../../lib/domains';

interface Props {
  slug: DomainSlug;
}

// Relatedness is derived, not curated: two areas are related when the engine
// files duties under both that share trigger tags. That keeps the cross-links
// truthful as the template library grows — an editorial list would have gone
// stale the first time a subdomain was added, and silently.
function relatedTo(slug: DomainSlug): DomainSlug[] {
  const own = new Set(getAreaProfile(slug).subdomains.flatMap(s => s.triggerTags));
  return AREAS.filter(a => a.slug !== slug)
    .map(a => {
      const overlap = getAreaProfile(a.slug).subdomains
        .flatMap(s => s.triggerTags)
        .filter(tag => own.has(tag)).length;
      return { slug: a.slug, overlap };
    })
    .filter(a => a.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map(a => a.slug);
}

export function RelatedAreas({ slug }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const localePrefix = locale ? `/${locale}` : '';
  const related = relatedTo(slug);

  if (related.length === 0) return null;

  return (
    <div>
      <Typography variant="h2" as="h2" weight="bold" className="text-fg">
        {t('compliance.area.relatedTitle', 'Areas that travel with this one')}
      </Typography>
      <Typography variant="body" className="mt-2 max-w-2xl text-fg-secondary">
        {t('compliance.area.relatedLead', {
          defaultValue:
            'These share triggers with the area you are reading — the same fact about your business pulls them in too.',
        })}
      </Typography>

      <div className="mt-6 grid gap-4 tablet:grid-cols-3">
        {related.map(s => {
          const meta = AREAS.find(a => a.slug === s)!;
          const Icon = meta.icon;
          return (
            <Link
              key={s}
              to={`${localePrefix}/compliance/${s}`}
              className="group flex items-center gap-3 rounded-xl border border-stroke-subtle bg-surface p-4 transition-colors hover:border-brand"
            >
              <Icon size={18} className="shrink-0 text-fg-brand" />
              <span className="flex-1 text-body-sm font-semibold text-fg">
                {t(`compliance.${s}.title`, DOMAIN_BY_SLUG[s]?.label ?? s)}
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
