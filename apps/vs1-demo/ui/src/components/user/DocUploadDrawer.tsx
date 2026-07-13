import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { Checkbox } from '../ui/Checkbox';
import { uploadDocument, type UploadResult } from '../../api/documents';

// ─── Doc-Upload drawer (Figma 2654:49 · wiring map B12) ──────────────────────
// The visible face of the privacy pipeline: text goes in, the API redacts
// BEFORE persisting, and the drawer shows exactly what was masked and whether
// the AI gate opened. Consent is an explicit opt-in per upload (Art. 7 GDPR).

interface DocUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  domainLabel: string;
}

const CLASSIFICATION_TONE: Record<UploadResult['classification'], 'success' | 'brand' | 'warning' | 'error'> = {
  public: 'success',
  internal: 'brand',
  confidential: 'warning',
  restricted: 'error',
};

const CLASSIFICATION_KEY: Record<UploadResult['classification'], string> = {
  public: 'classificationPublic',
  internal: 'classificationInternal',
  confidential: 'classificationConfidential',
  restricted: 'classificationRestricted',
};

// Canonical English domain label → userws translation key (display only).
const DOMAIN_KEY: Record<string, string> = {
  'Tax & VAT': 'taxVat', 'Product & Packaging': 'productPackaging', 'Data & Privacy': 'dataPrivacy',
  'Marketing & SEO': 'marketingSeo', 'Corporate & Structure': 'corporateStructure', 'Full Support': 'fullSupport',
};

export function DocUploadDrawer({ open, onClose, domainLabel }: DocUploadDrawerProps) {
  const { t } = useTranslation('userws');
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

  const domainDisplay = DOMAIN_KEY[domainLabel] ? t(`domain.${DOMAIN_KEY[domainLabel]}`) : domainLabel;

  const readFile = (f: File) => {
    setFilename(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(f);
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const res = await uploadDocument({
        filename: filename || 'pasted-note.txt',
        mimeType: 'text/plain',
        text,
        consentAI: consent,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('docUpload.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setResult(null); setText(''); setFilename(''); setConsent(false); setError(''); };
  const counts = result ? Object.entries(result.report.countsByType || {}) : [];

  return (
    <Drawer
      forceDark
      open={open}
      onClose={() => { reset(); onClose(); }}
      side="right"
      size="md"
      eyebrow={domainDisplay.toUpperCase()}
      title={result ? t('docUpload.titleProcessed') : t('docUpload.titleUpload')}
      footer={
        result ? (
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>{t('docUpload.uploadAnother')}</Button>
            <Button variant="primary" size="sm" onClick={() => { reset(); onClose(); }}>{t('shared.done')}</Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>{t('shared.cancel')}</Button>
            <Button variant="accent" size="sm" onClick={submit} disabled={busy || text.trim().length < 5}>
              {busy ? t('docUpload.sanitizing') : t('docUpload.uploadSanitize')}
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={CLASSIFICATION_TONE[result.classification]}>{t(`docUpload.${CLASSIFICATION_KEY[result.classification]}`)}</Tag>
            <Tag tone={result.sanitized_ready ? 'success' : 'error'}>{result.sanitized_ready ? t('docUpload.tagSanitized') : t('docUpload.tagSanitizationFailed')}</Tag>
            <Tag tone={result.ai_allowed ? 'success' : 'neutral'}>{result.ai_allowed ? t('docUpload.tagAiAllowed') : t('docUpload.tagAiBlocked')}</Tag>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">{t('docUpload.redactionReport')}</p>
            {counts.length ? (
              <ul className="mt-2 space-y-1">
                {counts.map(([type, n]) => (
                  <li key={type} className="flex justify-between text-[12px]">
                    <span className="text-fg-secondary">{type.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="font-semibold text-fg">{t('docUpload.maskedCount', { count: Number(n) })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-fg-secondary">{t('docUpload.noPii')}</p>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            {t('docUpload.storedNote')}
            {!result.ai_allowed && (result.consent_ai
              ? ` ${t('docUpload.aiBlockedClassification')}`
              : ` ${t('docUpload.aiBlockedConsent')}`)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-fg-brand/60"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-[13px] font-medium text-fg">{filename || t('docUpload.chooseFile')}</p>
            <p className="mt-1 text-[11px] text-fg-tertiary">{t('docUpload.orPaste')}</p>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain" className="hidden"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </div>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('docUpload.pastePlaceholder')}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
          />
          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-[12px] leading-relaxed text-fg-secondary">
              <Trans t={t} i18nKey="docUpload.consent" components={{ em: <span className="font-medium text-fg" /> }} />
            </span>
          </label>
          {error && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>
          )}
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            <Trans t={t} i18nKey="docUpload.privacyNote" components={{ em: <span className="font-medium text-fg-secondary" /> }} />
          </p>
        </div>
      )}
    </Drawer>
  );
}
