import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ArrowRight, ShieldCheck, FileText, BookOpen } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { SectionEyebrow } from '../components/providers/SectionHeading';

// ─── Search-Result page · Figma 3257:1490 (L) / 3262:1518 (D) ────────────────
// Journey Station 1A "der schnelle Weg": a prose query gets a direct, sourced
// answer + relevant obligations + follow-up guides — NO risk map, NO provider
// gating. A bridge CTA hands the user into the wizard for the personalised map.
// Structure per the marketing journey; copy is placeholder (marketing report
// fills the final wording) via the 'results' namespace search.* keys.

// Placeholder answer scaffold — the real answer will come from the RAG endpoint
// once the assistant is wired here. Kept as fixtures so the page is demoable.
// The surrounding copy is now the report's final wording (Brand Map §10/§11);
// only these fixtures and the preview badge remain to be replaced.
const SOURCE_FIXTURE = ['UStG §18i (OSS)', 'EU VAT Directive 2006/112/EC', 'VerpackG §9'];
const OBLIGATION_FIXTURE = [
  { key: 'o1', severity: 'high' as const },
  { key: 'o2', severity: 'medium' as const },
  { key: 'o3', severity: 'medium' as const },
];
// Bis 20.08. standen hier drei erfundene Guide-Titel ("Das EU-OSS-Verfahren
// erklärt" …), die auf /resources verlinkten — eine Seite, die genau solche
// erfundenen Guides beim Neubau am 18.08. entfernt hatte. Wer klickte, landete
// bei drei völlig anderen Inhalten. Jetzt zeigen die Karten auf das, was es
// tatsächlich gibt, jeweils an seinem eigenen Ziel.
const ENTRIES = [
  { key: 'markets', path: 'markets' },
  { key: 'compliance', path: 'compliance' },
  { key: 'howItWorks', path: 'how-it-works' },
] as const;

// Severity here never joined the traffic light. It carried #c0392b, a red in no
// scale (2.52:1 in dark), and gold for medium — which now says the wrong thing
// twice over: gold is brand-only, and medium is yellow. These are the RiskBadge
// soft pairings, so they read 6.92/5.56 (high) and 7.45/6.96 (medium).
const SEV_TINT: Record<'high' | 'medium', string> = {
  high: 'bg-risk-high-bg text-risk-on-high',
  medium: 'bg-risk-medium-bg text-risk-on-medium',
};

export function SearchResultPage() {
  const { t } = useTranslation('results');
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

  return (
    <div className="min-h-screen bg-surface text-fg">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-stroke-subtle bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1100px] items-center justify-between px-4 md:px-8">
          <Logo lockup="horizontal" tone="on-light" href={`/${locale}`} markClassName="h-9" />
          <button type="button" onClick={startGuided} className="text-body-xs font-semibold text-fg-brand hover:underline">
            {t('search.navGuided')} →
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-4 pb-24 pt-10 md:px-8">
        {/* Query bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); runQuery(); }}
          className="flex items-center gap-2 rounded-2xl border border-stroke bg-surface p-2 shadow-[0_18px_44px_-32px_rgba(2,22,17,0.35)] focus-within:border-fg-brand"
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

        {/* Answer */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <SectionEyebrow tone="brand">{t('search.answerEyebrow')}</SectionEyebrow>
            {/* The answer prose is final report copy, but the RAG endpoint is not
                wired up yet — so the page has to say so. This used to be a
                "[Placeholder answer]" prefix inside the prose itself; as a badge
                the admission stays visible without living in shippable copy. */}
            <span className="rounded-full border border-stroke-subtle px-2.5 py-0.5 text-body-3xs font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
              {t('search.previewBadge')}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-[1.9rem] font-bold leading-tight text-fg">
            {initialQuery ? t('search.answerTitleFor', { query: initialQuery }) : t('search.answerTitleDefault')}
          </h1>
          <p className="mt-4 text-body leading-relaxed text-fg-secondary">{t('search.answerBody1')}</p>
          <p className="mt-3 text-body leading-relaxed text-fg-secondary">{t('search.answerBody2')}</p>
          {/* Sources */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-body-2xs font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('search.sources')}:</span>
            {SOURCE_FIXTURE.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-stroke-subtle px-3 py-1 text-body-2xs text-fg-secondary">
                <FileText size={12} /> {s}
              </span>
            ))}
          </div>
        </section>

        {/* Relevant obligations */}
        <section className="mt-12">
          <h2 className="text-body-md font-semibold text-fg">{t('search.obligationsTitle')}</h2>
          <div className="mt-4 space-y-2.5">
            {OBLIGATION_FIXTURE.map((o) => (
              <div key={o.key} className="flex items-start gap-4 rounded-xl border border-stroke bg-surface-secondary/40 px-5 py-4">
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-body-3xs font-semibold ${SEV_TINT[o.severity]}`}>
                  <ShieldCheck size={12} /> {t(`search.sev.${o.severity}`)}
                </span>
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-fg">{t(`search.obligations.${o.key}.title`)}</p>
                  <p className="mt-0.5 text-body-xs leading-relaxed text-fg-secondary">{t(`search.obligations.${o.key}.detail`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Follow-up guides */}
        <section className="mt-12">
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

        {/* Bridge CTA → wizard */}
        <section className="mt-14 rounded-2xl border border-brand/40 bg-brand-light/40 px-7 py-8 text-center">
          <h2 className="font-serif text-[1.5rem] font-bold text-fg">{t('search.bridgeTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-body text-fg-secondary">{t('search.bridgeBody')}</p>
          <Button size="lg" className="mt-6" onClick={startGuided}>
            {t('search.bridgeCta')} <ArrowRight size={16} />
          </Button>
        </section>
      </main>
    </div>
  );
}
