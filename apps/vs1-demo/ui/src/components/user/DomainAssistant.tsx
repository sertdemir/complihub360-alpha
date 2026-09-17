import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { SendHorizonal } from 'lucide-react';
import { askAssistant, type AssistantMessage, type AssistantSource } from '../../api/assistant';
import { ApiError } from '../../api/client';
import type { DomainObligation, DomainSession } from '../../api/domain';

// ─── Assistent der Bereichsseite (Canvas 3C, Nutzer-Wahl 2026-09-13) ─────────
// Kein Band. Der Assistent steht als Karte RECHTS neben dem Inhalt und klebt
// beim Scrollen: Verlauf, Kontext-Chips, Vorschlagsfragen, Eingabe unten.
// Frage und Pflichten sind gleichzeitig sichtbar — man fragt zur Zeile, die
// man gerade liest. Der Assistent bekommt Bereich und Sitzungen als Kontext
// (POST /assistant/chat mit domain + session_ids) und antwortet nur ueber
// diesen Bereich; die Chips sagen, woraus.
//
// Vorschlagsfragen entstehen aus den offenen Pflichten; ohne Sitzung fragt
// der Nutzer ins Bereichswissen ("keine Sitzung" als Chip).

type Turn = { question: string; answer?: string; sources?: AssistantSource[]; error?: string };

const TAG = 'inline-flex whitespace-nowrap rounded-md bg-brand-light px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-fg-brand';
const TAG_BETA = 'inline-flex whitespace-nowrap rounded border border-[#d4af37]/35 bg-[#d4af37]/10 px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-fg-accent-strong dark:bg-[#d4af37]/15 dark:border-[#d4af37]/40';

export function DomainAssistant({ slug, areaLabel, sessions, markets, openDuties, inputRef, onPartner }: {
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
  const logRef = useRef<HTMLDivElement>(null);

  const suggestions = [...new Map(openDuties.map((o) => [o.id, o])).values()].slice(0, 3);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  const autosize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
  };

  const sourceLabel = (s: AssistantSource) =>
    s.kind === 'area' ? t('domainPage.sourceArea', { area: areaLabel })
    : s.kind === 'session' ? t('domainPage.sourceSession', { name: s.name ?? '' })
    : s.label;

  return (
    <aside className="flex max-h-[calc(100vh-3rem)] flex-col rounded-xl border border-stroke-subtle bg-surface p-4 shadow-[0_1px_2px_rgba(11,21,18,0.04),0_8px_24px_-18px_rgba(11,21,18,0.12)] lg:sticky lg:top-6">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-fg-accent-strong">{t('domainPage.assistantTitle', { area: areaLabel })}</p>
        <span className={TAG_BETA + ' ml-auto'}>{t('assistant.beta')}</span>
      </div>

      {/* Kontext-Chips: woraus die Antwort kommt */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-body-3xs text-fg-secondary">
        <span className="font-bold">{t('domainPage.askScope')}</span>
        <span className={TAG}>{t('domainPage.askScopeArea', { area: areaLabel })}</span>
        <span className={TAG}>{sessions.length ? t('domainPage.askScopeSessions', { count: sessions.length }) : t('domainPage.askScopeNoSession')}</span>
        {markets.length > 0 && <span className={TAG}>{markets.join(' · ')}</span>}
      </div>

      {/* Verlauf. Die Mindesthoehe gilt erst, wenn etwas drinsteht: solange
          niemand gefragt hat, stand unter dem Einleitungssatz ein leeres Feld
          von 120 px, das wie ein fehlgeschlagener Ladevorgang aussah (Befund
          2026-09-16). Sobald der erste Zug da ist, haelt sie den Verlauf
          ruhig, damit die Karte beim Antworten nicht springt. */}
      <div ref={logRef} className={'mt-3 flex flex-1 flex-col gap-2 overflow-y-auto py-1' + (turns.length ? ' min-h-[120px]' : '')}>
        {turns.length === 0 && (
          <p className="text-body-3xs leading-relaxed text-fg-tertiary">{t('domainPage.assistantIntro', { area: areaLabel })}</p>
        )}
        {turns.map((tn, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="max-w-[88%] self-end rounded-[12px_12px_2px_12px] bg-[#10201c] px-3 py-2 text-body-3xs text-white">{tn.question}</p>
            {tn.answer ? (
              <div className="max-w-[94%] rounded-[12px_12px_12px_2px] bg-surface-secondary px-3 py-2 text-body-3xs leading-relaxed text-fg">
                <p className="whitespace-pre-line">{tn.answer}</p>
                {tn.sources && tn.sources.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-fg-tertiary">{t('assistant.sources')}: {tn.sources.map(sourceLabel).join(' · ')}</p>
                )}
                <p className="mt-1.5 text-[10px] text-fg-tertiary">
                  {t('domainPage.askDisclaimer')}{' '}
                  <button type="button" onClick={onPartner} className="font-bold text-brand underline underline-offset-2 hover:text-brand-700">{t('domainPage.askPartner')}</button>
                </p>
              </div>
            ) : tn.error ? (
              <p className="max-w-[94%] rounded-[12px_12px_12px_2px] bg-surface-secondary px-3 py-2 text-body-3xs text-fg-secondary">{tn.error}</p>
            ) : (
              <p className="max-w-[94%] rounded-[12px_12px_12px_2px] bg-surface-secondary px-3 py-2 text-body-3xs text-fg-tertiary">{t('domainPage.askThinking')}</p>
            )}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={busy}
              onClick={() => { void ask(t('domainPage.askSuggest', { title: o.label })); }}
              className="rounded-full border border-stroke bg-surface px-2.5 py-1 text-left text-[10.5px] font-semibold text-fg transition-colors hover:border-stroke-strong"
            >
              {t('domainPage.askSuggest', { title: o.label })}
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex items-end gap-2 rounded-xl border border-stroke bg-surface px-3 py-2 transition-colors focus-within:border-stroke-strong dark:bg-surface-secondary"
        onSubmit={(e) => { e.preventDefault(); void ask(value); }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={autosize}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(value); } }}
          aria-label={t('domainPage.askButton')}
          placeholder={t('domainPage.askPlaceholder')}
          className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent text-body-xs leading-normal text-fg outline-none placeholder:text-fg-tertiary"
        />
        <button
          type="submit"
          aria-label={t('domainPage.askButton')}
          disabled={busy || value.trim().length < 3}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          <SendHorizonal size={15} />
        </button>
      </form>
    </aside>
  );
}
