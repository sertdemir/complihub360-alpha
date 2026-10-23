import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, X } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { STEPS, MARKET_CODE, selectionFromProfile, buildProfile } from '../home/AnimatedWizard';
import type { SearchProfile } from '../wizard/WizardContext';
import { updateSessionAnswers } from '../../api/sessions';
import { FormErrorSummary, focusField, type FormError } from '../ui/FormErrorSummary';
import { FieldError } from '../ui/FieldError';

// ─── Antworten bearbeiten — Akkordeon in der Schublade ───────────────────────
// Canvas "Antworten bearbeiten", Nutzer-Wahl 1B + 2B (2026-09-05):
//   1B  Drei aufklappbare Schritte (Maerkte · Taetigkeit · Compliance-Bereiche).
//       Zugeklappt zeigt jeder Schritt seine Antwort als Chips, aufgeklappt eine
//       kompakte Chip-Auswahl. Man oeffnet nur, was man aendern will.
//   2B  Speichern schreibt die Antworten in DIESE Sitzung (PATCH answers), die
//       Ergebnisseite rechnet neu. Wer eine Variante will, kopiert vorher —
//       "Als Variante kopieren" oeffnet diese Schublade auf der Kopie.
// Die Schublade hat eine FESTE Hoehe (Nutzer-Vorgabe): Auf-/Zuklappen darf
// das Panel nicht wachsen lassen, der Inhalt scrollt innen.
//
// Nur fuer eingeloggte Nutzer mit gespeicherter Sitzung. Der Erst-Wizard
// (vier Schritte, grosse Karten) bleibt fuer die neue Suche unveraendert.
// Kompromiss aus dem Canvas: die Kartentexte der Vollansicht fallen weg;
// weitere Maerkte aus der Markt-Schublade bleiben als Chips abwaehlbar, neue
// lassen sich hier nicht hinzufuegen (dafuer der Erst-Wizard).

type StepKey = 'markets' | 'operations' | 'domains';
const ORDER: StepKey[] = ['markets', 'operations', 'domains'];
const REVIEW_KEY: Record<StepKey, string> = { markets: 'markets', operations: 'operations', domains: 'domains' };

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function AnswersDrawer({ open, onClose, sessionId, sessionLabel, profile, onSaved }: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionLabel: string;
  /** Die gespeicherten Antworten der Sitzung — vorbefuellt die Chips. */
  profile: Partial<SearchProfile>;
  /** Nach erfolgreichem Speichern: der Aufrufer laedt die Ergebnisse neu. */
  onSaved: () => void;
}) {
  const { t } = useTranslation('userws');
  const { t: th } = useTranslation('home');

  // Ausgangsstand aus dem Profil — derselbe Weg, den der Wizard fuer
  // "Refine existing" nimmt, damit beide dieselben Karten treffen.
  const initial = useMemo(() => {
    const full: SearchProfile = {
      country: '', markets: [], categories: [], businessType: '', businessTypeNote: '', marketScope: '',
      riskSignals: [], revenueBand: '', intent: '', urgency: '', note: '', existingProvider: null,
      ...profile,
    };
    return { full, ...selectionFromProfile(full) };
  }, [profile]);

  const [selected, setSelected] = useState<Set<string>>(initial.selected);
  const [extra, setExtra] = useState<string[]>(initial.extraMarkets);
  const [openStep, setOpenStep] = useState<StepKey | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  // Regel V2 (11.10.2026): "Speichern" bleibt aktiv, sobald es etwas zu
  // speichern gibt (ohne Aenderung bleibt er aus — das ist kein Pruefergebnis,
  // sondern nichts zu tun). Fehlt ein Markt oder ein Bereich, steht der Satz
  // am Schritt und gesammelt ueber dem Knopf; der Fokus geht auf den ersten
  // betroffenen Schritt, der sich dafuer oeffnet.
  const [tried, setTried] = useState(false);

  // Jedes Oeffnen startet frisch vom gespeicherten Stand — nichts bleibt
  // unbemerkt aus einer frueheren Runde haengen.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(initial.selected));
    setExtra(initial.extraMarkets);
    setOpenStep(null);
    setState('idle');
    setTried(false);
  }, [open, initial]);

  const stepIds = (k: StepKey) => STEPS[ORDER.indexOf(k)].cards.filter((c) => c.id !== 'Others').map((c) => c.id);
  const picked = (k: StepKey) => new Set(stepIds(k).filter((id) => selected.has(id)));
  const pickedInitial = (k: StepKey) => new Set(stepIds(k).filter((id) => initial.selected.has(id)));
  const extraChanged = extra.length !== initial.extraMarkets.length || extra.some((m) => !initial.extraMarkets.includes(m));
  const changedSteps = ORDER.filter((k) => !sameSet(picked(k), pickedInitial(k)) || (k === 'markets' && extraChanged));
  const changes = changedSteps.length;

  const hasMarkets = picked('markets').size + extra.length > 0;
  const hasDomains = picked('domains').size > 0;
  const missing: StepKey[] = [...(!hasMarkets ? ['markets' as const] : []), ...(!hasDomains ? ['domains' as const] : [])];
  const errors: FormError[] = tried
    ? missing.map((k) => ({
      id: `answers-${k}`,
      label: th(`wizard.review.${REVIEW_KEY[k]}`),
      message: t(k === 'markets' ? 'common:contactSend.field.markets' : 'common:contactSend.field.areas'),
    }))
    : [];
  const errFor = (k: StepKey) => errors.find((e) => e.id === `answers-${k}`)?.message;

  const toggle = (k: StepKey, id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (k === 'operations') {
        // Eine Taetigkeit — wie im Wizard eine Auswahl je Schritt.
        for (const other of stepIds('operations')) n.delete(other);
        if (!prev.has(id)) n.add(id);
        return n;
      }
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const removeExtra = (code: string) => {
    const next = extra.filter((x) => x !== code);
    setExtra(next);
    if (!next.length) setSelected((prev) => { const n = new Set(prev); n.delete('Others'); return n; });
  };

  const discard = () => {
    setSelected(new Set(initial.selected));
    setExtra(initial.extraMarkets);
    setOpenStep(null);
    setTried(false);
  };

  const save = async () => {
    if (changes === 0 || state === 'busy') return;
    setTried(true);
    if (missing.length) {
      setOpenStep(missing[0]);
      focusField(`answers-${missing[0]}`);
      return;
    }
    setState('busy');
    try {
      // buildProfile setzt Markt/Taetigkeit/Bereiche neu; alles andere
      // (Notiz, Dringlichkeit, Umsatzband …) bleibt vom gespeicherten Stand.
      const built = buildProfile(selected, extra);
      await updateSessionAnswers(sessionId, { ...initial.full, ...built });
      setState('done');
      onSaved();
      setTimeout(onClose, 700);
    } catch {
      setState('error');
    }
  };

  const cardTitle = (id: string, k: StepKey) => {
    const c = STEPS[ORDER.indexOf(k)].cards.find((x) => x.id === id);
    return c ? th(`wizard.cards.${c.key}.title`) : id;
  };
  const extraLabel = (code: string) => {
    const card = Object.entries(MARKET_CODE).find(([, v]) => v === code)?.[0];
    return card ? cardTitle(card, 'markets') : th(`marketsDrawer.markets.${code.toLowerCase()}.name`, { defaultValue: code });
  };
  const answerChips = (k: StepKey): string[] => {
    const ids = stepIds(k).filter((id) => selected.has(id)).map((id) => cardTitle(id, k));
    return k === 'markets' ? [...ids, ...extra.map(extraLabel)] : ids;
  };

  const footer = (
    <div className="flex flex-col gap-3">
      <FormErrorSummary errors={errors} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-2xs text-fg-secondary">
          {state === 'done' ? t('answersDrawer.saved') : state === 'error' ? <span className="text-risk-high">{t('answersDrawer.error')}</span> : t('answersDrawer.footerNote')}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={discard} disabled={changes === 0 || state === 'busy'}>{t('answersDrawer.discard')}</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={changes === 0 || state === 'busy'}>
            {state === 'busy' ? '…' : t('answersDrawer.save')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} size="xl" fixedHeight eyebrow={sessionLabel} title={t('answersDrawer.title')} footer={footer}>
      <div className="space-y-2.5">
        {ORDER.map((k, i) => {
          const isOpen = openStep === k;
          const chips = answerChips(k);
          const changed = changedSteps.includes(k);
          const err = errFor(k);
          return (
            <section
              key={k}
              id={`answers-${k}`}
              className={'rounded-[10px] border bg-surface transition-shadow '
                + (err ? 'border-error-500 ' : isOpen ? 'border-brand ' : 'border-stroke ')
                + (isOpen ? 'shadow-[0_8px_24px_-18px_rgba(11,21,18,0.25)]' : '')}
            >
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : k)}
                aria-expanded={isOpen}
                aria-describedby={err ? `answers-${k}-error` : undefined}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-extrabold text-fg-on-brand">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-fg">{th(`wizard.review.${REVIEW_KEY[k]}`)}</span>
                    {changed && <span className="rounded-full bg-accent/20 px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-[0.06em] text-fg-accent-strong">{t('answersDrawer.changed')}</span>}
                  </span>
                  {!isOpen && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {chips.length ? chips.map((c) => (
                        <span key={c} className="inline-flex whitespace-nowrap rounded-full bg-brand-light px-2.5 py-[2px] text-[10.5px] font-bold text-fg-brand">{c}</span>
                      )) : <span className="text-[10.5px] text-fg-tertiary">{t('answersDrawer.none')}</span>}
                    </span>
                  )}
                </span>
                <ChevronDown size={16} className={'shrink-0 text-fg-tertiary transition-transform ' + (isOpen ? 'rotate-180' : '')} />
              </button>
              {err && (
                <div className="-mt-2 px-4 pb-3">
                  <FieldError id={`answers-${k}`} message={err} />
                </div>
              )}
              {isOpen && (
                <div className="border-t border-stroke-subtle px-4 pb-4 pt-3.5">
                  <p className="mb-2.5 text-[11px] text-fg-tertiary">{th(`wizard.steps.${k}.subtitle`)}</p>
                  <div
                    role="group"
                    aria-label={th(`wizard.review.${REVIEW_KEY[k]}`)}
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `answers-${k}-error` : undefined}
                    className="flex flex-wrap gap-2"
                  >
                    {stepIds(k).map((id) => {
                      const on = selected.has(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          role={k === 'operations' ? 'radio' : 'checkbox'}
                          aria-checked={on}
                          onClick={() => toggle(k, id)}
                          className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-[7px] text-[12px] font-semibold transition-colors '
                            + (on ? 'border-brand bg-brand text-fg-on-brand' : 'border-stroke bg-surface text-fg hover:border-stroke-brand')}
                        >
                          {on && <Check size={11} strokeWidth={3} />}
                          {cardTitle(id, k)}
                        </button>
                      );
                    })}
                    {k === 'markets' && extra.map((code) => (
                      <span key={code} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-brand bg-brand px-3 py-[7px] text-[12px] font-semibold text-fg-on-brand">
                        <Check size={11} strokeWidth={3} />
                        {extraLabel(code)}
                        <button type="button" aria-label={th('wizard.removeMarket', { market: extraLabel(code) })} onClick={() => removeExtra(code)} className="-mr-1 opacity-80 hover:opacity-100">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
        <p className="pt-1 text-[10.5px] text-fg-tertiary">
          {t('answersDrawer.hint')}{' '}
          <b className={changes ? 'text-fg-accent-strong' : ''}>{t('answersDrawer.unsaved', { count: changes })}</b>
        </p>
      </div>
    </Drawer>
  );
}
