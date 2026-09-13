import { useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { askAssistant, type AssistantMessage, type AssistantSource } from '../../api/assistant';
import { ApiError } from '../../api/client';
import type { DomainObligation, DomainSession } from '../../api/domain';

// ─── Frage-Band der Bereichsseite (Canvas 3B, 2026-09-13) ────────────────────
// Dasselbe Band wie auf der oeffentlichen Bereichsseite (Sprechblase links,
// Eingabe rechts), aber die Antwort erscheint DARUNTER statt auf /search:
// der Nutzer bleibt im Arbeitsbereich. Der Assistent bekommt Bereich und
// Sitzungen als Kontext (POST /assistant/chat mit domain + session_ids) und
// antwortet nur ueber diesen Bereich — die Kontext-Chips sagen, woraus.
//
// Vorschlagsfragen entstehen aus den offenen Pflichten; ohne Sitzung fragt
// der Nutzer ins Bereichswissen ("keine Sitzung" als Chip).

type Turn = { question: string; answer?: string; sources?: AssistantSource[]; error?: string };

const TAG = 'inline-flex whitespace-nowrap rounded-md bg-brand-light px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-brand';

export function DomainAskBand({ slug, areaLabel, sessions, markets, openDuties, inputRef, onPartner }: {
  slug: string;
  areaLabel: string;
  sessions: DomainSession[];
  markets: string[];
  openDuties: DomainObligation[];
  /** Der Kopf-Knopf "Frage stellen" setzt den Fokus hierher. */
  inputRef: RefObject<HTMLTextAreaElement>;
  /** "Anfrage an einen verifizierten Partner" scrollt zu den Anbietern. */
  onPartner: () => void;
}) {
  const { t } = useTranslation('userws');
  const [value, setValue] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestions = [...new Map(openDuties.map((o) => [o.id, o])).values()].slice(0, 3);

  const autosize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const ask = async (question: string) => {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const history: AssistantMessage[] = turns
      .filter((tn) => tn.answer)
      .flatMap((tn) => [{ role: 'user' as const, content: tn.question }, { role: 'assistant' as const, content: tn.answer as string }]);
    setTurns((prev) => [...prev, { question: q }]);
    setBusy(true);
    try {
      const reply = await askAssistant(q, { domain: slug, sessionIds: sessions.map((s) => s.id), history });
      setTurns((prev) => prev.map((tn, i) => (i === prev.length - 1 ? { ...tn, answer: reply.answer, sources: reply.sources } : tn)));
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const msg = status === 503 ? t('assistant.notConfigured')
        : status === 402 ? t('assistant.upgradeBody')
        : status === 429 ? t('assistant.quota')
        : t('assistant.error');
      setTurns((prev) => prev.map((tn, i) => (i === prev.length - 1 ? { ...tn, error: msg } : tn)));
    }
    setBusy(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  return (
    <section className="mt-8 border-y border-[#d4af37]/40 py-8">
      <div className="flex items-start gap-9">
        {/* Die Sprechblase der oeffentlichen Seite — hier ohne Auftritt, sie
            steht schon, wenn man ankommt. */}
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round"
          className="hidden h-[120px] w-[120px] shrink-0 text-[#d4af37] lg:block">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-accent-strong">{t('domainPage.askEyebrow')}</p>
          <h2 className="mt-2 font-serif text-[22px] font-bold leading-tight text-fg">{t('domainPage.askTitle', { area: areaLabel })}</h2>

          {/* Kontext-Chips: woraus die Antwort kommt */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-body-3xs text-fg-secondary">
            <span className="font-bold">{t('domainPage.askScope')}</span>
            <span className={TAG}>{t('domainPage.askScopeArea', { area: areaLabel })}</span>
            <span className={TAG}>{sessions.length ? t('domainPage.askScopeSessions', { count: sessions.length }) : t('domainPage.askScopeNoSession')}</span>
            {markets.length > 0 && <span className={TAG}>{markets.join(' · ')}</span>}
          </div>

          <form
            className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(e) => { e.preventDefault(); void ask(value); }}
          >
            <label className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-stroke bg-surface px-4 py-3 shadow-[0_12px_30px_-24px_rgba(2,22,17,0.25)] transition-colors focus-within:border-stroke-strong dark:bg-surface-secondary">
              <Search size={18} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-fg-tertiary" />
              <textarea
                ref={inputRef}
                rows={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onInput={autosize}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(value); } }}
                aria-label={t('domainPage.askButton')}
                placeholder={t('domainPage.askPlaceholder')}
                className="max-h-40 w-full resize-none overflow-hidden whitespace-nowrap bg-transparent text-body-sm leading-normal text-fg outline-none placeholder:text-fg-tertiary [&:not(:placeholder-shown)]:whitespace-normal"
              />
            </label>
            <Button type="submit" className="shrink-0" disabled={busy || value.trim().length < 3}>
              {t('domainPage.askButton')}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden className="ml-1.5" />
            </Button>
          </form>

          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={busy}
                  onClick={() => { void ask(t('domainPage.askSuggest', { title: o.label })); }}
                  className="rounded-full border border-stroke bg-surface px-2.5 py-1 text-body-3xs font-semibold text-fg transition-colors hover:border-stroke-strong"
                >
                  {t('domainPage.askSuggest', { title: o.label })}
                </button>
              ))}
            </div>
          )}

          {turns.map((tn, i) => (
            <div key={i} className="mt-4 rounded-xl border border-stroke-subtle border-l-[3px] border-l-[#d4af37] bg-surface px-[18px] py-4 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)]">
              <p className="text-body-3xs text-fg-tertiary"><b className="text-fg">{t('domainPage.askYou')}</b> {tn.question}</p>
              {tn.answer && <p className="mt-2.5 whitespace-pre-line text-body-xs leading-relaxed text-fg">{tn.answer}</p>}
              {tn.error && <p className="mt-2.5 text-body-xs text-fg-secondary">{tn.error}</p>}
              {!tn.answer && !tn.error && <p className="mt-2.5 text-body-xs text-fg-tertiary">{t('domainPage.askThinking')}</p>}
              {tn.sources && tn.sources.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tn.sources.map((s) => (
                    <span key={s.label} className="rounded-full bg-surface-secondary px-2 py-[2px] text-[9.5px] font-semibold text-fg-secondary">
                      {s.kind === 'area' ? t('domainPage.sourceArea', { area: areaLabel })
                        : s.kind === 'session' ? t('domainPage.sourceSession', { name: s.name ?? '' })
                        : s.label}
                    </span>
                  ))}
                </div>
              )}
              {tn.answer && (
                <p className="mt-2.5 text-[10px] text-fg-tertiary">
                  {t('domainPage.askDisclaimer')}{' '}
                  <button type="button" onClick={onPartner} className="font-bold text-brand underline underline-offset-2 hover:text-brand-700">{t('domainPage.askPartner')}</button>
                </p>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </section>
  );
}
