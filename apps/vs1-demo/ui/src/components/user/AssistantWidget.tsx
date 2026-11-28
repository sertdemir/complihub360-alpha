import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, SendHorizonal, Crown, FileText } from 'lucide-react';
import {
  askAssistant, assistantEnabled, createAssistantCheckout, verifyAssistantSubscription,
  type AssistantMessage, type AssistantSource,
} from '../../api/assistant';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Assistant widget (chatbot plan phase ②) ──────────────────────────────────
// Floating VAT assistant, bottom-right of the User App-Workspace. Behind the
// ?assistant=1 flag until the subscription gate (phase ③) ships. Copy lives in
// 'userws'.
//
// Redesign 28.11.2026 (Canvas-Wahl, Figma: Screens-Datei, „Assistant / Panel"
// 4412:1022 und „Assistant / Launcher" 4411:846): Das Panel folgt dem Theme —
// vorher erzwang der Container `dark`, dazu text-white und #0e6450, und im
// Light Mode stand ein dunkler Block auf heller Seite. Aufbau aus Variante A,
// Launcher mit Goldrand und Quellen-Chips aus B, die AI-Bubble als Icon.
// Bewegung: in Ruhe kreist ein Goldbogen um den Launcher (drei Runden nach dem
// Laden, danach einmal je Hover, dann still — ein dauernd bewegter Button
// würde Aufmerksamkeit erzwingen); beim Denken tippen drei Punkte. Der
// Launcher ist 48 px (h-[48px]): h-12 ist in dieser Skala 96 px.

type Turn = AssistantMessage & { sources?: AssistantSource[]; failed?: boolean };

/** AI-Bubble: Sprechblase mit Funke (Figma „Assistant / Icon / Bubble"). */
function BubbleIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-6.2l-4.3 3.2v-3.2H6A2.5 2.5 0 0 1 3.5 15V7A2.5 2.5 0 0 1 6 4.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 7.3l1.05 2.65 2.65 1.05-2.65 1.05L12 14.7l-1.05-2.65L8.3 11l2.65-1.05z" fill="currentColor" />
    </svg>
  );
}

// Goldbogen um den Launcher: ein konischer Verlauf, auf einen 3-px-Ring maskiert.
// Nachschärfung 28.11.2026 (Nutzer: schneller und deutlicher): 3 statt 2 px,
// längerer Bogen mit voller Spitze, Runde 3,5 s statt 7 s (index.css).
const ORBIT_STYLE = {
  background: 'conic-gradient(from 0deg, transparent 0 40%, rgb(var(--color-border-accent) / 0.35) 58%, rgb(var(--color-border-accent)) 94%, transparent 100%)',
  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
  mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
};

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
  // Ruhe-Animation: drei Runden nach dem Laden, danach eine je Hover.
  const [orbit, setOrbit] = useState<{ id: number; runs: number } | null>({ id: 0, runs: 3 });
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[540px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-stroke bg-surface text-fg shadow-[0_24px_56px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 border-b border-stroke px-4 py-3">
            <BubbleIcon size={16} className="text-fg-brand" />
            <p className="text-[13px] font-semibold text-fg">{t('assistant.title')}</p>
            <span className="rounded-full border border-brand-accent/35 bg-brand-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-accent">
              {t('assistant.beta')}
            </span>
            <button type="button" aria-label={t('assistant.close')} onClick={() => setOpen(false)} className="ml-auto rounded text-fg-tertiary transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus">
              <X size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="rounded-xl bg-surface-tertiary px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-secondary">
              {t('assistant.intro')}
            </div>
            {turns.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={
                  'max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ' +
                  (m.role === 'user' ? 'bg-brand-light text-fg' : m.failed ? 'border border-error-500/30 bg-error-500/10 text-fg' : 'bg-surface-tertiary text-fg-secondary')
                }>
                  {m.content}
                  {!!m.sources?.length && (
                    <ul aria-label={t('assistant.sources')} className="mt-2 flex flex-wrap gap-1.5">
                      {m.sources.map((s, j) => (
                        <li key={j} className="inline-flex items-center gap-1 rounded-full border border-stroke bg-surface py-0.5 pl-1.5 pr-2 text-[10.5px] font-medium leading-tight text-fg-secondary">
                          <FileText size={11} aria-hidden="true" className="shrink-0 text-gold-500" />
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {upgrade === 'active' && (
              <div className="rounded-xl border border-stroke-brand/40 bg-brand-light px-3.5 py-2.5 text-[13px] leading-relaxed text-fg">
                {t('assistant.upgradeSuccess')}
              </div>
            )}
            {(upgrade === 'required' || upgrade === 'redirecting') && (
              <div className="rounded-xl border border-brand-accent/35 bg-brand-accent/10 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                  <Crown size={14} aria-hidden="true" className="text-gold-500" /> {t('assistant.upgradeTitle')}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-secondary">{t('assistant.upgradeBody')}</p>
                <button
                  type="button"
                  onClick={startUpgrade}
                  disabled={upgrade === 'redirecting'}
                  className="mt-3 w-full rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-fg-on-brand transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {upgrade === 'redirecting' ? '…' : t('assistant.upgradeCta')}
                </button>
              </div>
            )}
            {busy && (
              <div className="flex justify-start">
                <div role="status" aria-label={t('assistant.thinking')} className="inline-flex items-center gap-1 rounded-xl rounded-bl-[4px] bg-surface-tertiary px-3 py-2.5 text-fg-tertiary">
                  {[0, 0.15, 0.3].map((delay) => (
                    <span key={delay} aria-hidden="true" className="assistant-typing-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stroke px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('assistant.placeholder')}
                className="flex-1 resize-none rounded-lg border border-stroke bg-elevate/5 px-3 py-2 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-stroke-brand focus:outline-none"
              />
              <button
                type="button"
                aria-label={t('assistant.send')}
                onClick={send}
                disabled={busy || draft.trim().length < 3}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-fg-on-brand transition-opacity disabled:opacity-40"
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
        onMouseEnter={() => setOrbit((o) => o ?? { id: Date.now(), runs: 1 })}
        className="relative grid h-[48px] w-[48px] place-items-center rounded-full bg-brand text-fg-on-brand shadow-[0_10px_24px_rgba(0,46,38,0.28)] ring-1 ring-brand-accent/35 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2 dark:shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      >
        {!open && (
          <span
            key={orbit?.id ?? 'rest'}
            aria-hidden="true"
            data-testid="assistant-orbit"
            className={'pointer-events-none absolute -inset-1 rounded-full motion-reduce:hidden' + (orbit ? ' assistant-orbit' : '')}
            style={{ ...ORBIT_STYLE, animationIterationCount: orbit?.runs }}
            onAnimationEnd={() => setOrbit(null)}
          />
        )}
        {open ? <X size={19} /> : <BubbleIcon size={21} />}
      </button>
    </div>
  );
}
