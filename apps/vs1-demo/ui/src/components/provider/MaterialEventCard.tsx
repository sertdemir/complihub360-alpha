import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Radio } from '../ui/Radio';
import { Checkbox } from '../ui/Checkbox';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FormField } from '../ui/FormField';
import { ApiError } from '../../api/client';
import { FieldError, errorAria } from '../ui/FieldError';
import { focusField } from '../ui/FormErrorSummary';
import { MATERIAL_EVENTS, reportMaterialEvent, type MaterialEvent, type MatrixRow } from '../../api/application';

// ─── Wesentliche Änderung melden (Canvas D V2, Spec A §18) ───────────────────
// Ruhige Karte auf der Verifizierungsseite. Der Partner nennt Ereignis,
// Datum und betroffene Leistungen; nur die gewaehlten pausieren (granular wie
// die Freigabe, §28). Kein Ton der Drohung: wer meldet, handelt richtig.
// Keine Leistung zu waehlen ist erlaubt — ein nicht haltbarer Termin
// pausiert nichts, das Pruefteam meldet sich.

export function MaterialEventCard({ services, onReported }: { services: MatrixRow[]; onReported: () => void | Promise<void> }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const today = new Date().toISOString().slice(0, 10);
  const pausable = services.filter((s) => s.status === 'approved' || s.status === 'limited');
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<MaterialEvent | null>(null);
  const [since, setSince] = useState(today);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // V2 (11.10.2026): das Ereignis ist das eine Pflichtfeld. Der Knopf bleibt
  // aktiv; fehlt die Wahl, steht der Satz an der Gruppe und der Fokus geht
  // aufs erste Ereignis. Bis hierher war der Knopf grau und der Satz
  // `pickEvent` konnte nie erscheinen.
  const [eventError, setEventError] = useState(false);
  // Ein Datum, das der Server ablehnt (leer oder in der Zukunft), steht am Datum.
  const [dateError, setDateError] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const countries = (s: MatrixRow) => s.cells.filter((c) => c.status === 'approved' || c.status === 'limited').map((c) => c.country_code).join(', ');
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (busy) return;
    if (!event) { setEventError(true); focusField('material-event'); return; }
    setBusy(true); setErr(null); setDateError(false);
    try {
      const r = await reportMaterialEvent({ event_type: event, occurred_on: since, service_ids: picked, note: note.trim() || undefined });
      setDone(r.paused_service_ids.length ? t('verification.materialEvent.done', { count: r.paused_service_ids.length }) : t('verification.materialEvent.doneNone'));
      setOpen(false); setEvent(null); setPicked([]); setNote('');
      await onReported();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && /occurred_on/.test(e.message)) { setDateError(true); focusField('material-since'); }
      else setErr(e instanceof Error ? e.message : t('application.saveError'));
    }
    finally { setBusy(false); }
  };

  return (
    <Card styleVariant="outlined" className="space-y-3 p-5">
      <h2 className="text-[15px] font-semibold text-fg">{t('verification.materialEvent.title')}</h2>
      <p className="max-w-3xl text-[12.5px] leading-relaxed text-fg-secondary">{t('verification.materialEvent.intro')}</p>
      {done && <p className="text-[12.5px] text-fg-secondary">{done}</p>}
      {!open ? (
        <Button size="sm" variant="secondary" onClick={() => { setDone(null); setOpen(true); }}>{t('verification.materialEvent.open')}</Button>
      ) : (
        <div className="space-y-4">
          <fieldset id="material-event" className="flex flex-col items-start gap-2" aria-describedby={eventError ? 'material-event-error' : undefined}>
            <legend className="mb-1 text-[12px] font-medium text-fg-secondary">{t('verification.materialEvent.what')}</legend>
            {MATERIAL_EVENTS.map((e) => (
              <Radio key={e} name="material-event" size="sm" checked={event === e} error={eventError}
                onChange={() => { setEvent(e); setEventError(false); }} label={t(`verification.materialEvent.events.${e}`)} />
            ))}
            <FieldError id="material-event" alert message={eventError ? t('verification.materialEvent.pickEvent') : null} />
          </fieldset>
          <FormField label={t('verification.materialEvent.since')} htmlFor="material-since" className="max-w-[220px]">
            <Input id="material-since" inputSize="sm" type="date" max={today} value={since} lang={locale} error={dateError}
              onChange={(ev) => { setSince(ev.target.value); setDateError(false); }} {...errorAria('material-since', dateError)} />
            <FieldError id="material-since" alert message={dateError ? t('verification.materialEvent.dateInvalid') : null} />
          </FormField>
          {pausable.length > 0 && (
            <fieldset className="flex flex-col items-start gap-2">
              <legend className="mb-1 text-[12px] font-medium text-fg-secondary">{t('verification.materialEvent.services')}</legend>
              {pausable.map((s) => (
                <Checkbox key={s.service_id} size="sm" checked={picked.includes(s.service_id)} onChange={() => toggle(s.service_id)} label={`${s.service_name}${countries(s) ? ` · ${countries(s)}` : ''}`} />
              ))}
            </fieldset>
          )}
          <FormField label={t('verification.materialEvent.note')}>
            <Textarea inputSize="sm" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <p className="rounded-md bg-surface-secondary px-3 py-2.5 text-[12.5px] leading-relaxed text-fg-secondary">
            {picked.length ? t('verification.materialEvent.effect') : t('verification.materialEvent.effectNone')} {t('verification.materialEvent.thanks')}
          </p>
          {err && <p role="alert" className="text-[12px] text-error-700 dark:text-red-300">{err}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={submit}>{picked.length ? t('verification.materialEvent.submit') : t('verification.materialEvent.submitNone')}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setOpen(false); setEventError(false); setDateError(false); setErr(null); }}>{t('verification.materialEvent.cancel')}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
