import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { fetchSlots, rescheduleBooking, rescheduleFailureFrom, type RescheduleFailure } from '../../api/bookings';

// ─── RescheduleDrawer ────────────────────────────────────────────────────────
// "Verschieben" on the Termine page: pick a new slot from the provider's free
// slots (GET /provider/:key/slots) and move the SAME lead via
// PATCH /scheduling/:id {slot_start} — no second lead fee. Mirrors the
// ReviewDrawer mechanics; slot grouping mirrors the ProviderSchedulePage.

export interface RescheduleTarget {
  bookingId: string;
  /** Opaker Anbieter-Bezeichner (Phase 3) — fuer die Terminliste. */
  publicRef: string;
  providerName: string;
  currentLine: string;   // "Mo, 12. Aug 2026 · 10:00" — shown as context
  /** Phase 5: Neubuchung in der Frist nach No-Show oder Plattformfehler —
   *  derselbe Aufruf, aber der Server legt eine NEUE Buchung am alten Lead an.
   *  Die Schublade spricht dann von "neu buchen", nicht von "verschieben". */
  rebook?: boolean;
}

// Deterministic fixture (demo mode): next 3 business days, 4 slots each.
function fixtureSlots(): string[] {
  const out: string[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  while (out.length < 12) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    for (const [h, m] of [[9, 0], [10, 30], [14, 0], [15, 30]] as const) {
      const s = new Date(d); s.setHours(h, m, 0, 0);
      out.push(s.toISOString());
    }
  }
  return out;
}

export function RescheduleDrawer({ target, onClose, onRescheduled }: {
  target: RescheduleTarget | null;
  onClose: () => void;
  /** Bei einer Neubuchung (Phase 5) ist `newBookingId` die neue Zeile. */
  onRescheduled?: (bookingId: string, newSlotIso: string, newBookingId?: string) => void;
}) {
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  // Phase 5: ein Umbuchungslimit (409 RESCHEDULE_LIMIT) oder ein inzwischen
  // vergebener Slot ist eine Antwort, kein stilles "Verschoben ✓".
  const [failure, setFailure] = useState<RescheduleFailure | null>(null);

  useEffect(() => {
    if (!target) return;
    setSelected(null); setState('idle'); setFailure(null);
    fetchSlots(target.publicRef).then(setSlots).catch(() => setSlots(fixtureSlots()));
  }, [target]);

  const df = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }), [locale]);
  const tf = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const iso of slots) {
      const day = df.format(new Date(iso));
      m.set(day, [...(m.get(day) ?? []), iso]);
    }
    return [...m.entries()].slice(0, 5);
  }, [slots, df]);

  const confirm = async () => {
    if (!target || !selected) return;
    setState('sending'); setFailure(null);
    let newId: string | undefined;
    try {
      const r = await rescheduleBooking(target.bookingId, selected);
      if (r.rebooked_from && r.id) newId = r.id;
    } catch (err) {
      setFailure(rescheduleFailureFrom(err));
      setState('idle');
      return;
    }
    setState('done');
    setTimeout(() => { onRescheduled?.(target.bookingId, selected, newId); onClose(); }, 900);
  };
  const rebook = !!target?.rebook;

  return (
    <Drawer open={!!target} onClose={onClose} eyebrow={t(rebook ? 'reschedule.rebookEyebrow' : 'reschedule.eyebrow')} title={target?.providerName ?? ''}
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button size="sm" variant="ghost" onClick={onClose}>{t('reschedule.cancel')}</Button>
          <Button size="sm" onClick={confirm} disabled={!selected || state === 'sending' || state === 'done'}>
            {state === 'done' ? t(rebook ? 'reschedule.rebookDone' : 'reschedule.done') : t(rebook ? 'reschedule.rebookConfirm' : 'reschedule.confirm')}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-[12px] text-fg-secondary">
          {t('reschedule.currentLabel')}: <span className="font-medium text-fg">{target?.currentLine}</span>
        </p>
        <div>
          <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('reschedule.pickLabel')}</p>
          {byDay.length === 0 ? (
            <p className="text-[13px] text-fg-tertiary">{t('reschedule.noSlots')}</p>
          ) : byDay.map(([day, isos]) => (
            <div key={day} className="mb-4">
              <p className="mb-1.5 text-[12px] font-semibold text-fg">{day}</p>
              <div className="flex flex-wrap gap-2">
                {isos.map((iso) => (
                  <button key={iso} type="button" onClick={() => setSelected(iso)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                      selected === iso
                        ? 'border-brand bg-brand/15 font-semibold text-fg-brand'
                        : 'border-stroke text-fg-secondary hover:border-brand/50 hover:text-fg'
                    }`}>
                    {tf.format(new Date(iso))}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {failure && (
          <p role="alert" className="rounded-lg border border-stroke bg-surface-secondary px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg">
            {t(failure === 'limit' ? 'reschedule.limit' : failure === 'slot_taken' ? 'reschedule.slotTaken' : 'reschedule.failed')}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-fg-tertiary">{t(rebook ? 'reschedule.rebookNote' : 'reschedule.note')}</p>
      </div>
    </Drawer>
  );
}
