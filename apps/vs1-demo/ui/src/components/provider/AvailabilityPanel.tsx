import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { fetchCoverage, updateAvailabilityHours, WEEKDAYS, type AvailabilityHours, type AvailabilityWindow, type Weekday } from '../../api/provider';

// ─── Partner-Einstellungen · Buchbare Zeiten ─────────────────────────────────
// Phase 6 (ADR-0009 Nr. 6, Canvas-Wahl 3B „Je Wochentag ein Fenster, als
// Zeit-Felder", 10.10.2026). Figma: Seite „Performance & Übersicht (Phase 6)",
// 3669:219.
//
// Sieben Zeilen, je bis zu drei Fenster „von–bis" im 30-Minuten-Raster, in
// der Zeitzone des Anbieters. Genau die Information, die der Slot-Generator
// braucht (availability_hours + timezone), nicht mehr. Nylas bleibt der eine
// Kalender und zieht die Belegung ab; Ausnahmen fuer einzelne Tage gehoeren
// dorthin. „Abwesend" bleibt der Umschalter oben in der Shell.
//
// Ohne gespeicherte Fenster gilt die bisherige Vorgabe (Mo–Fr 9–11:30 und
// 14–15 Uhr) — sie steht hier vorbelegt, damit der Anbieter sieht, was gilt.

const DEFAULT_HOURS: AvailabilityHours = {
  mon: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:00' }],
  tue: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:00' }],
  wed: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:00' }],
  thu: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:00' }],
  fri: [{ from: '09:00', to: '11:30' }, { from: '14:00', to: '15:00' }],
};

/** 00:00 … 23:30 im 30-Minuten-Raster. */
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

const TIMEZONES = ['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Paris', 'Europe/Madrid', 'Europe/Lisbon', 'Europe/Rome', 'Europe/Warsaw', 'Europe/Prague', 'Europe/Stockholm', 'Europe/Copenhagen', 'Europe/Oslo', 'Europe/Helsinki', 'Europe/Dublin', 'Europe/London', 'Europe/Istanbul', 'Europe/Athens', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore'];

const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h! * 60 + m!; };

/** Ein Tag ist gueltig, wenn jedes Fenster von < bis ist und keines ins naechste reicht. */
function dayValid(w: AvailabilityWindow[]): boolean {
  const sorted = [...w].sort((a, b) => mins(a.from) - mins(b.from));
  return sorted.every((x, i) => mins(x.from) < mins(x.to) && (i === 0 || mins(sorted[i - 1]!.to) <= mins(x.from)));
}

export function AvailabilityPanel() {
  const { t } = useTranslation('providerws');
  const [hours, setHours] = useState<AvailabilityHours>(DEFAULT_HOURS);
  const [timezone, setTimezone] = useState('Europe/Berlin');
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  useEffect(() => {
    setLoadFailed(false);
    fetchCoverage().then((c) => {
      if (c.availability_hours && Object.keys(c.availability_hours).length) setHours(c.availability_hours);
      if (c.timezone) setTimezone(c.timezone);
      setLoaded(true);
    }).catch(() => setLoadFailed(true));
  }, [attempt]);

  const invalid = useMemo(() => WEEKDAYS.filter((d) => !dayValid(hours[d] ?? [])), [hours]);
  const localTz = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } }, []);
  const tzOptions = useMemo(() => Array.from(new Set([timezone, ...(localTz ? [localTz] : []), ...TIMEZONES])), [timezone, localTz]);

  const setWindow = (d: Weekday, i: number, patch: Partial<AvailabilityWindow>) =>
    setHours((h) => ({ ...h, [d]: (h[d] ?? []).map((w, j) => (j === i ? { ...w, ...patch } : w)) }));
  const addWindow = (d: Weekday) => setHours((h) => {
    const cur = h[d] ?? [];
    const last = cur[cur.length - 1];
    const from = last ? TIMES[Math.min(46, TIMES.indexOf(last.to) + 2)]! : '09:00';
    const to = TIMES[Math.min(47, TIMES.indexOf(from) + 4)]!;
    return { ...h, [d]: [...cur, { from, to }] };
  });
  const removeWindow = (d: Weekday, i: number) => setHours((h) => ({ ...h, [d]: (h[d] ?? []).filter((_, j) => j !== i) }));

  const save = async () => {
    setSaved('saving');
    try {
      const clean: AvailabilityHours = {};
      for (const d of WEEKDAYS) if (hours[d]?.length) clean[d] = hours[d];
      const r = await updateAvailabilityHours(clean, timezone);
      if (r.hours && Object.keys(r.hours).length) setHours(r.hours);
      setSaved('done'); setTimeout(() => setSaved('idle'), 2000);
    } catch { setSaved('error'); }
  };

  return (
    <Card styleVariant="outlined" className="space-y-4 p-5" data-testid="availability-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[560px]">
          <h2 className="text-[15px] font-semibold text-fg">{t('settings.availability.title')}</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-fg-tertiary">{t('settings.availability.sub')}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('settings.availability.timezone')}</span>
          <Select inputSize="sm" value={timezone} onChange={(e) => setTimezone(e.target.value)} aria-label={t('settings.availability.timezone')}>
            {tzOptions.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        </label>
      </div>

      <div className="divide-y divide-stroke">
        {WEEKDAYS.map((d) => {
          const w = hours[d] ?? [];
          const bad = invalid.includes(d);
          return (
            <div key={d} className="flex flex-wrap items-center gap-2 py-2" data-weekday={d} data-invalid={bad || undefined}>
              <span className={'w-9 shrink-0 text-[13px] font-semibold ' + (w.length ? 'text-fg' : 'text-fg-tertiary')}>{t(`settings.availability.weekday.${d}`)}</span>
              {w.length === 0 && <span className="text-[12px] text-fg-tertiary">{t('settings.availability.notBookable')}</span>}
              {w.map((win, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[11px] text-fg-tertiary">{t('settings.availability.and')}</span>}
                  <Select inputSize="sm" value={win.from} onChange={(e) => setWindow(d, i, { from: e.target.value })} aria-label={t('settings.availability.from')}>
                    {TIMES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </Select>
                  <span className="text-[11px] text-fg-tertiary">{t('settings.availability.to')}</span>
                  <Select inputSize="sm" value={win.to} onChange={(e) => setWindow(d, i, { to: e.target.value })} aria-label={t('settings.availability.to')}>
                    {TIMES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </Select>
                  <button type="button" aria-label={t('settings.availability.remove')} className="px-1 text-fg-tertiary hover:text-fg" onClick={() => removeWindow(d, i)}>✕</button>
                </span>
              ))}
              {w.length < 3 && (
                <button type="button" className="text-[12px] font-medium text-fg-brand hover:underline" onClick={() => addWindow(d)}>{t('settings.availability.addWindow')}</button>
              )}
              {bad && <span className="basis-full text-[11px] text-error-500">{t('settings.availability.invalid')}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-[11px] leading-relaxed text-fg-tertiary">{t('settings.availability.note')}</p>
        <div className="flex items-center gap-3">
          {saved === 'done' && <span className="text-[12px] text-fg-brand">{t('settings.availability.saved')}</span>}
          {saved === 'error' && <span className="text-[12px] text-error-500">{t('settings.availability.saveFailed')}</span>}
          {loadFailed && (
            <>
              <span className="text-[12px] text-fg-secondary">{t('common:states.partner.profileUnavailable')}</span>
              <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>{t('common:states.actions.tryAgain')}</Button>
            </>
          )}
          <Button size="sm" onClick={save} disabled={!loaded || invalid.length > 0 || saved === 'saving'}>{t('settings.availability.save')}</Button>
        </div>
      </div>
    </Card>
  );
}
