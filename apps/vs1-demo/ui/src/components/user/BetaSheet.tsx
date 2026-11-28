import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { FieldError, errorAria } from '../ui/FieldError';
import { focusField } from '../ui/FormErrorSummary';
import { acceptAgreement, fetchAgreement, type UserAgreement } from '../../api/agreements';
import { ApiError } from '../../api/client';
import { markBetaAccepted } from '../../lib/agreementGate';

// ─── Das Blatt in der Buchungs-Schublade (Variantenwahl 4A, 23.11.2026) ──────
// Das Netz hinter dem Gate: Lehnt der Server eine Buchung ab, weil die geltende
// Beta-Vereinbarung fehlt (alter Tab, Gate ausgefallen), liest der Nutzer das
// Blatt hier — an Ort und Stelle, ohne die Schublade zu verlassen. Termin und
// Anliegen bleiben im Zustand der Schublade stehen.
//
// Wie im eigenen Schritt (BetaAgreementStepPage) gilt die Festlegung vom
// 23.10.2026: das ganze Blatt im Kasten, kein Link zum Volltext. Eine
// veraltete Fassung (409) wird nie still untergeschoben.

export interface BetaSheetState {
  agreement: UserAgreement | null;
  loadError: boolean;
  retry: () => void;
  checked: boolean;
  setChecked: (v: boolean) => void;
  needCheck: boolean;
  saving: boolean;
  notice: 'outdated' | 'failed' | null;
  /** Schreibt die Annahme; ruft `onAccepted` nur, wenn sie gespeichert ist. */
  submit: (onAccepted: () => void) => Promise<void>;
}

/** Laedt das Blatt erst, wenn es gebraucht wird (`active`). */
export function useBetaSheet(lang: string, active: boolean): BetaSheetState {
  const [agreement, setAgreement] = useState<UserAgreement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<'outdated' | 'failed' | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setLoadError(false);
    fetchAgreement('beta', lang)
      .then((a) => { if (alive) setAgreement(a); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [lang, attempt, active]);

  const submit = async (onAccepted: () => void) => {
    setTried(true);
    if (!agreement || !checked || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      await acceptAgreement('beta', agreement.version, agreement.language);
      markBetaAccepted();
      setTried(false);
      setChecked(false);
      onAccepted();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Neue Fassung: Text neu laden, Haken zuruecknehmen, sagen warum.
        setNotice('outdated');
        setChecked(false);
        setTried(false);
        setAttempt((n) => n + 1);
      } else {
        setNotice('failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return { agreement, loadError, retry: () => setAttempt((n) => n + 1), checked, setChecked, needCheck: tried && !checked, saving, notice, submit };
}

/** Kopfzeile unter dem Titel: zurueck zum Termin. */
export function BetaSheetHeader({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('legal');
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-body-3xs font-bold text-brand underline underline-offset-2 hover:text-brand-700"
    >
      <ArrowLeft size={13} aria-hidden /> {t('betaStep.drawer.back')}
    </button>
  );
}

export function BetaSheetBody({ sheet }: { sheet: BetaSheetState }) {
  const { t } = useTranslation('legal');
  const version = sheet.agreement?.version ?? '';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Ehrlich ueber den Stand: nichts gebucht, nichts reserviert. */}
      <div role="status" className="flex items-start gap-2.5 rounded-xl border border-stroke-brand-soft bg-brand-light px-4 py-3 text-body-xs leading-relaxed text-fg">
        <Info size={16} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden />
        <p><strong className="font-semibold">{t('betaStep.drawer.noteLead')}</strong> {t('betaStep.drawer.note')}</p>
      </div>

      {sheet.notice === 'outdated' && <Banner status="info" title={t('betaStep.outdated')} className="mt-4" />}
      {sheet.notice === 'failed' && (
        <div role="alert" className="mt-4 rounded-lg border border-stroke bg-surface-secondary px-4 py-3 text-body-xs text-fg">
          {t('betaStep.failed')}
        </div>
      )}

      <p className="mt-5 text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary">{t('betaStep.listLabel', { version })}</p>
      <div
        className="mt-2 min-h-[200px] flex-1 overflow-y-auto rounded-xl border border-stroke bg-surface-secondary px-4 py-3.5"
        tabIndex={0}
        aria-label={t('betaStep.listLabel', { version })}
      >
        {sheet.loadError ? (
          <div role="status" className="text-body-xs text-fg-secondary">
            <p>{t('beta.error')}</p>
            <button type="button" onClick={sheet.retry} className="mt-2 font-semibold text-fg-brand underline underline-offset-2">{t('betaStep.retry')}</button>
          </div>
        ) : !sheet.agreement ? (
          <p className="flex items-center gap-2 text-body-xs text-fg-tertiary" aria-live="polite"><Loader2 size={14} className="animate-spin" aria-hidden /> {t('beta.loading')}</p>
        ) : (
          <ol className="space-y-2" data-testid="beta-points">
            {sheet.agreement.points.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-body-xs leading-snug text-fg">
                <span className="w-5 shrink-0 font-mono text-fg-tertiary">{String(i + 1).padStart(2, '0')}</span>
                <span><strong className="font-semibold">{p.lead}</strong> <span className="text-fg-secondary">{p.text}</span></span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function BetaSheetFooter({ sheet, onAccepted }: { sheet: BetaSheetState; onAccepted: () => void }) {
  const { t } = useTranslation('legal');
  const version = sheet.agreement?.version ?? '';
  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault();
      // Ohne Haken geht der Fokus auf den Haken (Checklist v1.0: first invalid field).
      if (sheet.agreement && !sheet.checked) focusField('beta-sheet-check');
      void sheet.submit(onAccepted);
    }}>
      <label className="flex cursor-pointer items-start gap-3 text-body-xs leading-relaxed text-fg">
        <input
          id="beta-sheet-check"
          type="checkbox"
          checked={sheet.checked}
          onChange={(e) => sheet.setChecked(e.target.checked)}
          disabled={!sheet.agreement}
          {...errorAria('beta-sheet-check', sheet.needCheck)}
          className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-bg-brand)]"
        />
        <span>{t('betaStep.checkbox', { version })}</span>
      </label>
      {/* Regel V2 (11.10.2026): ein Feld, keine Zusammenfassung — der Satz am Haken meldet sich selbst. */}
      <FieldError id="beta-sheet-check" alert message={sheet.needCheck ? t('betaStep.needCheck') : null} className="mt-2 pl-7" />
      <Button type="submit" size="lg" shape="soft" fullWidth className="mt-4" disabled={!sheet.agreement || sheet.saving} loading={sheet.saving} iconRight={<ArrowRight size={15} aria-hidden />}>
        {sheet.saving ? t('betaStep.saving') : t('betaStep.drawer.cta')}
      </Button>
    </form>
  );
}
