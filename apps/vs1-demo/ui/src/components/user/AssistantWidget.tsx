import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, SendHorizonal, Crown } from 'lucide-react';
import {
  askAssistant, assistantEnabled, createAssistantCheckout, verifyAssistantSubscription,
  type AssistantMessage, type AssistantSource,
} from '../../api/assistant';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Assistant widget (chatbot plan phase ②) ──────────────────────────────────
// Floating VAT assistant, bottom-right of the User App-Workspace. Behind the
// ?assistant=1 flag until the subscription gate (phase ③) ships. Panel follows
// the drawer spec: slate #1f2937, teal accents, strong lift; the gold Beta tag
// marks it as the upgrade/monetization surface. Copy lives in 'userws'.

type Turn = AssistantMessage & { sources?: AssistantSource[]; failed?: boolean };

export function AssistantWidget({ country }: { country?: string }) {
  const { t } = useTranslation('userws');
  const [enabled] = useState(assistantEnabled);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Phase ③: 402 from the api flips the panel into the upgrade state; after
  // Stripe Checkout the success_url returns with ?sub=success&session_id=….
  const [upgrade, setUpgrade] = useState<'none' | 'required' | 'redirecting' | 'active'>('none');
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy, open, upgrade]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('sub') !== 'success' || !sessionId) return;
    ['sub', 'session_id'].forEach((k) => params.delete(k));
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    verifyAssistantSubscription(sessionId)
      .then((r) => { if (r.active) { setUpgrade('active'); setOpen(true); } })
      .catch(() => {});
  }, []);

  if (!enabled) return null;

  const send = async () => {
    const message = draft.trim();
    if (message.length < 3 || busy) return;
    setDraft('');
    const history = turns.filter((m) => !m.failed).map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const reply = await askAssistant(message, { country, history });
      setTurns((prev) => [...prev, { role: 'assistant', content: reply.answer, sources: reply.sources }]);
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 0;
      if (code === 402) {
        setUpgrade('required');
      } else {
        const key = code === 503 ? 'assistant.notConfigured' : code === 429 ? 'assistant.quota' : 'assistant.error';
        setTurns((prev) => [...prev, { role: 'assistant', content: t(key), failed: true }]);
      }
    }
    setBusy(false);
  };

  const startUpgrade = async () => {
    setUpgrade('redirecting');
    try {
      const returnPath = `${window.location.pathname}?assistant=1`;
      const { url } = await createAssistantCheckout(returnPath, user?.email || undefined);
      window.location.href = url;
    } catch {
      setUpgrade('required');
      setTurns((prev) => [...prev, { role: 'assistant', content: t('assistant.error'), failed: true }]);
    }
  };

  return (
    <div className="dark fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[540px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1f2937] text-fg shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Sparkles size={15} className="text-[#2cc0ad]" />
            <p className="text-[13px] font-semibold text-white">{t('assistant.title')}</p>
            <span className="rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#d4af37]">
              {t('assistant.beta')}
            </span>
            <button type="button" aria-label={t('assistant.close')} onClick={() => setOpen(false)} className="ml-auto text-fg-tertiary transition-colors hover:text-fg">
              <X size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="rounded-xl bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-secondary">
              {t('assistant.intro')}
            </div>
            {turns.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={
                  'max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ' +
                  (m.role === 'user' ? 'bg-[#0e6450]/60 text-fg' : m.failed ? 'border border-error-500/30 bg-error-500/10 text-error-500' : 'bg-white/[0.06] text-fg-secondary')
                }>
                  {m.content}
                  {!!m.sources?.length && (
                    <p className="mt-2 border-t border-white/10 pt-1.5 text-[10px] leading-relaxed text-fg-tertiary">
                      {t('assistant.sources')}: {m.sources.map((s) => s.label).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {upgrade === 'active' && (
              <div className="rounded-xl border border-[#2cc0ad]/40 bg-[#0e6450]/25 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg">
                {t('assistant.upgradeSuccess')}
              </div>
            )}
            {(upgrade === 'required' || upgrade === 'redirecting') && (
              <div className="rounded-xl border border-[#d4af37]/45 bg-[#d4af37]/[0.08] px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#d4af37]">
                  <Crown size={14} /> {t('assistant.upgradeTitle')}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-secondary">{t('assistant.upgradeBody')}</p>
                <button
                  type="button"
                  onClick={startUpgrade}
                  disabled={upgrade === 'redirecting'}
                  className="mt-3 w-full rounded-lg bg-[#14a89a] px-3 py-2 text-[13px] font-semibold text-[#04140f] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {upgrade === 'redirecting' ? '…' : t('assistant.upgradeCta')}
                </button>
              </div>
            )}
            {busy && <p className="text-[12px] text-fg-tertiary">{t('assistant.thinking')}</p>}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('assistant.placeholder')}
                className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-[#2cc0ad]/60 focus:outline-none"
              />
              <button
                type="button"
                aria-label={t('assistant.send')}
                onClick={send}
                disabled={busy || draft.trim().length < 3}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#14a89a] text-[#04140f] transition-opacity disabled:opacity-40"
              >
                <SendHorizonal size={15} />
              </button>
            </div>
            <p className="mt-2 text-[9.5px] leading-relaxed text-fg-tertiary">{t('assistant.disclaimer')}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        onClick={() => setOpen((o) => !o)}
        className="grid h-12 w-12 place-items-center rounded-full bg-[#14a89a] text-[#04140f] shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-transform hover:scale-105"
      >
        {open ? <X size={19} /> : <Sparkles size={19} />}
      </button>
    </div>
  );
}
