import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { createEngagement } from '../../api/engagement';
import { lastSessionId } from '../../api/sessions';
import { DOMAIN_I18N_KEY } from '../../lib/domains';

// ─── Request Quote modal (App-Workspace, always dark) ────────────────────────
// The real funnel entry: message + explicit send → POST /api/v1/engagement.
// The backend issues single-use magic links and notifies the provider.
// Styling follows the dashboard drawer spec (slate surface, teal accents).

export interface QuoteProvider {
  key: string;       // provider_key in the DB
  name: string;
  meta?: string;     // e.g. "Milano, IT"
}

interface RequestQuoteModalProps {
  provider: QuoteProvider;
  country: string;
  category: string;
  domainLabel: string;
  /** Identity for the dossier unlock (from the real session, if present). */
  requesterEmail?: string;
  onClose: () => void;
}

type Phase = 'form' | 'sending' | 'done' | 'error';

// Canonical English domain label → userws translation key (display only —
// the POST payload keeps the canonical domainLabel).
const DOMAIN_KEY = DOMAIN_I18N_KEY;

export function RequestQuoteModal({ provider, country, category, domainLabel, requesterEmail, onClose }: RequestQuoteModalProps) {
  const { t } = useTranslation('userws');
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [errText, setErrText] = useState('');

  const domainDisplay = DOMAIN_KEY[domainLabel] ? t(`domain.${DOMAIN_KEY[domainLabel]}`) : domainLabel;

  const submit = async () => {
    setPhase('sending');
    try {
      await createEngagement({
        provider_key: provider.key,
        country,
        category,
        message,
        session_id: lastSessionId() ?? undefined,
        requester_email: requesterEmail,
        // The anonymized dossier the provider sees before confirming
        // (Addendum 2026-07-10) — situational context, no identity.
        structured_answers: {
          source: 'workbench',
          domain: domainLabel,
          markets: [country],
          timeline: 'next quarter',
        },
      });
      setPhase('done');
      setTimeout(onClose, 2200);
    } catch (e) {
      setErrText(e instanceof Error ? e.message : t('requestQuote.requestFailed'));
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[540px] rounded-xl border border-elevate/10 bg-[#1f2937] shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-elevate/10 px-6 py-5">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-fg">
              <Trans t={t} i18nKey="requestQuote.title" components={{ accent: <span className="text-fg-accent" /> }} />
            </h2>
            <p className="mt-0.5 text-[12px] text-fg-tertiary">
              {provider.name}{provider.meta ? ` · ${provider.meta}` : ''} — {domainDisplay} · {country} {category}
            </p>
          </div>
          <button type="button" aria-label={t('requestQuote.close')} onClick={onClose} className="text-fg-tertiary transition-colors hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {phase === 'done' ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[15px] font-semibold text-fg">{t('requestQuote.sentTitle')}</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] text-fg-secondary">
              <Trans t={t} i18nKey="requestQuote.sentBody" values={{ name: provider.name }} components={{ em: <span className="font-medium text-fg" /> }} />
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-2">
                <Tag tone="brand">✓ VERIFIED PARTNER</Tag>
                <Tag tone="neutral">{t('requestQuote.slaTag')}</Tag>
              </div>
              <div>
                <label htmlFor="quote-msg" className="mb-1.5 block text-[12px] font-medium text-fg-secondary">
                  {t('requestQuote.messageLabel')}
                </label>
                <textarea
                  id="quote-msg"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('requestQuote.messagePlaceholder')}
                  className="w-full resize-none rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
                />
              </div>
              <p className="text-[11px] leading-relaxed text-fg-tertiary">
                <Trans t={t} i18nKey="requestQuote.privacyNote" components={{ em: <span className="font-medium text-fg-secondary" /> }} />
              </p>
              {phase === 'error' && (
                <p className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-[12px] text-error-500">
                  {t('requestQuote.sendError', { error: errText })}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-elevate/10 px-6 py-4">
              <Button variant="ghost" size="sm" onClick={onClose}>{t('shared.cancel')}</Button>
              <Button variant="accent" size="sm" onClick={submit} disabled={phase === 'sending' || message.trim().length < 10}>
                {phase === 'sending' ? t('requestQuote.sending') : t('requestQuote.sendRequest')}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
