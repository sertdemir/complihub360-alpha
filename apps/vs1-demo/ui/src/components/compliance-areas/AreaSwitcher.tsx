import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';
import { Container } from '../ui/Container';
import { DOMAIN_BY_SLUG, type DomainSlug } from '../../lib/domains';
import { AREAS } from './areas';
import { CountrySelector } from './CountrySelector';
import type { CountryCode } from './types';

interface Props {
  current: DomainSlug;
  selectedCountry: CountryCode;
  onCountryChange: (next: CountryCode) => void;
}

// ─── Lateral navigation for area pages ───────────────────────────────────────
// The hub's sticky anchor bar is gone: with eight areas and German labels it
// scrolled sideways out of reach, and it pointed at accordions that no longer
// exist. What a detail page actually needs is not a table of contents for
// itself but a way sideways — this shows where you are and opens the other
// seven, and carries the market selector so the choice survives the move.
export function AreaSwitcher({ current, selectedCountry, onCountryChange }: Props) {
  const { t } = useTranslation('common');
  const { locale } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // The site header is fixed and its height is responsive (h-16 below lg, h-20
  // above, plus its border) — 113px at desktop width, 64 on mobile. A sticky
  // bar with a hard `top-16` therefore slid under it on every viewport that is
  // not mobile, which is what the hub's old anchor bar did too and nobody
  // caught. Measuring beats guessing, and it self-corrects on resize instead of
  // pinning a magic number that drifts the next time the header changes.
  const [headerH, setHeaderH] = useState(64);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const localePrefix = locale ? `/${locale}` : '';
  const title = (slug: DomainSlug) =>
    t(`compliance.${slug}.title`, DOMAIN_BY_SLUG[slug]?.label ?? slug);

  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => setHeaderH(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      style={{ top: headerH }}
      className="sticky z-40 border-b border-stroke-subtle bg-surface/85 backdrop-blur-md"
    >
      <Container gutter="flat" className="flex items-center gap-3 py-2.5">
        <Link
          to={`${localePrefix}/compliance`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-body-xs font-semibold text-fg-secondary transition-colors hover:text-fg-brand"
        >
          <LayoutGrid size={14} />
          <span className="hidden tablet:inline">{t('compliance.area.allAreas', 'All areas')}</span>
        </Link>

        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="inline-flex max-w-full items-center gap-2 rounded-md px-3 py-1.5 text-ui-small font-bold text-fg transition-colors hover:bg-surface-secondary"
          >
            <span className="truncate">{title(current)}</span>
            <ChevronDown
              size={15}
              className={`shrink-0 text-fg-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <ul
              role="menu"
              className="absolute left-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-xl border border-stroke bg-surface py-1 shadow-xl"
            >
              {AREAS.map(a => {
                const active = a.slug === current;
                const Icon = a.icon;
                return (
                  <li key={a.slug} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        navigate(`${localePrefix}/compliance/${a.slug}`);
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-ui-small transition-colors hover:bg-brand-light ${
                        active ? 'bg-brand-light/60 font-bold text-fg-brand' : 'text-fg-secondary'
                      }`}
                    >
                      <Icon size={15} className="shrink-0 text-fg-tertiary" />
                      <span className="flex-1 truncate">{title(a.slug)}</span>
                      {active && <Check size={13} className="shrink-0 text-fg-brand" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hidden shrink-0 tablet:block">
          <CountrySelector value={selectedCountry} onChange={onCountryChange} size="sm" />
        </div>
      </Container>
    </div>
  );
}
