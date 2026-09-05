import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MoreHorizontal, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/user/EmptyState';
import { Button } from '../../components/ui/Button';
import { RequestCard, type RequestStatus } from '../../components/ui/RequestCard';
import { ThreadDrawer } from '../../components/shared/ThreadDrawer';
import { RequestActionsDrawer, type RequestActionsTarget } from '../../components/user/RequestActionsDrawer';
import { DOMAINS } from '../../lib/domains';
import type { UserRequestRow } from '../../api/requests';

// ─── Anfragen — der Reiter in der Termine-Seite ──────────────────────────────
// Canvas "Anfragen · Varianten" (Nutzer-Wahl 2026-09-01): 1C — Anfragen ist
// Teil von Termine (eine Beziehung, zwei Lebensphasen: vor und nach der
// Zusage). Die Zeilen kommen als Props aus der TerminePage, die beide Listen
// laedt — der Reiter selbst haelt nur Anzeige-Zustand (Drawer, Rueckzug).
//
//   2B — die Unterzeile sagt, was auf den Nutzer WARTET, nicht wie viele
//        Zeilen es gibt. Der tote CSV-Link ("href=#") ist ersatzlos raus.
//   3B — Abschnitte nach "wer ist am Zug", wie auf dem Termine-Reiter:
//        "Wartet auf Sie" (Antwort liegt vor, abgelaufen, abgelehnt) zuoberst,
//        dann "Wartet auf den Anbieter", dann Abgeschlossen. Die Status-Chips
//        und der Sortier-Knopf ohne Handler entfallen.
//   4B — die Frist steht in der Zeile: Restzeit + schmaler Balken (unter
//        4 Std. gold, abgelaufen rot). Die RequestCard KONNTE das immer —
//        die Nutzer-Seite hat slaValue nur nie uebergeben. Dazu: deutsche
//        Zeitangaben (Intl.RelativeTimeFormat) und uebersetzte Bereichs-/
//        Marktnamen statt roher Slugs ("tax-vat · IT").

const SLUG_TO_I18N: Record<string, string> = Object.fromEntries(DOMAINS.map((d) => [d.slug, d.i18nKey]));

/** "vor 2 Std." / "hace 2 h" — lokalisiert ohne eigene Schluessel. */
function relZeit(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const diffMs = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diffMs / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export function AnfragenTab({ rows }: { rows: UserRequestRow[] | null }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const [threadFor, setThreadFor] = useState<string | null>(null);
  // Deep-Link (Glocke, Suche): ?thread=<uuid> oeffnet den Verlauf direkt.
  const [searchParams, setSearchParams] = useSearchParams();
  const deepThread = searchParams.get('thread');
  if (deepThread && threadFor !== deepThread) setThreadFor(deepThread);
  const [actionsFor, setActionsFor] = useState<RequestActionsTarget | null>(null);
  const [withdrawnIds, setWithdrawnIds] = useState<Set<string>>(new Set());

  const effective = (rows ?? []).map((r) => {
    if (withdrawnIds.has(r.uuid)) {
      return { ...r, status: 'closed' as RequestStatus, statusLabel: 'Withdrawn', bucket: 'closed' as const, rawStatus: 'withdrawn', slaDeadline: null };
    }
    // Matrix-Befund 4 (2026-09-05): reisst der Anbieter nach der Bestaetigung
    // die Antwortfrist, blieb die Zeile fuer immer "wartet auf den Anbieter".
    // Jetzt wandert sie zu "wartet auf Sie" — Ihre Entscheidung steht an.
    if (r.bucket === 'confirmed' && r.slaDeadline && new Date(r.slaDeadline).getTime() <= Date.now()) {
      return { ...r, bucket: 'overdue' as const };
    }
    return r;
  });

  // 3B: drei Abschnitte, sortiert danach, wer am Zug ist.
  const aufSie = effective.filter((r) => r.bucket === 'replied' || r.bucket === 'overdue');
  const aufAnbieter = effective.filter((r) => r.bucket === 'confirm' || r.bucket === 'confirmed');
  const abgeschlossen = effective.filter((r) => r.bucket === 'closed' || r.bucket === 'active');

  const regionName = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  const bereich = (slug?: string) => (slug && SLUG_TO_I18N[slug] ? t(`domain.${SLUG_TO_I18N[slug]}`) : slug ?? '');
  const markt = (code?: string) => { try { return code ? (regionName.of(code.toUpperCase()) ?? code) : ''; } catch { return code ?? ''; } };

  // 4B: die gerade laufende Frist als Restzeit + Balkenanteil.
  const frist = (r: UserRequestRow) => {
    // 2B (2026-09-05): Fristen gehoeren immer dem Anbieter (24 h bestaetigen,
    // 48 h antworten). "verpasst" statt "abgelaufen" — sonst las es sich, als
    // haetten SIE etwas versaeumt.
    if (r.bucket === 'overdue') return { label: t('requests.slaMissed'), tone: 'err' as const, pct: 0 };
    if (!r.slaDeadline) return null;
    const left = new Date(r.slaDeadline).getTime() - Date.now();
    if (left <= 0) return { label: t('requests.slaMissed'), tone: 'err' as const, pct: 0 };
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    return {
      label: h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`,
      tone: left <= 4 * 3_600_000 ? ('warn' as const) : ('ok' as const),
      pct: Math.max(3, Math.min(100, Math.round((left / (r.slaWindowMs ?? 24 * 3_600_000)) * 100))),
    };
  };

  const oeffnen = (r: UserRequestRow) => setThreadFor(r.uuid);
  const knopf = (r: UserRequestRow) => {
    const label = r.bucket === 'replied' ? t('requests.actionRead') : t('requests.actionOpen');
    const variant = r.bucket === 'replied' ? 'accent' as const : 'secondary' as const;
    return <Button size="sm" variant={variant} onClick={() => oeffnen(r)}>{label}</Button>;
  };

  const FRIST_TONE = { ok: 'text-fg-brand', warn: 'text-fg-accent-strong', err: 'text-[#8A3B3B]' };
  const BALKEN_TONE = { ok: 'bg-brand', warn: 'bg-[#d4af37]', err: 'bg-[#B55353]' };

  const karte = (r: UserRequestRow) => {
    const f = frist(r);
    return (
      <RequestCard
        key={r.uuid}
        className="rounded-none border-0 border-t border-stroke-subtle bg-transparent px-5"
        idLine={`${r.id} · ${relZeit(r.createdAt, locale)}`}
        status={r.status}
        statusLabel={r.statusLabel ? t(`status.${STATUS_KEY[r.statusLabel] ?? ''}`, r.statusLabel) : r.statusLabel}
        company={r.company}
        tag={r.partner ? 'PARTNER' : undefined}
        meta={[bereich(r.category), markt(r.country)].filter(Boolean).join(' · ') || r.meta}
        slaLabel={t('requests.slaLabelProvider')}
        slaValue={f ? (
          <span className="block">
            <span className={`text-[15px] font-medium ${FRIST_TONE[f.tone]}`}>{f.label}</span>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-tertiary">
              <span className={`block h-full rounded-full ${BALKEN_TONE[f.tone]}`} style={{ width: `${f.pct}%` }} />
            </span>
          </span>
        ) : undefined}
        action={
          <div className="flex items-center gap-1.5">
            {knopf(r)}
            <button
              type="button"
              aria-label={t('requests.requestActionsAria')}
              onClick={() => setActionsFor({ uuid: r.uuid, idLine: r.id, company: r.company, statusLabel: String(r.statusLabel), rawStatus: r.rawStatus })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-elevate/10 text-fg-tertiary transition-colors hover:border-elevate/25 hover:text-fg"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        }
      />
    );
  };

  const abschnitt = (key: string, liste: UserRequestRow[], warn = false) => (
    liste.length > 0 && (
      <section>
        <p className={`px-5 pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-[0.05em] ${warn ? 'text-warning-800 dark:text-amber-300' : 'text-fg-tertiary'}`}>
          {t(key)} · {liste.length}
        </p>
        {liste.map(karte)}
      </section>
    )
  );

  // 1C (2026-09-05): Anfragen sind der Posteingang UNTER den Terminen — eine
  // Karte mit Zaehlern im Kopf statt einer eigenen H1. Die Unterzeile zaehlt,
  // wer am Zug ist; wartet etwas auf Sie, steht sie fett.
  const counts = { you: aufSie.length, provider: aufAnbieter.length, done: abgeschlossen.length };

  // Leerzustand ohne Posteingangs-Rahmen (Nutzer-Vorgabe 2026-09-05): die
  // Karte steht dann genau wie die Termine-Leerkarte darueber — gleiche
  // Breite, gleiche Form, kein breiter Kasten mit Kopfzeile drumherum.
  const leer = rows !== null && effective.length === 0;

  return (
    <section id="anfragen" className="scroll-mt-6">
      {leer ? (
        <EmptyState
          icon={Inbox}
          title={t('requests.emptyTitle')}
          body={t('requests.emptyBody')}
          cta={{ label: t('requests.emptyCta'), onClick: () => navigate(`/${locale}/wizard`) }}
          steps={[
            { title: t('requests.emptyStep1Title'), body: t('requests.emptyStep1Body') },
            { title: t('requests.emptyStep2Title'), body: t('requests.emptyStep2Body') },
            { title: t('requests.emptyStep3Title'), body: t('requests.emptyStep3Body') },
          ]}
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-stroke bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-stroke-subtle bg-surface-secondary px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-[20px] font-bold leading-tight text-fg">{t('requests.inboxTitle')}</h2>
            <p className={`mt-0.5 text-[12px] ${aufSie.length > 0 ? 'font-semibold text-fg' : 'text-fg-secondary'}`}>
              {rows === null ? '…' : t('requests.inboxCounts', counts)}
            </p>
          </div>
          <button type="button" onClick={() => navigate(`/${locale}/wizard`)} className="shrink-0 text-[12px] font-bold text-fg-brand underline underline-offset-2 hover:text-fg">
            {t('requests.findProvider')}
          </button>
        </div>
        <div className="pb-1.5">
          {abschnitt('requests.secYou', aufSie, true)}
          {abschnitt('requests.secProvider', aufAnbieter)}
          {abschnitt('requests.secDone', abgeschlossen)}
        </div>
      </div>
      )}

      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="user" onClose={() => { setThreadFor(null); if (deepThread) { searchParams.delete('thread'); setSearchParams(searchParams, { replace: true }); } }} />
      <RequestActionsDrawer
        target={actionsFor}
        onClose={() => setActionsFor(null)}
        onOpenThread={(uuid) => setThreadFor(uuid)}
        onWithdrawn={(uuid) => setWithdrawnIds((prev) => new Set(prev).add(uuid))}
      />
    </section>
  );
}

// Live/fixture UI labels → userws keys (display only; raw values untouched).
const STATUS_KEY: Record<string, string> = {
  'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active',
  'Provider replied': 'providerReplied', 'Provider confirmed': 'providerConfirmed', 'Withdrawn': 'withdrawn',
  'Declined': 'declined', 'Expired': 'expired',
};
