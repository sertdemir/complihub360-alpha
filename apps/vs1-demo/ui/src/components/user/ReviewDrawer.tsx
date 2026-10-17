import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { FilterChip } from '../ui/Badge';
import { TechnicalDetails } from '../results/RiskMapState';
import { submitReview, reviewFailureFrom } from '../../api/bookings';
import { focusField } from '../ui/FormErrorSummary';
import { FieldError, errorAria } from '../ui/FieldError';

// ─── ReviewDrawer ────────────────────────────────────────────────────────────
// Post-appointment review (notifications-alerts-concept §2): stars + category
// chips + optional text. user→provider ratings feed the provider quality score
// and the verified reviews on the anonymous card/detail page. Triggered from
// the Termine page (T+2h nudge lands in the notifications feed).
//
// Punkt 1 (Canvas-Wahl R3 · S2 · E1 · C3, 15.10.2026; Figma 3740:4375):
// Vorher zeigte der Drawer „✓ Submitted“, BEVOR der Server antwortete, und
// markierte den Termin auch dann als bewertet, wenn das Speichern scheiterte
// — falsche Beruhigung. Jetzt: erst die Antwort, dann der Zustand.
//   R3 · Fehler: Drawer bleibt offen, alle Eingaben bleiben, Hinweis
//        (role=alert) ueber der Knopfzeile, der Hauptknopf heisst „Try Again“.
//   S2 · Erfolg: Bestaetigung im Drawer mit Zusammenfassung, schliessen per
//        „Close“ — nichts verschwindet von selbst.
//   E1 · 409 ALREADY_REVIEWED / BOOKING_NOT_HELD: neutraler Hinweis statt
//        Fehler, nur „Close“ (ein neuer Versuch aenderte nichts).
// onSubmitted feuert nur, wenn die Bewertung beim Server liegt.

export interface ReviewTarget {
  bookingId: string;
  providerName: string;
}

const CATEGORIES = ['expertise', 'responsiveness', 'value'] as const;

export function ReviewDrawer({ target, onClose, onSubmitted }: {
  target: ReviewTarget | null;
  onClose: () => void;
  onSubmitted?: (bookingId: string) => void;
}) {
  const { t } = useTranslation('userws');
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'failed' | 'done' | 'already' | 'notHeld'>('idle');
  const [reference, setReference] = useState<{ id: string; at: string } | null>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  // Regel V2 (11.10.2026): "Absenden" bleibt aktiv. Pflicht ist nur die
  // Bewertung — fehlt sie, steht der Satz an den Sternen und der Fokus dort.
  const [tried, setTried] = useState(false);
  const ratingError = tried && rating < 1 ? t('review.ratingRequired') : null;

  const reset = () => { setRating(0); setCats(new Set()); setBody(''); setState('idle'); setTried(false); setReference(null); };
  const close = () => { reset(); onClose(); };

  // S2: die Bestaetigung bekommt den Fokus, damit sie angesagt wird.
  useEffect(() => { if (state === 'done') doneHeading.current?.focus(); }, [state]);

  const submit = async () => {
    if (!target || state === 'sending') return;
    if (rating < 1) { setTried(true); focusField('review-rating'); return; }
    setState('sending');
    try {
      await submitReview({
        // Der Server liest den Anbieter aus der Buchung — der Browser kennt
        // seit Phase 3 keinen Schluessel mehr.
        bookingId: target.bookingId,
        fromRole: 'user',
        rating,
        categories: [...cats],
        body: body.trim() || undefined,
      });
      setState('done');
      onSubmitted?.(target.bookingId);
    } catch (err) {
      const f = reviewFailureFrom(err);
      if (f.kind === 'already_reviewed') {
        // Die Bewertung liegt schon beim Server — die Karte darf das sagen.
        setState('already');
        onSubmitted?.(target.bookingId);
      } else if (f.kind === 'not_held') {
        setState('notHeld');
      } else {
        setReference(f.reference);
        setState('failed');
      }
    }
  };

  const finished = state === 'done' || state === 'already' || state === 'notHeld';

  return (
    <Drawer open={!!target} onClose={close} eyebrow={t('review.eyebrow')} title={target?.providerName ?? ''}
      footer={
        finished ? (
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={close}>{t('review.close')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {state === 'failed' && (
              <div role="alert" className="space-y-1">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-error-700 dark:text-red-300">
                  <AlertCircle size={14} aria-hidden="true" />{t('review.sendFailed.heading')}
                </p>
                <p className="text-[12px] leading-relaxed text-fg-secondary">{t('review.sendFailed.message')}</p>
              </div>
            )}
            {/* flex-wrap: auf schmalen Schirmen rutschen die Knoepfe unter
                „Technical details“, statt die Beschriftung umzubrechen. */}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {state === 'failed' && <div className="mr-auto shrink-0 whitespace-nowrap"><TechnicalDetails reference={reference} /></div>}
              <div className="flex items-center gap-2.5">
                <Button size="sm" variant="ghost" onClick={close}>{t('review.cancel')}</Button>
                <Button size="sm" onClick={submit} disabled={state === 'sending'}>
                  {state === 'sending' ? '…' : state === 'failed' ? t('common:states.actions.tryAgain') : t('review.submit')}
                </Button>
              </div>
            </div>
          </div>
        )
      }
    >
      {state === 'done' ? (
        <div role="status" className="space-y-3 pt-2">
          <CheckCircle2 size={40} strokeWidth={1.75} className="text-fg-brand" aria-hidden="true" />
          <h3 ref={doneHeading} tabIndex={-1} className="text-[18px] font-semibold text-fg focus:outline-none">{t('review.submitted.heading')}</h3>
          <p className="text-[13px] leading-relaxed text-fg-secondary">{t('review.submitted.message')}</p>
          <div className="space-y-2 rounded-xl border border-stroke bg-surface-secondary px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('review.ratingLabel')}</span>
              <span className="text-[15px] tracking-[2px]" aria-label={`${rating}/5`}>
                <span className="text-fg-brand">{'★'.repeat(rating)}</span><span className="text-fg-tertiary/40">{'★'.repeat(5 - rating)}</span>
              </span>
            </div>
            {cats.size > 0 && <p className="text-[12px] text-fg">{[...cats].map((c) => t(`review.cat.${c}`)).join(' · ')}</p>}
            {body.trim() && <p className="text-[12px] leading-relaxed text-fg-secondary">“{body.trim()}”</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {(state === 'already' || state === 'notHeld') && (
            <div role="status" className="flex gap-2.5 rounded-[10px] border border-brand/40 bg-brand-light px-3.5 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-fg">{t(state === 'already' ? 'review.alreadyReviewed.heading' : 'review.notHeld.heading')}</p>
                <p className="text-[12px] leading-relaxed text-fg-secondary">{t(state === 'already' ? 'review.alreadyReviewed.message' : 'review.notHeld.message')}</p>
              </div>
            </div>
          )}
          {state !== 'notHeld' && (
            // E1: bei „schon bewertet“ bleibt das Formular als Kontext stehen,
            // gesperrt; „nicht stattgefunden“ zeigt nur den Hinweis.
            <fieldset disabled={state === 'already'} className={'min-w-0 space-y-5 border-0 p-0' + (state === 'already' ? ' opacity-40' : '')}>
              <div>
                <p id="review-rating-label" className="mb-2 text-[12px] font-medium text-fg-secondary">{t('review.ratingLabel')}</p>
                <div id="review-rating" role="group" aria-labelledby="review-rating-label" className="flex items-center gap-1.5" {...errorAria('review-rating', !!ratingError)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n}`} aria-pressed={n <= rating} onClick={() => setRating(n)}
                      className={`text-[26px] leading-none transition-colors ${n <= rating ? 'text-fg-brand' : 'text-fg-tertiary/40 hover:text-fg-tertiary'}`}>
                      ★
                    </button>
                  ))}
                  {rating > 0 && <span className="ml-2 text-[13px] text-fg-secondary">{rating}/5</span>}
                </div>
                <FieldError id="review-rating" message={ratingError} alert />
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('review.categoriesLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <FilterChip key={c} size="sm" selected={cats.has(c)}
                      onClick={() => setCats((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; })}>
                      {t(`review.cat.${c}`)}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="review-body" className="mb-2 block text-[12px] font-medium text-fg-secondary">{t('review.bodyLabel')}</label>
                <textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={t('review.bodyPh')}
                  className="w-full rounded-lg border border-stroke bg-transparent px-3.5 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-focus" />
              </div>
              {state !== 'already' && <p className="text-[11px] leading-relaxed text-fg-tertiary">{t('review.note')}</p>}
            </fieldset>
          )}
        </div>
      )}
    </Drawer>
  );
}
