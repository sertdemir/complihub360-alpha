import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { TechnicalDetails } from '../results/RiskMapState';
import { referenceOf } from '../../api/client';
import { CONTACT_INBOX, type SendFailure } from '../../api/contact';

// ─── Kontakt und Bewerbung · Sendezustaende ──────────────────────────────────
// Canvas „Kontakt und Bewerbung senden" (Wahl 10.10.2026: A3 · B2 · C1 · D2 ·
// E1); Figma: Screens-Datei, Seite „Kontakt + Bewerbung senden (Di 13.10.)",
// B2 3637:317 · C1 3638:35. Copy wortgleich aus `common:contactSend.*`.

/** Die eine Postfach-Adresse mit „Kopieren" (B2, C1). Ohne konfigurierte
 *  Adresse steht nichts da. */
export function InboxAddress() {
  const { t } = useTranslation('common');
  const inbox = CONTACT_INBOX;
  if (!inbox) return null;
  const copy = () => {
    // Clipboard kann fehlen oder abgelehnt werden; die Adresse bleibt als
    // markierbarer Text stehen.
    navigator.clipboard?.writeText(inbox).catch(() => {});
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <code className="select-all rounded-md border border-stroke-subtle bg-surface px-2 py-0.5 font-mono text-[0.85em] text-fg">
        {inbox}
      </code>
      <Button type="button" size="sm" variant="ghost" onClick={copy}>
        {t('contactSend.copy')}
      </Button>
    </span>
  );
}

/** B2 · Nicht abgeschickt. Der Text im Formular bleibt stehen; hier stehen
 *  der Grund, der direkte Weg und die Referenz. */
export function SendFailed({
  kind,
  failure,
  error,
}: {
  kind: 'message' | 'application';
  failure: SendFailure;
  error: unknown;
}) {
  const { t } = useTranslation('common');
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-error-500/30 bg-error-bg px-[18px] py-[15px]">
      <p className="text-body-md font-bold text-fg">
        {t(kind === 'application' ? 'contactSend.failedTitleApplication' : 'contactSend.failedTitle')}
      </p>
      <p className="text-body-sm leading-relaxed text-error-700 dark:text-red-300">
        {t(`contactSend.failed.${failure}`)}
        {CONTACT_INBOX && <> {t('contactSend.direct')}</>}
      </p>
      <InboxAddress />
      <TechnicalDetails reference={referenceOf(error)} />
    </div>
  );
}
