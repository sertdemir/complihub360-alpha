import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { FilterChip } from '../ui/Badge';
import { submitReview } from '../../api/bookings';

// ─── ReviewDrawer ────────────────────────────────────────────────────────────
// Post-appointment review (notifications-alerts-concept §2): stars + category
// chips + optional text. user→provider ratings feed the provider quality score
// and the verified reviews on the anonymous card/detail page. Triggered from
// the Termine page (T+2h nudge lands in the notifications feed).

export interface ReviewTarget {
  bookingId: string;
  providerKey: string;
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
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  const reset = () => { setRating(0); setCats(new Set()); setBody(''); setState('idle'); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!target || rating < 1) return;
    setState('sending');
    submitReview({
      bookingId: target.bookingId,
      providerKey: target.providerKey,
      fromRole: 'user',
      rating,
      categories: [...cats],
      body: body.trim() || undefined,
    }).catch(() => {});
    setState('done');
    setTimeout(() => { onSubmitted?.(target.bookingId); close(); }, 900);
  };

  return (
    <Drawer open={!!target} onClose={close} eyebrow={t('review.eyebrow')} title={target?.providerName ?? ''} forceDark
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button size="sm" variant="ghost" onClick={close}>{t('review.cancel')}</Button>
          <Button size="sm" onClick={submit} disabled={rating < 1 || state !== 'idle'}>
            {state === 'done' ? t('review.done') : t('review.submit')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('review.ratingLabel')}</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n}`} onClick={() => setRating(n)}
                className={`text-[26px] leading-none transition-colors ${n <= rating ? 'text-[#d4af37]' : 'text-white/20 hover:text-white/40'}`}>
                ★
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-[13px] text-fg-secondary">{rating}/5</span>}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('review.categoriesLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <FilterChip key={c} size="sm" selected={cats.has(c)}
                onClick={() => setCats((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; })}>
                {t(`review.cat.${c}`)}
              </FilterChip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('review.bodyLabel')}</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={t('review.bodyPh')}
            className="w-full rounded-lg border border-stroke bg-transparent px-3.5 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-focus" />
        </div>
        <p className="text-[11px] leading-relaxed text-fg-tertiary">{t('review.note')}</p>
      </div>
    </Drawer>
  );
}
