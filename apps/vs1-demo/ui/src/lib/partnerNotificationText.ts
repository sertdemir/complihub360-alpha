import type { TFunction } from 'i18next';
import type { PartnerNotification } from '../api/partnerNotifications';
import { money } from '../api/billing';

// Titel und Zeile je Art (Canvas C, abgenommen 2026-10-10). Die Werte aus der
// Nutzlast werden hier lesbar gemacht — Datum und Uhrzeit in der Sprache des
// Partners, Minuten als Stunden, Cents als Betrag, Nachweis-Codes als Namen.
export function partnerNotificationText(t: TFunction, n: PartnerNotification, locale: string): { title: string; body: string } {
  const p = n.payload;
  const when = (iso?: string) => iso ? new Date(iso).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const day = (iso?: string) => iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  const mins = Number(p.offset);
  const offset = Number.isFinite(mins) && mins > 0
    ? (mins >= 60 ? t('partnerNotif.hours', { count: Math.round(mins / 60) }) : t('partnerNotif.minutes', { count: mins }))
    : '';
  const vars = {
    slot: when(p.slot),
    offset,
    amount: p.amount ? money(Number(p.amount)) : '',
    label: n.type === 'evidence_expiring' ? t(`application.evidence.type.${p.label}`, { defaultValue: p.label ?? '' }) : (p.label ?? ''),
    deadline: day(p.deadline ?? p.to),
    effectiveOn: day(p.effectiveOn),
  };
  return { title: t(`partnerNotif.${n.type}.title`, vars), body: t(`partnerNotif.${n.type}.body`, vars) };
}
