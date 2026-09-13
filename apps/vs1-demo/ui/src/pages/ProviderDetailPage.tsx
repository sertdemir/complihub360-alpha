import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { ApiError } from '../api/client';
import { fetchProviderDetail, type ProviderDetail } from '../api/bookings';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

// ─── Provider Detail (stage 2, monetised) — Phase-3 wiring ───────────────────
// Mirrors the Figma "Provider Detail — Anonym" screens: still-anonymous depth
// (credentials, full pricing table, availability) + the booking CTA. Opening
// this page fires the billed `provider_detail_opened` event server-side
// (deduped 1×/user/30d). Identity stays hidden until booking (spec §5).
//
// Keine Design-Fixture mehr als Rueckfall (Befund 2026-09-13): bei einem
// fehlenden Detail zeigte die Seite fuer JEDEN Schluessel dieselbe Kanzlei —
// und im Mock stuerzte sie ab. Jetzt: laedt → Anbieter → oder ehrlich
// „nicht gefunden". Ein Anbieter ist nie erfunden.

type State = { kind: 'loading' } | { kind: 'ready'; p: ProviderDetail } | { kind: 'missing' } | { kind: 'error' };

export function ProviderDetailPage() {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('results');
  const locale = i18n.resolvedLanguage || 'en';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ kind: 'loading' });
    fetchProviderDetail(key)
      .then((p) => { if (alive) setState(p ? { kind: 'ready', p } : { kind: 'missing' }); })
      .catch((err) => {
        if (!alive) return;
        setState(err instanceof ApiError && err.status === 404 ? { kind: 'missing' } : { kind: 'error' });
      });
    return () => { alive = false; };
  }, [key]);

  return (
    <div className="min-h-screen bg-surface text-fg">
      <header className="flex items-center justify-between border-b border-stroke-subtle bg-surface-secondary px-8 py-4">
        <Logo className="h-[30px] w-auto" />
        <button type="button" onClick={() => navigate(-1)} className="text-body-xs font-medium text-fg-brand hover:underline">
          ← {t('detail.back')}
        </button>
      </header>
      <main className="mx-auto max-w-[1160px] space-y-6 px-6 py-10">
        {state.kind === 'loading' && (
          <p className="text-body-sm text-fg-tertiary">{t('detail.loading')}</p>
        )}
        {(state.kind === 'missing' || state.kind === 'error') && (
          <section className="rounded-xl border border-stroke-subtle bg-surface-secondary p-8">
            <h1 className="font-serif text-[22px] font-bold leading-tight text-fg">
              {state.kind === 'missing' ? t('detail.notFoundTitle') : t('detail.errorTitle')}
            </h1>
            <p className="mt-2 max-w-[560px] text-body-sm text-fg-secondary">
              {state.kind === 'missing' ? t('detail.notFoundBody') : t('detail.errorBody')}
            </p>
            <Button className="mt-5" type="button" onClick={() => navigate(-1)}>{t('detail.back')}</Button>
          </section>
        )}
        {state.kind === 'ready' && <Detail p={state.p} onBook={() => navigate(`/${locale}/provider/${key}/schedule`)} />}
      </main>
    </div>
  );
}

function Detail({ p, onBook }: { p: ProviderDetail; onBook: () => void }) {
  const { t } = useTranslation('results');
  return (
    <>
      {/* Identity hero — anonymous */}
      <section className="rounded-xl border border-stroke-subtle bg-surface-secondary p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-[28px] font-bold leading-tight text-fg">{p.pseudonym_label}</h1>
            <p className="mt-1 text-body-xs font-medium text-fg-tertiary">
              {[p.region, p.active_since ? `${t('detail.activeSince')} ${p.active_since}` : null, p.completed_count ? `${p.completed_count} ${t('detail.mandates')}` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {p.is_verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1 text-body-2xs font-medium text-[#96802a]">
                <ShieldCheck size={13} /> {t('snapshot.verifiedPartner')}
              </span>
            )}
            {p.rating != null && <span className="text-body-xs font-semibold text-fg">★ {p.rating} · {p.completed_count ?? 0} {t('detail.mandates')}</span>}
          </div>
        </div>
        <p className="mt-4 text-body-xs text-fg-secondary">{t('detail.anonNote')}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          {/* Specializations */}
          <section className="rounded-xl border border-stroke-subtle bg-surface-secondary p-7">
            <h2 className="text-body font-semibold text-fg">{t('detail.specsTitle')}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <Badge shape="pill" tone="neutral" appearance="outline" size="lg" key={s}>{s}</Badge>
              ))}
            </div>
            <p className="mt-4 text-body-xs text-fg-tertiary">
              {[
                `${t('detail.coverage')}: ${p.countries_supported.join(' · ')}`,
                `${t('detail.languages')}: ${p.languages.join(' · ')}`,
                p.avg_response_hours != null ? t('snapshot.responseTime', { hours: p.avg_response_hours }) : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </section>
          {/* Pricing table — the stage-2 reveal */}
          <section className="rounded-xl border border-stroke-subtle bg-surface-secondary p-7">
            <h2 className="text-body font-semibold text-fg">{t('detail.pricingTitle')}</h2>
            <p className="mt-1 text-body-2xs text-fg-tertiary">{t('detail.billing')}: {t(`snapshot.billing.${p.billing_model}`)} · {t('detail.pricingSub')}</p>
            <div className="mt-4 divide-y divide-stroke-subtle">
              {(p.pricing_table ?? []).map((row) => (
                <div key={row.service} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-body-sm text-fg">{row.service}</span>
                  <span className="text-body-sm font-semibold text-fg-brand">{row.price}</span>
                </div>
              ))}
              {!p.pricing_table?.length && <p className="py-3 text-body-xs text-fg-tertiary">{t('detail.pricingOnRequest')}</p>}
            </div>
          </section>
        </div>
        {/* Booking box — all settings happen on the scheduling page */}
        <aside className="h-fit rounded-xl border border-brand bg-surface-secondary p-7 shadow-lg shadow-brand/10">
          <h2 className="text-body font-semibold text-fg">{t('detail.bookTitle')}</h2>
          <p className="mt-1 text-body-2xs text-fg-tertiary">{t('detail.bookSub')}</p>
          <Button
            size="lg"
            shape="soft"
            fullWidth
            type="button"
            onClick={onBook}
            className="mt-5 transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t('detail.bookCta')} <ArrowRight size={15} />
          </Button>
          <p className="mt-3 text-center text-body-3xs text-fg-tertiary">{t('detail.revealNote')}</p>
        </aside>
      </div>
    </>
  );
}
