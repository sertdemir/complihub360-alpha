import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CalendarClock, CheckCheck, MessageSquare, XCircle, AlarmClock, CalendarX2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserShell } from '../../components/user/UserShell';
import { EmptyState } from '../../components/user/EmptyState';
import { FilterChip } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { Tag } from '../../components/ui/Tag';
import { EntityCard } from '../../components/ui/Cards';
import {
  fetchMyNotifications, markNotificationsRead, LEERES_FACH,
  type Notification, type NotificationType, type NotificationsFeed,
} from '../../api/notifications';

// ─── Arbeitsbereich · Benachrichtigungen ──────────────────────────────────────
// Quelle ist `public.notifications` — Zeilen, die diesem Konto gehoeren.
//
// Bis 2026-08-31 stand hier der event_log der ganzen Plattform, ungefiltert:
// jedes angemeldete Konto sah alle Vorgaenge aller Nutzer, und weil die
// Beschreibungszeile ein roher Abzug der Nutzlast war, standen fremde
// Mailadressen im Klartext darin. Daneben lief eine Fixture mit fuenf
// englischen Beispielzeilen, die bei leerem Ergebnis einsprang — ein neues
// Konto sah also erfundene Post.
//
// Beides ist weg. Was hier steht, gehoert dem Konto oder es steht nichts da.

const ICON: Record<NotificationType, LucideIcon> = {
  provider_confirmed: CheckCheck,
  provider_replied: MessageSquare,
  provider_declined: XCircle,
  engagement_message: MessageSquare,
  engagement_expired: AlarmClock,
  booking_rescheduled: CalendarClock,
  booking_cancelled: CalendarX2,
};

const KIND_TONE: Record<Notification['kind'], 'brand' | 'neutral' | 'warning'> = {
  request: 'brand',
  termine: 'neutral',
  sla: 'warning',
};

const KIND_CHIPS: Notification['kind'][] = ['request', 'termine', 'sla'];

type Uebersetzer = (k: string, o?: Record<string, unknown>) => string;

/** Tagesgrenzen in der Sprache des Nutzers — heute, gestern, sonst das Datum. */
function tagesTitel(iso: string, locale: string, t: Uebersetzer): string {
  const tage = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (tage <= 0) return t('notifications.dayToday');
  if (tage === 1) return t('notifications.dayYesterday');
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function zeitTitel(iso: string, locale: string, t: Uebersetzer): string {
  const ms = Date.now() - new Date(iso).getTime();
  const std = Math.floor(ms / 3_600_000);
  if (std < 1) return t('notifications.agoMinutes', { count: Math.max(1, Math.floor(ms / 60_000)) });
  if (std < 24) return t('notifications.agoHours', { count: std });
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function UserNotificationsPage() {
  const navigate = useNavigate();
  const { t: tRaw, i18n } = useTranslation('userws');
  const t = tRaw as unknown as Uebersetzer;
  const locale = i18n.resolvedLanguage || 'en';
  // Zwei Achsen statt einer: der Zustand (alle/ungelesen) und die Art. Sie
  // kombinieren sich — genau das war der Punkt an Variante B.
  const [zustand, setZustand] = useState<'all' | 'unread'>('all');
  const [art, setArt] = useState<Notification['kind'] | null>(null);
  // null = laedt noch, LEERES_FACH = es gibt nichts. Ein Ladefehler ist ein
  // leeres Fach, kein Dauerzustand — sonst dreht sich die Seite fuer immer.
  const [feed, setFeed] = useState<NotificationsFeed | null>(null);

  useEffect(() => {
    fetchMyNotifications().then(setFeed).catch(() => setFeed(LEERES_FACH));
  }, []);

  const items = feed?.items ?? [];
  const passt = (n: Notification) =>
    (zustand === 'all' || n.unread) && (art === null || n.kind === art);
  const sichtbar = useMemo(() => items.filter(passt), [items, zustand, art]);

  // Nach Tagen gruppieren, Reihenfolge bleibt die des Servers (neueste zuerst).
  const gruppen = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of sichtbar) {
      const tag = tagesTitel(n.createdAt, locale, t);
      map.set(tag, [...(map.get(tag) ?? []), n]);
    }
    return [...map.entries()];
  }, [sichtbar, locale, t]);

  const oeffnen = (n: Notification) => {
    if (n.unread) {
      // Optimistisch: die Karte soll nicht auf den Server warten, um ihren
      // Punkt zu verlieren. Scheitert der Aufruf, ist sie beim naechsten Laden
      // wieder ungelesen — das ist der richtige Rueckfall.
      setFeed((f) => f && { ...f, items: f.items.map((x) => x.id === n.id ? { ...x, unread: false } : x), unread: Math.max(0, f.unread - 1) });
      markNotificationsRead({ id: n.id }).catch(() => {});
    }
    if (n.subject === 'booking') { navigate(`/${locale}/dashboard/termine`); return; }
    if (n.subject === 'engagement' && n.subjectId) navigate(`/${locale}/dashboard/requests?thread=${n.subjectId}`);
  };

  const alleGelesen = () => {
    setFeed((f) => f && { ...f, items: f.items.map((x) => ({ ...x, unread: false })), unread: 0 });
    markNotificationsRead({ all: true }).catch(() => {});
  };

  const ungelesen = items.filter((n) => n.unread).length;

  return (
    <UserShell>
      {/* Der Gradient-Grund (CLAUDE.md), wie ihn Dashboard und Sitzungen
          tragen — bis 2026-08-31 sass diese Seite als einzige Arbeitsfläche
          auf blankem Weiss. Negative Ränder heben das Shell-Padding auf,
          damit die Tönung randlos steht. */}
      <div className="-mx-8 -my-6 min-h-full bg-gradient-stage px-8 py-7">
      <div className="mx-auto max-w-[1140px] space-y-5">
        {/* Kopfzeile — Variante B (Nutzer-Wahl 2026-08-31, Canvas
            "Benachrichtigungen · Varianten"): die erklaerende Unterzeile faellt
            weg, an ihre Stelle tritt die Zahl, die man tatsaechlich sucht. Wer
            zum zehnten Mal hier ist, liest keine Definition der Seite mehr —
            er zaehlt. Verworfen wurden A (Unterzeile bleibt, kein Zaehler) und
            C (kompakte Postfach-Leiste ohne Serif-Titel: flacher, aber die
            Flaeche verliert den Auftritt der uebrigen Arbeitsbereich-Seiten). */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[32px] font-bold leading-tight text-fg">
              <span className="text-fg-accent-emphasis">{t('notifications.title')}</span>
            </h1>
            {/* Nur wenn es etwas zu zaehlen gibt. "0 ungelesen" ist keine
                Auskunft, sondern eine Kachel mit einer Null darin. */}
            {ungelesen > 0 && (
              <Tag tone="brand" className="text-[13px]">{t('notifications.unread', { count: ungelesen })}</Tag>
            )}
          </div>
          {ungelesen > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={alleGelesen}
              iconLeft={<CheckCheck size={14} />}
              className="mt-1 shrink-0"
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        {/* Filterleiste — Variante B (Nutzer-Wahl 2026-08-31): ZWEI EBENEN.
            Links der Zustand als Umschalter, rechts das Thema als Chips.
            Vorher standen beide als gleichrangige Chips nebeneinander und
            schlossen sich gegenseitig aus — "ungelesene Termine", die
            haeufigste Frage an ein Postfach, war damit nicht stellbar. Jetzt
            ist es eine Auswahl aus zwei Achsen.
            Der Umschalter ist `Tabs variant="boxed"`, der Segmented Control des
            Systems. Der Canvas zeigte ihn als Pille mit Rahmen; die gibt es im
            Design-System nicht, und eine sechste Pillenform neben Badge, Tag,
            Chip und Risk-Badge zu erfinden waere der schlechtere Tausch. */}
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={zustand}
              onValueChange={(v) => setZustand(v as 'all' | 'unread')}
              variant="boxed"
              size="sm"
            >
              <TabList>
                <Tab value="all">{t('notifications.filterAll', { count: items.length })}</Tab>
                <Tab value="unread">{t('notifications.filterUnread', { count: ungelesen })}</Tab>
              </TabList>
            </Tabs>
            <span aria-hidden="true" className="h-5 w-px bg-stroke" />
            <div className="flex flex-wrap items-center gap-2">
              {KIND_CHIPS.filter((k) => items.some((n) => n.kind === k)).map((k) => (
                <FilterChip
                  key={k}
                  size="sm"
                  selected={art === k}
                  // Ein zweiter Klick auf dieselbe Art hebt sie wieder auf —
                  // sonst gaebe es keinen Weg zurueck auf "alle Arten".
                  onClick={() => setArt(art === k ? null : k)}
                >
                  {t(`notifications.chip.${k}`)} · {items.filter((n) => n.kind === k).length}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {/* Erstzustand nur, wenn das Fach wirklich leer ist — nicht, solange es
            noch laedt, und nicht, wenn bloss ein Filter nichts trifft. */}
        {feed !== null && items.length === 0 && (
          <EmptyState
            icon={Bell}
            title={t('notifications.emptyTitle')}
            body={t('notifications.emptyBody')}
            hint={t('notifications.emptyHint')}
            cta={{ label: t('notifications.emptyCta'), onClick: () => navigate(`/${locale}/dashboard/requests`) }}
            steps={[
              { title: t('notifications.emptyStep1Title'), body: t('notifications.emptyStep1Body') },
              { title: t('notifications.emptyStep2Title'), body: t('notifications.emptyStep2Body') },
              { title: t('notifications.emptyStep3Title'), body: t('notifications.emptyStep3Body') },
            ]}
          />
        )}

        {items.length > 0 && sichtbar.length === 0 && (
          <p className="text-[13px] text-fg-tertiary">{t('notifications.empty')}</p>
        )}

        {gruppen.map(([tag, zeilen]) => (
          <section key={tag} className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{tag}</p>
            {zeilen.map((n) => {
              const Icon = ICON[n.type];
              const anbieter = n.payload.providerName || n.payload.providerKey;
              return (
                <EntityCard
                  key={n.id}
                  name={t(`notifications.type.${n.type}`, { provider: anbieter ?? t('notifications.providerFallback') })}
                  badge={<Tag tone={KIND_TONE[n.kind]}>{t(`notifications.chip.${n.kind}`)}</Tag>}
                  meta={t(`notifications.desc.${n.type}`, {
                    provider: anbieter ?? t('notifications.providerFallback'),
                    from: n.payload.from ? new Date(n.payload.from).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
                    to: n.payload.to ? new Date(n.payload.to).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
                  })}
                  trailing={<span className="text-[11px] text-fg-tertiary">{zeitTitel(n.createdAt, locale, t)}</span>}
                  unread={n.unread}
                  interactive={!!n.subject}
                  onClick={n.subject ? () => oeffnen(n) : undefined}
                  avatar={
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-elevate/[0.06] text-fg-tertiary">
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                  }
                />
              );
            })}
          </section>
        ))}
      </div>
      </div>
    </UserShell>
  );
}
