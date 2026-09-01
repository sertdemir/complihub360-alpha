import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MoreHorizontal, Inbox } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
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

  const effective = (rows ?? []).map((r) =>
    withdrawnIds.has(r.uuid)
      ? { ...r, status: 'active' as RequestStatus, statusLabel: 'Withdrawn', bucket: 'closed' as const, rawStatus: 'withdrawn', slaDeadline: null }
      : r,
  );

  // 3B: drei Abschnitte, sortiert danach, wer am Zug ist.
  const aufSie = effective.filter((r) => r.bucket === 'replied' || r.bucket === 'overdue');
  const aufAnbieter = effective.filter((r) => r.bucket === 'confirm' || r.bucket === 'confirmed');
  const abgeschlossen = effective.filter((r) => r.bucket === 'closed' || r.bucket === 'active');

  const regionName = useMemo(() => new Intl.DisplayNames([locale], { type: 'region' }), [locale]);
  const bereich = (slug?: string) => (slug && SLUG_TO_I18N[slug] ? t(`domain.${SLUG_TO_I18N[slug]}`) : slug ?? '');
  const markt = (code?: string) => { try { return code ? (regionName.of(code.toUpperCase()) ?? code) : ''; } catch { return code ?? ''; } };

  // 4B: die gerade laufende Frist als Restzeit + Balkenanteil.
  const frist = (r: UserRequestRow) => {
    if (r.bucket === 'overdue') return { label: t('requests.slaExpired'), tone: 'err' as const, pct: 0 };
    if (!r.slaDeadline) return null;
    const left = new Date(r.slaDeadline).getTime() - Date.now();
    if (left <= 0) return { label: t('requests.slaExpired'), tone: 'err' as const, pct: 0 };
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
        idLine={`${r.id} · ${relZeit(r.createdAt, locale)}`}
        status={r.status}
        statusLabel={r.statusLabel ? t(`status.${STATUS_KEY[r.statusLabel] ?? ''}`, r.statusLabel) : r.statusLabel}
        company={r.company}
        tag={r.partner ? 'PARTNER' : undefined}
        meta={[bereich(r.category), markt(r.country)].filter(Boolean).join(' · ') || r.meta}
        slaLabel={t('requests.slaLabel')}
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
      <section className="space-y-2.5">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${warn ? 'text-warning-800 dark:text-amber-300' : 'text-fg-tertiary'}`}>
          {t(key)} · {liste.length}
        </p>
        {liste.map(karte)}
      </section>
    )
  );

  // 2B: die Unterzeile sagt, was wartet — sonst die Zählung, sonst den Satz.
  const sub = aufSie.length > 0
    ? t('requests.subWaiting', { count: aufSie.length })
    : effective.length > 0
      ? t('requests.subCounts', { active: aufAnbieter.length + aufSie.length, overdue: effective.filter((r) => r.bucket === 'overdue').length })
      : t('requests.sub');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
            <Trans t={t} i18nKey="requests.title" components={{ accent: <span className="text-fg-accent-emphasis" /> }} />
          </h1>
          <p className={`mt-1 text-body-sm ${aufSie.length > 0 ? 'font-semibold text-fg' : 'text-fg-secondary'}`}>{sub}</p>
        </div>
        <Button size="sm" className="mt-1 shrink-0" onClick={() => navigate(`/${locale}/wizard`)}>{t('requests.findProvider')}</Button>
      </div>

      {rows !== null && effective.length === 0 ? (
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
        <>
          {abschnitt('requests.secYou', aufSie, true)}
          {abschnitt('requests.secProvider', aufAnbieter)}
          {abschnitt('requests.secDone', abgeschlossen)}
        </>
      )}

      <ThreadDrawer open={!!threadFor} engagementId={threadFor} viewer="user" onClose={() => { setThreadFor(null); if (deepThread) { searchParams.delete('thread'); setSearchParams(searchParams, { replace: true }); } }} />
      <RequestActionsDrawer
        target={actionsFor}
        onClose={() => setActionsFor(null)}
        onOpenThread={(uuid) => setThreadFor(uuid)}
        onWithdrawn={(uuid) => setWithdrawnIds((prev) => new Set(prev).add(uuid))}
      />
    </div>
  );
}

// Live/fixture UI labels → userws keys (display only; raw values untouched).
const STATUS_KEY: Record<string, string> = {
  'Awaiting confirmation': 'awaitingConfirmation', 'Active': 'active',
  'Provider replied': 'providerReplied', 'Provider confirmed': 'providerConfirmed', 'Withdrawn': 'withdrawn',
  'Declined': 'declined', 'Expired': 'expired',
};
