import { useEffect, useState } from 'react';
import { useRequestContext } from '../../lib/requestContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { fetchProviderRequests, type ProviderRequest } from '../../api/requests';
import { sendContact, failureOf, EMAIL_RE } from '../../api/contact';
import { fetchMyProvider, fetchCoverage } from '../../api/provider';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Provider workspace drawers ──────────────────────────────────────────────
// Search: live filter over the booking inbox, result click deep-links to
// /termine. Help (Phase 6, Canvas-Wahl 4A): four real topics with a jump into
// the dashboard, and a ticket to the team via POST /contact (lane partner).
//
// Der Ranking-Drawer (B6) ist seit Phase 6 weg: er zeigte erfundene Gewichte
// (40/25/20/15), die nie auf dem Draht standen. Was das Ranking sieht, sagt
// die Performance-Seite in einem Satz (ADR-0009 Nr. 2).

// ── Search ───────────────────────────────────────────────────────────────────
export function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProviderRequest[] | null>(null);
  const { kontext } = useRequestContext();
  const kontextVon = (r: ProviderRequest) => kontext({ category: r.category, country: r.country, createdAt: r.createdAt, ref: r.ref });

  useEffect(() => {
    if (!open) return;
    setQ('');
    fetchProviderRequests().then(setRows).catch(() => setRows([]));
  }, [open]);

  const hits = (rows ?? []).filter((r) => {
    if (q.trim().length < 2) return false;
    const hay = `${kontextVon(r)} ${r.company} ${r.meta} ${r.statusLabel}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every((tk) => hay.includes(tk));
  });

  return (
    <Drawer open={open} onClose={onClose} side="right" size="md" eyebrow={t('searchDrawer.eyebrow')} title={t('searchDrawer.title')}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-elevate/10 bg-elevate/5 px-3 py-2.5 focus-within:border-fg-brand">
          <Search size={15} className="shrink-0 text-fg-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchDrawer.placeholder')}
            className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-tertiary"
          />
        </div>
        {q.trim().length < 2 && (
          <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.hint')}</p>
        )}
        {q.trim().length >= 2 && rows === null && <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.loading')}</p>}
        {q.trim().length >= 2 && rows !== null && hits.length === 0 && (
          <p className="text-[12px] text-fg-tertiary">{t('searchDrawer.noMatches', { query: q })}</p>
        )}
        <div className="space-y-2">
          {hits.slice(0, 8).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onClose(); navigate(`/${locale}/partner-dashboard/termine`); }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50"
            >
              <span>
                <span className="block text-[13px] font-semibold text-fg">{kontextVon(r)}</span>
                <span className="block text-[11px] text-fg-tertiary">{r.company} · {r.meta}</span>
              </span>
              <Tag tone={r.status === 'active' ? 'brand' : 'warning'}>{r.statusLabel}</Tag>
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

// ── Help & support (Phase 6, 4A) ─────────────────────────────────────────────
// Figma: Seite „Performance & Übersicht (Phase 6)", 3670:324.
//
// Vier Themen mit Sprung zur Stelle im Dashboard, darunter das Ticket. Die
// Kontakt-Route speichert bewusst keine Nachrichten — der Anbieter bekommt
// die Referenz hier und per Mail, eine Ticket-Historie gibt es nicht. Der
// Satz zur Antwortzeit ist ein Ziel, kein Versprechen, und fuer alle Tarife
// derselbe (Spec B „Technical and operational provider support").

const TOPICS: Array<{ key: 'termine' | 'billing' | 'verification' | 'calendar'; to: string }> = [
  { key: 'termine', to: 'termine' },
  { key: 'billing', to: 'billing' },
  { key: 'verification', to: 'verification' },
  { key: 'calendar', to: 'settings' },
];
const SUBJECTS = ['technical', 'billing', 'verification', 'calendar', 'other'] as const;

export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('technical');
  const [message, setMessage] = useState('');
  const [providerName, setProviderName] = useState<string | null>(null);
  // Ohne Login-Adresse (Demo-Login, Sitzung ohne E-Mail) traegt die
  // Kontaktadresse des Anbieters das Ticket — die steht in der Anbieter-Zeile.
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [reference, setReference] = useState<string | null>(null);
  const [failure, setFailure] = useState<'unavailable' | 'network' | 'rateLimit' | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchMyProvider().then((p) => setProviderName(p.name)).catch(() => {});
    fetchCoverage().then((c) => setContactEmail(c.contact_email ?? null)).catch(() => {});
  }, [open]);

  // Absender aus der Sitzung: Name der Person (sonst der Anbieter), Adresse des
  // Logins. Ohne gueltige Adresse geht nichts ab — der Server lehnt sie ab.
  const email = user?.email ?? contactEmail ?? '';
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim() || providerName || email.split('@')[0] || '';
  const canSend = message.trim().length >= 10 && EMAIL_RE.test(email) && name.length > 0;

  const send = async () => {
    setState('sending'); setFailure(null);
    try {
      const r = await sendContact({
        lane: 'partner', locale, name, email,
        message: `[${t(`helpDrawer.subject.${subject}`)}]${providerName ? ` ${providerName}` : ''}\n\n${message.trim()}`,
      });
      setReference(r.reference);
      setState('sent');
      setMessage('');
    } catch (err) {
      setFailure(failureOf(err));
      setState('failed');
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size="md" eyebrow={t('helpDrawer.eyebrow')} title={t('helpDrawer.title')}
      headerExtra={<p className="text-[12px] leading-relaxed text-fg-tertiary">{t('helpDrawer.intro')}</p>}
      footer={<p className="text-[11px] leading-relaxed text-fg-tertiary">{t('helpDrawer.scope')}</p>}>
      <div className="space-y-5">
        <div className="space-y-2" data-section="topics">
          {TOPICS.map((x) => (
            <button key={x.key} type="button"
              onClick={() => { onClose(); navigate(`/${locale}/partner-dashboard/${x.to}`); }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-elevate/10 bg-elevate/[0.03] px-3.5 py-3 text-left transition-colors hover:border-fg-brand/50">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-fg">{t(`helpDrawer.topic.${x.key}.title`)}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-tertiary">{t(`helpDrawer.topic.${x.key}.desc`)}</span>
              </span>
              <span className="shrink-0 text-[12px] font-medium text-fg-brand">{t(`helpDrawer.go.${x.key}`)} ›</span>
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-elevate/10 p-4" data-section="ticket">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('helpDrawer.ticketTitle')}</p>
          {state === 'sent' ? (
            <div role="status" className="space-y-1 rounded-lg border border-success-500/30 bg-success-bg px-4 py-3 text-[13px] dark:bg-emerald-500/10">
              <p className="font-semibold text-fg">{t('helpDrawer.sentTitle')}</p>
              <p className="text-fg-secondary">{t('helpDrawer.sentBody', { reference: reference ?? '' })}</p>
              <button type="button" className="text-[12px] font-medium text-fg-brand hover:underline" onClick={() => setState('idle')}>{t('helpDrawer.another')}</button>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-fg-secondary">{t('helpDrawer.subjectLabel')}</span>
                <Select inputSize="sm" value={subject} onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{t(`helpDrawer.subject.${s}`)}</option>)}
                </Select>
              </label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('helpDrawer.messagePlaceholder')} aria-label={t('helpDrawer.ticketTitle')} />
              {!EMAIL_RE.test(email) && <p className="text-[12px] text-fg-tertiary">{t('helpDrawer.noEmail')}</p>}
              {state === 'failed' && failure && <p role="alert" className="text-[12px] text-error-500">{t(`helpDrawer.failed.${failure}`)}</p>}
              <div className="flex items-start justify-between gap-3">
                <p className="max-w-[260px] text-[11px] leading-relaxed text-fg-tertiary">{t('helpDrawer.note')}</p>
                <Button size="sm" onClick={send} disabled={!canSend} loading={state === 'sending'}>{t('helpDrawer.send')}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
