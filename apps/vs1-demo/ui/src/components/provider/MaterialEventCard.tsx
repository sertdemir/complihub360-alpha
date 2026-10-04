import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Radio } from '../ui/Radio';
import { Checkbox } from '../ui/Checkbox';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FormField } from '../ui/FormField';
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
  const [done, setDone] = useState<string | null>(null);

  const countries = (s: MatrixRow) => s.cells.filter((c) => c.status === 'approved' || c.status === 'limited').map((c) => c.country_code).join(', ');
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!event) { setErr(t('verification.materialEvent.pickEvent')); return; }
    setBusy(true); setErr(null);
    try {
      const r = await reportMaterialEvent({ event_type: event, occurred_on: since, service_ids: picked, note: note.trim() || undefined });
      setDone(r.paused_service_ids.length ? t('verification.materialEvent.done', { count: r.paused_service_ids.length }) : t('verification.materialEvent.doneNone'));
      setOpen(false); setEvent(null); setPicked([]); setNote('');
      await onReported();
    } catch (e) { setErr(e instanceof Error ? e.message : t('application.saveError')); }
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
          <fieldset className="flex flex-col items-start gap-2">
            <legend className="mb-1 text-[12px] font-medium text-fg-secondary">{t('verification.materialEvent.what')}</legend>
            {MATERIAL_EVENTS.map((e) => (
              <Radio key={e} name="material-event" size="sm" checked={event === e} onChange={() => setEvent(e)} label={t(`verification.materialEvent.events.${e}`)} />
            ))}
          </fieldset>
          <FormField label={t('verification.materialEvent.since')} className="max-w-[220px]">
            <Input inputSize="sm" type="date" max={today} value={since} onChange={(ev) => setSince(ev.target.value)} lang={locale} />
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
          {err && <p className="text-[12px] text-error-500">{err}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !event} onClick={submit}>{picked.length ? t('verification.materialEvent.submit') : t('verification.materialEvent.submitNone')}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>{t('verification.materialEvent.cancel')}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
