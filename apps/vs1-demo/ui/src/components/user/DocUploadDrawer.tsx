import { useRef, useState } from 'react';
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

export function DocUploadDrawer({ open, onClose, domainLabel }: DocUploadDrawerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

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
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setResult(null); setText(''); setFilename(''); setConsent(false); setError(''); };
  const counts = result ? Object.entries(result.report.countsByType || {}) : [];

  return (
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      side="right"
      size="md"
      eyebrow={domainLabel.toUpperCase()}
      title={result ? 'Document processed' : 'Upload document'}
      footer={
        result ? (
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>Upload another</Button>
            <Button variant="primary" size="sm" onClick={() => { reset(); onClose(); }}>Done</Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={submit} disabled={busy || text.trim().length < 5}>
              {busy ? 'Sanitizing…' : 'Upload & sanitize'}
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={CLASSIFICATION_TONE[result.classification]}>{result.classification}</Tag>
            <Tag tone={result.sanitized_ready ? 'success' : 'error'}>{result.sanitized_ready ? 'sanitized' : 'sanitization failed'}</Tag>
            <Tag tone={result.ai_allowed ? 'success' : 'neutral'}>{result.ai_allowed ? 'AI: allowed' : 'AI: blocked'}</Tag>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">Redaction report</p>
            {counts.length ? (
              <ul className="mt-2 space-y-1">
                {counts.map(([type, n]) => (
                  <li key={type} className="flex justify-between text-[12px]">
                    <span className="text-fg-secondary">{type.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="font-semibold text-fg">{n}× masked</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-fg-secondary">No personal identifiers detected.</p>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            Only the sanitized version was stored — the original text was discarded after processing.
            {!result.ai_allowed && (result.consent_ai
              ? ' AI analysis stays blocked because of the content classification.'
              : ' AI analysis stays blocked until you grant consent for this document.')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="cursor-pointer rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-fg-brand/60"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-[13px] font-medium text-fg">{filename || 'Choose a file (.txt · .md · .csv)'}</p>
            <p className="mt-1 text-[11px] text-fg-tertiary">or paste the content below</p>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain" className="hidden"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          </div>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste document content — contracts, notes, invoices …"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
          />
          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-[12px] leading-relaxed text-fg-secondary">
              I consent to AI-assisted analysis of the <span className="font-medium text-fg">sanitized</span> version of this
              document (Art. 6(1)(a) GDPR — revocable anytime). Without consent the document is stored but never touches AI.
            </span>
          </label>
          {error && (
            <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">{error}</p>
          )}
          <p className="text-[11px] leading-relaxed text-fg-tertiary">
            Personal identifiers (names, e-mails, phone numbers, IBANs) are masked <span className="font-medium text-fg-secondary">before</span> anything
            is stored. The raw text never persists.
          </p>
        </div>
      )}
    </Drawer>
  );
}
