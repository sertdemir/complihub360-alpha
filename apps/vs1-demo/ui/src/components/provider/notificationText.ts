import type { ProviderNotification } from '../../api/notifications';

// ─── Text je Anbieter-Benachrichtigung ───────────────────────────────────────
// Eine Stelle fuer Glocke und Seite. Der Server schickt nur freigegebene
// Felder (from, to, label, count, evidence_type) — der Text entsteht hier aus
// Schluesseln in providerws `notifications.type.*` / `notifications.desc.*`.

type T = (k: string, o?: Record<string, unknown>) => string;

export function notificationTitle(n: ProviderNotification, t: T): string {
  return t(`notifications.type.${n.type}`, { label: n.payload.label ?? '', count: n.payload.count ?? 0, defaultValue: n.type });
}

export function notificationDesc(n: ProviderNotification, t: T, locale: string): string {
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const label = n.payload.label ?? '';
  return t(`notifications.desc.${n.type}`, {
    from: fmt(n.payload.from), to: fmt(n.payload.to), label,
    type: n.payload.evidence_type ?? '', count: n.payload.count ?? 0,
    // Entscheidung ueber den Einspruch: lifted|upheld steht im label.
    decision: label === 'lifted' ? t('notifications.decision.lifted') : label === 'upheld' ? t('notifications.decision.upheld') : '',
    defaultValue: '',
  });
}

export function timeLabel(iso: string, locale: string, t: T): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return t('notifications.agoMinutes', { count: Math.max(1, Math.floor(ms / 60_000)) });
  if (h < 24) return t('notifications.agoHours', { count: h });
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(iso: string, locale: string, t: T): string {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return t('notifications.dayToday');
  if (days === 1) return t('notifications.dayYesterday');
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
