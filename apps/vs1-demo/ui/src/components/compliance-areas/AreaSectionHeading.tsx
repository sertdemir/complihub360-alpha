import { useTranslation } from 'react-i18next';
import { SectionEyebrow } from '../providers/SectionHeading';
import { Typography } from '../ui/Typography';
import type { ReactNode } from 'react';

interface Props {
  /** The canvas eyebrow for this section, already translated. */
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** For the one dark band, where fg-tertiary would vanish into the petrol. */
  tone?: 'default' | 'inverse';
  className?: string;
}

// ─── The area page's section header ──────────────────────────────────────────
// Eyebrow over serif headline over lead, which is how the canvas opens every
// section below the hero. The eyebrow is the part that was missing: without it
// a reader scrolling the page has no running label for where they are, and the
// sections read as a list of unrelated headlines.
//
// The canvas numbers its eyebrows — "01 — Betroffenheit". We carry the word
// alone. The numbers are a canvas-side reading aid: they count artboards, and
// the live page does not have the same count (it carries a closing CTA the
// canvas draws in the hero, and its specialists band has no eyebrow at all).
// A number that does not match what a reader can count is worse than none.
//
// No dot, matching the canvas and the hero above. The marketing surface's
// eyebrows carry one; this page's do not, and mixing the two on one page is
// what would look like an accident.
export function AreaSectionHeading({ eyebrow, title, lead, tone = 'default', className = '' }: Props) {
  return (
    <div className={className}>
      <SectionEyebrow tone={tone === 'inverse' ? 'inverse' : 'neutral'} dot={false}>
        {eyebrow}
      </SectionEyebrow>
      <Typography
        variant="h2"
        as="h2"
        weight="bold"
        className={`mt-3.5 ${tone === 'inverse' ? 'text-white' : 'text-fg'}`}
      >
        {title}
      </Typography>
      {lead && (
        <Typography
          variant="body"
          className={`mt-2 leading-relaxed ${tone === 'inverse' ? 'text-primary-100' : 'text-fg-secondary'}`}
        >
          {lead}
        </Typography>
      )}
    </div>
  );
}

/** The canvas eyebrows, in one place so the page and its sections cannot drift. */
export function useAreaEyebrows() {
  const { t } = useTranslation('common');
  return {
    affected: t('compliance.area.eyebrow.affected', 'Applicability'),
    obligations: t('compliance.area.eyebrow.obligations', 'Duties'),
    enforcement: t('compliance.area.eyebrow.enforcement', 'Enforcement'),
    timeline: t('compliance.area.eyebrow.timeline', 'Timeline'),
    markets: t('compliance.area.eyebrow.markets', 'Markets'),
    process: t('compliance.area.eyebrow.process', 'How it runs'),
    calendar: t('compliance.area.eyebrow.calendar', 'Calendar'),
    weighting: t('compliance.area.eyebrow.weighting', 'Weighting'),
    coverage: t('compliance.area.eyebrow.coverage', 'Coverage'),
    next: t('compliance.area.eyebrow.next', 'Next'),
  };
}
