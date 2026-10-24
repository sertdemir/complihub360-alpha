import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Banner } from '../ui/Banner';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { FormErrorSummary, focusField, type FormError } from '../ui/FormErrorSummary';
import { FieldError, errorAria } from '../ui/FieldError';
import type { ConfirmSpec } from './ConfirmDrawer';
import {
  fetchApiAccess, requestApiAccess, issueApiKey, revokeApiAccess, fetchApiAccessLog, REQUESTABLE_SCOPES,
  type ApiAccessResponse, type ApiScope, type ApiClientStatus, type ApiAccessLog,
} from '../../api/apiAccess';
import { ApiError } from '../../api/client';

// ─── Partner-Einstellungen · Integration (API) ───────────────────────────────
// Phase 7 (ADR-0010, Canvas-Wahl 1A · 2A · 3A, 2026-10-11). Figma: Seite
// „Enterprise-API (Phase 7)", 3679:3 · 3680:180 · 3681:285.
//
// Ein Abschnitt in den Einstellungen, nur wenn der Tarif die API enthaelt
// (`eligible`). Unter Essential und Growth gibt es ihn nicht — keine
// Vorschau, kein Hinweis, was fehlt (DNA: we do not create needs).
//
// Zustaende: kein Client → Antrag · requested → warten · approved → Schluessel
// erzeugen · active → Schluessel-Kasten (einmal im Klartext), Fakten, Rotieren
// und Widerrufen, Ereignisse und Protokoll · suspended → Grund des Teams ·
// rejected → Begruendung, neuer Antrag moeglich.

const TONE: Record<ApiClientStatus, BadgeTone> = { requested: 'warning', approved: 'info', active: 'success', suspended: 'error', revoked: 'neutral', rejected: 'neutral' };

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">{children}</p>;
}

function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <code className={`font-mono text-[12px] text-fg ${className}`}>{children}</code>;
}

export function ApiAccessPanel({ onConfirm, onEligibility }: { onConfirm: (spec: ConfirmSpec) => void; onEligibility?: (eligible: boolean) => void }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [access, setAccess] = useState<ApiAccessResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [log, setLog] = useState<ApiAccessLog | null>(null);
  // Der Klartext lebt nur im Zustand dieser Seite, bis der Anbieter „gespeichert" klickt.
  const [freshKey, setFreshKey] = useState<{ key: string; previousUntil: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionFailed, setActionFailed] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadFailed(false);
    fetchApiAccess().then((a) => {
      setAccess(a);
      onEligibility?.(a.eligible);
    }).catch(() => setLoadFailed(true));
  }, [onEligibility]);
  useEffect(() => { load(); }, [load, attempt]);
  // Sobald der Client aktiv ist (auch direkt nach dem Erzeugen des Schluessels),
  // zeigen Ereignisse und Protokoll, was die Integration tut.
  const activeId = access?.client?.status === 'active' ? access.client.id : null;
  useEffect(() => {
    if (!activeId) { setLog(null); return; }
    let cancelled = false;
    fetchApiAccessLog().then((l) => { if (!cancelled) setLog(l); }).catch(() => { if (!cancelled) setLog(null); });
    return () => { cancelled = true; };
  }, [activeId]);

  // Nicht berechtigt: der Abschnitt existiert nicht. Auch nicht beim Laden —
  // sonst blitzte er kurz auf, bevor die Antwort da ist.
  if (!access && !loadFailed) return null;
  if (loadFailed) {
    return (
      <Card id="settings-integration" styleVariant="filled" className="scroll-mt-6 space-y-3 p-5">
        <h2 className="text-[15px] font-semibold text-fg">{t('apiAccess.title')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body-sm text-fg-secondary">{t('apiAccess.loadFailed')}</span>
          <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>{t('common:states.actions.tryAgain')}</Button>
        </div>
      </Card>
    );
  }
  if (!access || !access.eligible) return null;

  const client = access.client;
  const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

  const run = async (fn: () => Promise<void>, failKey: string) => {
    setBusy(true); setActionFailed(null);
    try { await fn(); } catch (e) {
      const code = e instanceof ApiError ? String(e.body.errorCode ?? '') : '';
      setActionFailed(code === 'API_NOT_ELIGIBLE' ? t('apiAccess.notEligibleNow') : t(failKey));
    } finally { setBusy(false); }
  };

  const createKey = () => run(async () => {
    const r = await issueApiKey();
    setFreshKey({ key: r.key, previousUntil: r.previous_key_valid_until });
    setCopied(false);
    setAccess({ ...access, client: r.client });
  }, 'apiAccess.keyFailed');

  const rotate = () => onConfirm({
    title: t('apiAccess.rotateTitle'),
    consequence: t('apiAccess.rotateConsequence'),
    confirmLabel: t('apiAccess.rotateLabel'),
    failure: t('apiAccess.keyFailed'),
    onConfirm: async () => {
      const r = await issueApiKey();
      setFreshKey({ key: r.key, previousUntil: r.previous_key_valid_until });
      setCopied(false);
      setAccess({ ...access, client: r.client });
    },
  });

  const revoke = () => onConfirm({
    title: t('apiAccess.revokeTitle'),
    consequence: t('apiAccess.revokeConsequence'),
    confirmLabel: t('apiAccess.revokeLabel'),
    keyword: t('apiAccess.revokeKeyword'),
    failure: t('apiAccess.revokeFailed'),
    onConfirm: async () => {
      await revokeApiAccess();
      setFreshKey(null);
      // Nach dem Widerruf zaehlt der Client nicht mehr — ein neuer Antrag ist moeglich.
      setAccess({ ...access, client: null });
      setLog(null);
    },
  });

  const copyKey = async () => {
    if (!freshKey) return;
    try { await navigator.clipboard.writeText(freshKey.key); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <Card id="settings-integration" styleVariant="filled" className="scroll-mt-6 space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[15px] font-semibold text-fg">{t('apiAccess.title')}</h2>
        {client ? <Badge tone={TONE[client.status]} size="sm">{t(`apiAccess.status.${client.status}`)}</Badge> : <Badge tone="brand" size="sm">{access.plan_code ? t(`apiAccess.plan.${access.plan_code}`, { defaultValue: access.plan_code }) : ''}</Badge>}
        {client?.status === 'active' && <span className="ml-auto text-[12px] text-fg-tertiary">{t('apiAccess.approvedOn', { date: fmt(client.approved_at) })} · {client.name}</span>}
      </div>

      {!client && <RequestForm terms={access.terms_version} busy={busy} onSubmit={(body) => run(async () => { const c = await requestApiAccess({ ...body, accept_terms: true }); setAccess({ ...access, client: c }); }, 'apiAccess.requestFailed')} />}

      {client?.status === 'requested' && (
        <p className="max-w-2xl text-body-sm leading-relaxed text-fg-secondary">
          {t('apiAccess.requestedBody', { date: fmt(client.created_at), name: client.name, scopes: client.requested_scopes.join(', '), email: client.contact_email ?? '' })}
        </p>
      )}

      {client?.status === 'rejected' && (
        <>
          <Banner status="info" title={t('apiAccess.rejectedTitle')}>{client.decision_note || t('apiAccess.rejectedNoNote')}</Banner>
          <RequestForm terms={access.terms_version} busy={busy} onSubmit={(body) => run(async () => { const c = await requestApiAccess({ ...body, accept_terms: true }); setAccess({ ...access, client: c }); }, 'apiAccess.requestFailed')} />
        </>
      )}

      {client?.status === 'approved' && (
        <div className="space-y-3">
          <p className="max-w-2xl text-body-sm leading-relaxed text-fg-secondary">{t('apiAccess.approvedBody', { scopes: client.scopes.join(', '), limit: client.rate_limit_per_minute })}</p>
          <Button size="sm" onClick={createKey} disabled={busy}>{t('apiAccess.createKey')}</Button>
        </div>
      )}

      {client?.status === 'suspended' && (
        <Banner status="warning" title={t('apiAccess.suspendedTitle', { date: fmt(client.suspended_at) })}>
          {t('apiAccess.suspendedBody', { reason: client.suspended_reason ?? '' })}
        </Banner>
      )}

      {client?.status === 'active' && (
        <>
          {freshKey && (
            <div className="space-y-3 rounded-xl border border-stroke-brand/50 bg-brand-light p-4">
              <p className="text-body-sm font-semibold text-fg-brand">{t('apiAccess.freshTitle')}</p>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-stroke bg-surface px-3.5 py-2.5">
                <Mono className="min-w-0 flex-1 break-all">{freshKey.key}</Mono>
                <Button size="sm" variant="secondary" onClick={copyKey}>{copied ? t('apiAccess.copied') : t('apiAccess.copy')}</Button>
              </div>
              <p className="max-w-2xl text-body-sm leading-relaxed text-fg-secondary">
                {t('apiAccess.freshBody', { prefix: client.key_prefix ?? '' })}
                {freshKey.previousUntil && <> {t('apiAccess.previousUntil', { date: fmt(freshKey.previousUntil) })}</>}
              </p>
              <Button size="sm" onClick={() => setFreshKey(null)}>{t('apiAccess.saved')}</Button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{t('apiAccess.scopes')}</Label>
              <div className="flex flex-wrap gap-1.5">{client.scopes.map((s) => <Badge key={s} tone="neutral" size="sm"><Mono>{s}</Mono></Badge>)}</div>
              <p className="text-[11px] text-fg-tertiary">{t('apiAccess.scopesByTeam')}</p>
            </div>
            <Fact label={t('apiAccess.rateLimit')} value={t('apiAccess.perMinute', { n: client.rate_limit_per_minute })} sub={t('apiAccess.setByTeam')} />
            <Fact label={t('apiAccess.lastUsed')} value={client.last_used_at ? fmt(client.last_used_at) : t('apiAccess.neverUsed')} sub={client.key_prefix ?? ''} />
            <Fact label={t('apiAccess.terms')} value={client.terms_version ?? access.terms_version} sub={t('apiAccess.acceptedOn', { date: fmt(client.created_at) })} />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-stroke-subtle pt-3">
            <Button size="sm" variant="secondary" onClick={rotate} disabled={busy}>{t('apiAccess.rotate')}</Button>
            <Button size="sm" variant="ghost" onClick={revoke} disabled={busy}>{t('apiAccess.revoke')}</Button>
            <span className="text-[11px] text-fg-tertiary sm:ml-auto sm:max-w-[420px]">{t('apiAccess.rotateHint')}</span>
          </div>

          {log && <EventsAndLog log={log} fmt={fmt} />}
        </>
      )}

      {actionFailed && <Banner status="error" title={actionFailed} />}
    </Card>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-body-md font-medium text-fg">{value}</p>
      {sub && <p className="text-[11px] text-fg-tertiary">{sub}</p>}
    </div>
  );
}

function RequestForm({ terms, busy, onSubmit }: { terms: string; busy: boolean; onSubmit: (b: { name: string; use_case: string; contact_email: string; contact_name?: string; requested_scopes: ApiScope[] }) => void }) {
  const { t } = useTranslation(['providerws', 'common']);
  const [name, setName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [email, setEmail] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>(['leads:read', 'events:read']);
  const [terms_, setTerms] = useState(false);
  const toggle = (s: ApiScope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  // V2 (11.10.2026): der Knopf bleibt aktiv; das Absenden prueft. Fehler am
  // Feld, gesammelt ueber dem Knopf (H2), Fokus aufs erste fehlerhafte Feld.
  const [tried, setTried] = useState(false);
  const errorsOf = (): FormError[] => {
    const errs: FormError[] = [];
    if (!name.trim()) errs.push({ id: 'api-name', label: t('apiAccess.nameLabel'), message: t('apiAccess.errors.name') });
    if (!useCase.trim()) errs.push({ id: 'api-use-case', label: t('apiAccess.useCaseLabel'), message: t('apiAccess.errors.useCase') });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errs.push({ id: 'api-contact', label: t('apiAccess.contactLabel'), message: t('common:contactSend.field.email') });
    if (!scopes.length) errs.push({ id: 'api-scopes', label: t('apiAccess.scopesLabel'), message: t('apiAccess.errors.scopes') });
    if (!terms_) errs.push({ id: 'api-terms', label: t('apiAccess.errors.termsLabel'), message: t('apiAccess.errors.terms') });
    return errs;
  };
  const errors = tried ? errorsOf() : [];
  const errFor = (id: string) => errors.find((e) => e.id === id)?.message;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    const now = errorsOf();
    if (now.length) { focusField(now[0].id); return; }
    onSubmit({ name: name.trim(), use_case: useCase.trim(), contact_email: email.trim(), requested_scopes: scopes });
  };
  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      <p className="max-w-2xl text-body-sm leading-relaxed text-fg-secondary">{t('apiAccess.intro')}</p>
      <div className="space-y-1.5">
        <label htmlFor="api-name" className="block text-[12px] font-medium text-fg-secondary">{t('apiAccess.nameLabel')}</label>
        <Input id="api-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('apiAccess.namePh')} maxLength={120} error={!!errFor('api-name')} {...errorAria('api-name', !!errFor('api-name'))} />
        <FieldError id="api-name" message={errFor('api-name')} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="api-use-case" className="block text-[12px] font-medium text-fg-secondary">{t('apiAccess.useCaseLabel')}</label>
        <Textarea id="api-use-case" value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder={t('apiAccess.useCasePh')} rows={3} maxLength={2000} error={!!errFor('api-use-case')} {...errorAria('api-use-case', !!errFor('api-use-case'))} />
        <FieldError id="api-use-case" message={errFor('api-use-case')} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="api-contact" className="block text-[12px] font-medium text-fg-secondary">{t('apiAccess.contactLabel')}</label>
        <Input id="api-contact" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="it@example.com" maxLength={200} error={!!errFor('api-contact')} {...errorAria('api-contact', !!errFor('api-contact'))} />
        <FieldError id="api-contact" message={errFor('api-contact')} />
      </div>
      <div className="space-y-2">
        <span id="api-scopes-label" className="text-[12px] font-medium text-fg-secondary">{t('apiAccess.scopesLabel')}</span>
        <div id="api-scopes" role="group" aria-labelledby="api-scopes-label" {...errorAria('api-scopes', !!errFor('api-scopes'))} className="flex flex-wrap gap-2">
          {REQUESTABLE_SCOPES.map((s) => (
            <label key={s} className={scopes.includes(s)
              ? 'flex cursor-pointer items-center gap-2 rounded-full border border-stroke-brand/50 bg-brand-light px-3 py-1.5 text-[12px] font-medium text-fg-brand'
              : 'flex cursor-pointer items-center gap-2 rounded-full border border-stroke bg-surface px-3 py-1.5 text-[12px] font-medium text-fg-secondary'}>
              <Checkbox size="sm" checked={scopes.includes(s)} onChange={() => toggle(s)} aria-label={s} />
              <Mono>{s}</Mono>
            </label>
          ))}
        </div>
        <FieldError id="api-scopes" message={errFor('api-scopes')} />
        <p className="text-[11px] text-fg-tertiary">{t('apiAccess.scopesNote')}</p>
      </div>
      <div className="space-y-3 border-t border-stroke-subtle pt-3">
        <div>
          <Checkbox id="api-terms" size="sm" checked={terms_} onChange={(e) => setTerms(e.target.checked)} error={!!errFor('api-terms')} {...errorAria('api-terms', !!errFor('api-terms'))} label={<span className="text-body-sm text-fg-secondary">{t('apiAccess.termsAccept', { version: terms })}</span>} />
          <FieldError id="api-terms" message={errFor('api-terms')} />
        </div>
        <FormErrorSummary errors={errors} />
        <div className="flex justify-end">
          <Button size="sm" type="submit" disabled={busy}>{t('apiAccess.submit')}</Button>
        </div>
      </div>
    </form>
  );
}

function EventsAndLog({ log, fmt }: { log: ApiAccessLog; fmt: (iso: string | null | undefined) => string }) {
  const { t } = useTranslation('providerws');
  const tone = (s: number): BadgeTone => (s < 300 ? 'success' : s === 429 ? 'warning' : s >= 500 ? 'error' : 'neutral');
  return (
    <div className="grid gap-5 border-t border-stroke-subtle pt-4 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-baseline gap-2"><Label>{t('apiAccess.events')}</Label><Mono className="text-fg-tertiary">GET /api/v1/ext/events?since=…</Mono></div>
        {log.events.length === 0 ? <p className="text-body-sm text-fg-tertiary">{t('apiAccess.noEvents')}</p> : (
          <ul className="divide-y divide-stroke-subtle rounded-lg border border-stroke">
            {log.events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                <Mono>{e.type}</Mono>
                <span className="ml-auto text-[11px] text-fg-tertiary">{fmt(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-fg-tertiary">{t('apiAccess.eventsNote')}</p>
      </div>
      <div className="space-y-2">
        <Label>{t('apiAccess.calls')}</Label>
        {log.calls.length === 0 ? <p className="text-body-sm text-fg-tertiary">{t('apiAccess.noCalls')}</p> : (
          <ul className="divide-y divide-stroke-subtle rounded-lg border border-stroke">
            {log.calls.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <Mono>{c.method} {c.route.replace('/api/v1', '')}</Mono>
                <Badge tone={tone(c.status)} size="xs" className="ml-auto">{c.status}</Badge>
                <span className="text-[11px] text-fg-tertiary">{fmt(c.at)} · {c.duration_ms} ms</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-fg-tertiary">{t('apiAccess.callsNote', { count: log.today.count, limited: log.today.limited, failed: log.today.failed })}</p>
      </div>
    </div>
  );
}
