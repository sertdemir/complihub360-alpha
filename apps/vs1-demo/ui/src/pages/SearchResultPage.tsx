import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { DOMAINS } from '../lib/domains';
import { areasForQuery } from '../lib/searchAreas';

// ─── /search · die ehrliche Bruecke (Beta-Plan Mi 14.10.) ────────────────────
// Canvas „Suche als ehrliche Brücke", Wahl 10.10.2026: A1 · B3 · C2 · D2;
// Figma: Screens-Datei, Seite „Suche als ehrliche Brücke (Mi 14.10.)", 3648:14.
//
// Bis zum 10.10. stand hier zu JEDER Frage dieselbe „KI-Antwort" mit drei
// festen Quellen und drei festen Pflichten samt Risikostufe — wer nach Cookies
// fragte, sah OSS mit „Hoch". Eine Antwort-Engine fuer Freitext gibt es in der
// Beta nicht. Die Seite sagt das jetzt, nimmt die Frage auf und zeigt die
// echten Wege: das Assessment, einen Menschen, den passenden Bereich (feste
// Stichwortliste, lib/searchAreas.ts — keine KI) und die Einstiege.

// Die Einstiege zeigen auf das, was es gibt, jeweils an seinem eigenen Ziel.
const ENTRIES = [
  { key: 'markets', path: 'markets' },
  { key: 'compliance', path: 'compliance' },
  { key: 'howItWorks', path: 'how-it-works' },
] as const;

export function SearchResultPage() {
  const { t } = useTranslation(['results', 'auth']);
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [params] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);

  const runQuery = () => {
    const q = query.trim();
    navigate(`/${locale}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };
  const startGuided = () => navigate(`/${locale}/wizard`);
  // Ohne Frage gibt es keine Frage-Ueberschrift; dann ist der Hinweis die h1.
  const HintTitle = initialQuery ? 'h2' : 'h1';
  const areas = areasForQuery(initialQuery).map((slug) => DOMAINS.find((d) => d.slug === slug)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-surface text-fg">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-stroke-subtle bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1100px] items-center justify-between px-4 md:px-8">
          <Logo lockup="horizontal" href={`/${locale}`} className="h-[36px]" />
          <button type="button" onClick={startGuided} className="text-body-xs font-semibold text-fg-brand hover:underline">
            {t('search.navGuided')} →
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-4 pb-24 pt-10 md:px-8">
        {/* Query bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); runQuery(); }}
          className="flex items-center gap-2 rounded-xl border border-stroke bg-surface p-2 shadow-[0_18px_44px_-32px_rgba(2,22,17,0.35)] focus-within:border-fg-brand"
        >
          <Search size={18} className="ml-2 shrink-0 text-fg-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-body text-fg placeholder:text-fg-tertiary focus:outline-none"
          />
          <Button type="submit" size="md" className="shrink-0">{t('search.submit')}</Button>
        </form>

        {/* A1 · die Frage als Ueberschrift (ohne Frage: der Hinweis traegt sie) */}
        {initialQuery && (
          <h1 className="mt-10 font-serif text-[1.9rem] font-bold leading-tight text-fg">
            {t('search.answerTitleFor', { query: initialQuery })}
          </h1>
        )}

        {/* B3 · die Grenze benennen, zwei echte Wege */}
        <section className="mt-6 rounded-xl border border-stroke-subtle bg-surface-secondary px-6 py-5">
          <HintTitle className="text-body-md font-bold text-fg">{t('search.noAnswerTitle')}</HintTitle>
          <p className="mt-2 text-body leading-relaxed text-fg-secondary">{t('search.noAnswerBody')}</p>
          <p className="mt-3 text-body leading-relaxed text-fg-secondary">
            {t('search.humanPre')}{' '}
            <Link to={`/${locale}/contact?lane=support`} className="font-semibold text-fg-brand underline-offset-2 hover:underline">
              {t('search.humanLink')}
            </Link>{' '}
            {t('search.humanPost')}
          </p>
        </section>

        {/* D2 · die Bruecke ins Assessment direkt unter dem Hinweis */}
        <section className="mt-6 rounded-xl border border-brand/40 bg-brand-light/40 px-7 py-8 text-center">
          <h2 className="font-serif text-[1.5rem] font-bold text-fg">{t('search.bridgeTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-body text-fg-secondary">{t('search.bridgeBody')}</p>
          <Button size="lg" className="mt-6" onClick={startGuided}>
            {t('search.bridgeCta')} <ArrowRight size={16} />
          </Button>
        </section>

        {/* C2 · passende Bereiche nach Stichwort — ohne Treffer kein Block */}
        {areas.length > 0 && (
          <section className="mt-10" data-testid="search-areas">
            <h2 className="text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-tertiary">
              {t(areas.length === 1 ? 'search.areasTitleOne' : 'search.areasTitleMany')}
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {areas.map((d) => (
                <Link
                  key={d.slug}
                  to={`/${locale}/compliance/${d.slug}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-stroke bg-surface px-5 py-3.5 transition-colors hover:border-fg-brand"
                >
                  <span className="text-body-sm font-semibold text-fg">
                    {t(`register.domains.${d.i18nKey}`, { ns: 'auth', defaultValue: d.label })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-body-2xs font-semibold text-fg-brand">
                    {t('search.areaOpen')} <ArrowRight size={13} />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-body-2xs text-fg-tertiary">{t('search.areasNote')}</p>
          </section>
        )}

        {/* Follow-up guides */}
        <section className="mt-10">
          <h2 className="text-body-md font-semibold text-fg">{t('search.guidesTitle')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ENTRIES.map((g) => (
              <a key={g.key} href={`/${locale}/${g.path}`} className="group rounded-xl border border-stroke bg-surface p-4 transition-colors hover:border-fg-brand">
                <BookOpen size={18} className="text-fg-brand" />
                <p className="mt-2 text-body-sm font-semibold leading-snug text-fg">{t(`search.entries.${g.key}`)}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-body-2xs font-medium text-fg-brand">
                  {t('search.guideRead')} <ArrowRight size={13} />
                </span>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
