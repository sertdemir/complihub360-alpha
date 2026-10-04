import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, FileText, Info, Trash2, Upload } from 'lucide-react';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Banner } from '../../components/ui/Banner';
import { Modal } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/Tag';
import { FormField } from '../../components/ui/FormField';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ApiError, identityHintFrom } from '../../api/client';
import {
  acceptAgreement, checkVatRegistry, createService, fetchApplication, fetchChanges, patchApplication, previewService, putCoverage, removeService, saveService, submitApplication, uploadEvidence, withdrawChange,
  type AgreementType, type Application, type ApplicationPatch, type ChangePreview, type ChecklistItem, type Evidence, type EvidenceType, type ProviderChange, type Service, type ServiceInput,
} from '../../api/application';
import { cn } from '../../lib/utils';

// ─── Provider · Bewerbung (Dossier) ──────────────────────────────────────────
// Figma "Provider · Bewerbung — Dossier v2" (Seite "Provider Onboarding
// (Phase 2)"), Canvas-Wahl 1B (Kapitel) · 2B (Leistung als Stamm, Laender als
// Zeilen) · 3A (Checkliste je Nachweistyp, abgeleitet) · 4A (Annahme je
// Dokument, dann Einreichen). Datenquelle: GET /provider/:key/application —
// die Kapitelzustaende und die Checkliste rechnet die API, die Seite zeigt sie
// nur. Sie erfindet keinen Zustand, den der Server nicht kennt.

const CHAPTERS = ['account', 'legal', 'services', 'evidence', 'agreements', 'submit'] as const;
type ChapterKey = (typeof CHAPTERS)[number];

// Canvas-Wahl 5 V1 (2026-10-01): nach der Pruefung ist die Bewerbung
// abgeschlossen. Dann gibt es kein "Einreichen" mehr, Konto und Rechtsform
// stehen im Lesemodus und oeffnen sich erst ueber "Ändern". Der Hinweis sagt,
// was beim Speichern wirklich passiert — seit dem Change-Control (TKT-PROV-08,
// Canvas A V3): was fuer Nutzer ungünstiger wird, erscheint erst nach der
// Pruefung; alles andere gilt sofort, Rechtsform & Co. prueft das Team danach.
const SETTLED = new Set(['approved_pending_activation', 'active', 'limited', 'reverification_due']);
// Ab hier entscheidet der Server je Feld (changeControl.ts CONTROLLED_LIFECYCLE).
const CONTROLLED = new Set(['active', 'limited', 'reverification_due', 'paused', 'suspended']);
const OPEN = new Set(['submitted', 'under_review']);

const STATE_TONE: Record<ChecklistItem['state'], BadgeTone> = { missing: 'warning', uploading: 'info', received: 'info', reviewed: 'success', rejected: 'error', expired: 'error' };
const COVERAGE_TONE: Record<Service['coverage'][number]['status'], BadgeTone> = { pending: 'warning', approved: 'success', rejected: 'error', limited: 'info', suspended: 'neutral', expired: 'neutral' };
const SERVICE_TONE: Record<Service['status'], BadgeTone> = { draft: 'neutral', pending_verification: 'warning', approved: 'success', limited: 'info', paused: 'neutral', retired: 'neutral' };
// Zwei Stufen (4C): ohne die ersten beiden nehmen wir keine Bewerbung an; die
// Abrechnungsermaechtigung wird gebraucht, bevor Geld fliesst, und darf
// deshalb spaeter kommen. `commercial_terms` fehlt hier bewusst — die
// kommerziellen Bedingungen haengen am Tarif und werden dort gezeigt.
const SUBMIT_AGREEMENTS: AgreementType[] = ['provider_agreement', 'privacy_notice'];
const LATER_AGREEMENTS: AgreementType[] = ['billing_authorization'];
const AGREEMENT_VERSION = '2026-09';

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

function PanelHeader({ n, title, badge }: { n: number; title: string; badge: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-fg">{n} · {title}</h2>
      {badge}
    </div>
  );
}

function StateBadge({ complete, labels }: { complete: boolean; labels: { complete: string; open: string } }) {
  return <Badge tone={complete ? 'success' : 'warning'} size="sm">{complete ? labels.complete : labels.open}</Badge>;
}

/** Lesemodus eines Kapitels (5 V1): Beschriftung ueber Wert, leer als Strich. */
// Im Lesemodus faellt der Eingabehinweis in Klammern weg ("Sprachen (kommagetrennt)").
const ohneHinweis = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '');

function ReadFields({ fields }: { fields: Array<{ label: string; value: string | null | undefined }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[12px] text-fg-tertiary">{ohneHinweis(f.label)}</dt>
          <dd className="mt-0.5 break-words text-[14px] text-fg">{f.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  const { t } = useTranslation('providerws');
  return <Button size="sm" variant="secondary" onClick={onToggle}>{editing ? t('application.cancelEdit') : t('application.edit')}</Button>;
}

export function ApplicationPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const [app, setApp] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ChapterKey>('account');
  const refs = useRef<Record<ChapterKey, HTMLElement | null>>({ account: null, legal: null, services: null, evidence: null, agreements: null, submit: null });

  const [changes, setChanges] = useState<ProviderChange[]>([]);
  const reload = useCallback(() => fetchApplication().then(async (a) => {
    setApp(a); setError(null);
    // Offene und zuletzt entschiedene Vorgaenge (Canvas C V1) — nur, wo es sie geben kann.
    setChanges(CONTROLLED.has(a.provider.lifecycle_status) ? await fetchChanges().catch(() => []) : []);
  }).catch(() => setError(t('application.loadError'))), [t]);
  useEffect(() => { void reload(); }, [reload]);

  const jump = (k: ChapterKey) => { setActive(k); refs.current[k]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const settled = !!app && SETTLED.has(app.provider.lifecycle_status);
  const chapters = settled ? CHAPTERS.filter((k) => k !== 'submit') : CHAPTERS;
  const since = app?.provider.lifecycle_status === 'active' && app.provider.lifecycle_status_since
    ? new Date(app.provider.lifecycle_status_since).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : null;

  const chapterState = (k: ChapterKey): boolean => {
    if (!app) return false;
    if (k === 'submit') return app.chapters.submit.ready;
    return app.chapters[k].complete;
  };

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-5">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('application.title')}</h1>
          <p className="mt-1 max-w-4xl text-body-sm leading-relaxed text-fg-secondary">{t('application.subtitle')}</p>
        </div>

        {error && <Banner status="warning" title={error} />}
        {settled && (
          <Banner status="success" title={since ? t('application.settled.titleSince', { date: since }) : t('application.settled.title')}>
            {t('application.settled.body')}
          </Banner>
        )}
        {!app && !error && (
          <div className="grid gap-4 lg:grid-cols-[264px_1fr]"><Skeleton variant="rect" height={280} /><Skeleton variant="rect" height={480} /></div>
        )}

        {app && (
          <div className="grid items-start gap-5 lg:grid-cols-[264px_1fr]">
            {/* Kapitel-Navigation (1B) */}
            <aside className="lg:sticky lg:top-2">
              <Card styleVariant="outlined" className="p-2">
                <ol className="space-y-0.5">
                  {chapters.map((k, i) => {
                    const done = chapterState(k);
                    const isActive = active === k;
                    return (
                      <li key={k}>
                        <button type="button" onClick={() => jump(k)} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors', isActive ? 'bg-brand/10 font-medium text-fg' : 'text-fg-secondary hover:bg-surface-secondary')}>
                          <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', done ? 'bg-success-500 text-white' : isActive ? 'bg-brand text-fg-on-brand' : 'border border-stroke text-fg-tertiary')}>
                            {done ? <CheckCircle2 size={14} /> : i + 1}
                          </span>
                          {t(`application.chapter.${k}`)}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
              <p className="mt-3 px-3 text-[12px] leading-relaxed text-fg-tertiary">{settled ? t('application.settled.navHint') : t('application.navHint')}</p>
            </aside>

            <div className="space-y-4">
              <section ref={(el) => { refs.current.account = el; }}><AccountPanel app={app} settled={settled} onSaved={reload} /></section>
              <section ref={(el) => { refs.current.legal = el; }}><LegalPanel app={app} settled={settled} onSaved={reload} /></section>
              <section ref={(el) => { refs.current.services = el; }}><ServicesPanel app={app} changes={changes} onChanged={reload} /></section>
              <section ref={(el) => { refs.current.evidence = el; }}><EvidencePanel app={app} locale={locale} onChanged={reload} /></section>
              <section ref={(el) => { refs.current.agreements = el; }}><AgreementsPanel app={app} locale={locale} onChanged={reload} /></section>
              {!settled && <section ref={(el) => { refs.current.submit = el; }}><SubmitPanel app={app} onChanged={reload} /></section>}
            </div>
          </div>
        )}
      </div>
    </ProviderShell>
  );
}

// ─── 1 · Konto ────────────────────────────────────────────────────────────────

function useSave(onSaved: () => Promise<void> | void) {
  const { t } = useTranslation('providerws');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const save = async (patch: ApplicationPatch) => {
    setState('saving');
    try { await patchApplication(patch); await onSaved(); setState('saved'); setTimeout(() => setState('idle'), 2000); return true; }
    catch { setState('error'); return false; }
  };
  const label = state === 'saving' ? t('application.saving') : state === 'saved' ? t('application.saved') : t('application.save');
  return { save, state, label };
}

function AccountPanel({ app, settled, onSaved }: { app: Application; settled: boolean; onSaved: () => Promise<void> | void }) {
  const { t } = useTranslation('providerws');
  const p = app.provider;
  const [editing, setEditing] = useState(!settled);
  const [f, setF] = useState({ name: p.name ?? '', contact_email: p.contact_email ?? '', website_url: p.website_url ?? '', languages: (p.languages ?? []).join(', '), region: p.region ?? '' });
  const { save, state, label } = useSave(onSaved);
  const labels = { complete: t('application.state.complete'), open: t('application.state.open') };
  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={1} title={t('application.chapter.account')} badge={<div className="flex items-center gap-2"><StateBadge complete={app.chapters.account.complete} labels={labels} />{settled && <EditToggle editing={editing} onToggle={() => setEditing(!editing)} />}</div>} />
      {!editing ? (
        <ReadFields fields={[
          { label: t('application.account.name'), value: p.name }, { label: t('application.account.email'), value: p.contact_email },
          { label: t('application.account.website'), value: p.website_url }, { label: t('application.account.region'), value: p.region },
          { label: t('application.account.languages'), value: (p.languages ?? []).join(', ') },
        ]} />
      ) : (<>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t('application.account.name')} required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
        <FormField label={t('application.account.email')} required><Input type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></FormField>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_200px_200px]">
        <FormField label={t('application.account.website')}><Input value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} placeholder="https://" /></FormField>
        <FormField label={t('application.account.languages')}><Input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} /></FormField>
        <FormField label={t('application.account.region')}><Input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} /></FormField>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" disabled={state === 'saving'} onClick={async () => { if (await save({ name: f.name, contact_email: f.contact_email, website_url: f.website_url, languages: f.languages.split(',').map((s) => s.trim()).filter(Boolean), region: f.region }) && settled) setEditing(false); }}>{label}</Button>
        {state === 'error' && <span className="text-[12px] text-error-500">{t('application.saveError')}</span>}
      </div>
      </>)}
    </Card>
  );
}

// ─── 2 · Rechtsform ──────────────────────────────────────────────────────────

function LegalPanel({ app, settled, onSaved }: { app: Application; settled: boolean; onSaved: () => Promise<void> | void }) {
  const { t, i18n } = useTranslation('providerws');
  const c = app.confidential;
  const [editing, setEditing] = useState(!settled);
  const [f, setF] = useState({ entity_type: c?.entity_type ?? '', registration_number: c?.registration_number ?? '', registered_address: c?.registered_address ?? '', representative_name: c?.representative_name ?? '', representative_title: c?.representative_title ?? '', insurance_provider: c?.insurance_provider ?? '', insurance_valid_until: c?.insurance_valid_until ?? '' });
  const { save, state, label } = useSave(onSaved);
  const labels = { complete: t('application.state.complete'), open: t('application.state.open') };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={2} title={t('application.chapter.legal')} badge={<div className="flex items-center gap-2"><StateBadge complete={app.chapters.legal.complete} labels={labels} />{settled && <EditToggle editing={editing} onToggle={() => setEditing(!editing)} />}</div>} />
      <p className="text-[12px] text-fg-tertiary">{t('application.legal.note')}</p>
      {!editing ? (
        <ReadFields fields={[
          { label: t('application.legal.entityType'), value: c?.entity_type }, { label: t('application.legal.registrationNumber'), value: c?.registration_number },
          { label: t('application.legal.registeredAddress'), value: c?.registered_address },
          { label: t('application.legal.representative'), value: [c?.representative_name, c?.representative_title].filter(Boolean).join(' · ') },
          { label: t('application.legal.insuranceProvider'), value: c?.insurance_provider },
          { label: t('application.legal.insuranceValidUntil'), value: fmtDate(c?.insurance_valid_until, i18n.resolvedLanguage || 'en') },
        ]} />
      ) : (<>
      <div className="grid gap-4 md:grid-cols-[200px_1fr_240px]">
        <FormField label={t('application.legal.entityType')} required><Input value={f.entity_type} onChange={set('entity_type')} /></FormField>
        <FormField label={t('application.legal.registrationNumber')} required><Input value={f.registration_number} onChange={set('registration_number')} /></FormField>
        <FormField label={t('application.evidence.type.vat_id')}><Input value={app.provider.vat_id ?? ''} readOnly /></FormField>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t('application.legal.registeredAddress')} required><Input value={f.registered_address} onChange={set('registered_address')} /></FormField>
        <div className="grid gap-4 md:grid-cols-[1fr_160px]">
          <FormField label={t('application.legal.representative')} required><Input value={f.representative_name} onChange={set('representative_name')} /></FormField>
          <FormField label={t('application.legal.representativeTitle')}><Input value={f.representative_title} onChange={set('representative_title')} /></FormField>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <FormField label={t('application.legal.insuranceProvider')}><Input value={f.insurance_provider} onChange={set('insurance_provider')} /></FormField>
        <FormField label={t('application.legal.insuranceValidUntil')}><Input type="date" value={f.insurance_valid_until} onChange={set('insurance_valid_until')} /></FormField>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" disabled={state === 'saving'} onClick={async () => { if (await save(f) && settled) setEditing(false); }}>{label}</Button>
        {state === 'error' && <span className="text-[12px] text-error-500">{t('application.saveError')}</span>}
      </div>
      </>)}
    </Card>
  );
}

// ─── 3 · Leistungen & Laender (2B) ───────────────────────────────────────────

function ServicesPanel({ app, changes, onChanged }: { app: Application; changes: ProviderChange[]; onChanged: () => Promise<void> | void }) {
  const { t } = useTranslation('providerws');
  const [open, setOpen] = useState<string | null>(app.services[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const labels = { complete: t('application.state.complete'), open: t('application.state.open') };

  const add = async () => {
    setBusy(true); setErr(null);
    try { const s = await createService({ service_code: code.trim(), service_name: name.trim() || undefined }); setOpen(s.id); setAdding(false); setCode(''); setName(''); await onChanged(); }
    catch (e) { setErr(identityHintFrom(e, t) ?? (e instanceof ApiError && e.status === 422 && /categor/i.test(e.message) ? t('application.services.allowanceError') : (e instanceof Error ? e.message : t('application.saveError')))); }
    finally { setBusy(false); }
  };

  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={3} title={t('application.chapter.services')} badge={<StateBadge complete={app.chapters.services.complete} labels={labels} />} />
      <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('application.services.intro')}</p>
      {app.services.length === 0 && !adding && <EmptyState size="compact" title={t('application.services.empty')} action={<Button size="sm" onClick={() => setAdding(true)}>{t('application.services.add')}</Button>} />}
      {app.services.filter((s) => s.status !== 'retired').map((s) => (
        <ServiceCard key={s.id} service={s} changes={changes.filter((c) => c.service_id === s.id)} expanded={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onChanged={onChanged} />
      ))}
      {adding ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-stroke p-3">
          <FormField label={t('application.services.codePlaceholder')} className="min-w-[240px] flex-1"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="tax-vat.returns" /></FormField>
          <FormField label={t('application.services.namePlaceholder')} className="min-w-[240px] flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <Button size="sm" disabled={busy || !code.trim()} onClick={add}>{t('application.services.add')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{t('application.agreements.cancel')}</Button>
          {err && <span className="basis-full text-[12px] text-error-500">{err}</span>}
        </div>
      ) : (
        app.services.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>{t('application.services.add')}</Button>
            <span className="max-w-xl text-[12px] text-fg-tertiary">{t('application.services.allowanceHint')}</span>
          </div>
        )
      )}
    </Card>
  );
}

// ─── Change-Control an der Leistung (Canvas B V2 · C V1, 2026-10-01) ─────────
// B V2: "Konditionen ändern" fragt vor dem Absenden per dry_run, was sofort
// gilt und was wartet — die Zusammenfassung erscheint nur, wenn etwas wartet.
// C V1: ein wartender Wert steht am Feld neben dem Live-Wert, mit "in Prüfung
// seit" und "Änderung zurückziehen". Das Formular ist mit dem WARTENDEN Wert
// vorbelegt (die Absicht des Partners) und schickt nur geaenderte Felder —
// passend zur Server-Regel "gleich Live ist keine Aenderung".

const TERMS = ['price_min', 'price_max', 'completion_days_estimate', 'response_time_hours'] as const;
type TermKey = (typeof TERMS)[number];

function useTermFormat() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  return (field: string, v: unknown, currency: string | null) => {
    if (v == null || v === '') return '—';
    if (field === 'price_min' || field === 'price_max') return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(Number(v));
    if (field === 'completion_days_estimate') return t('application.change.days', { count: Number(v) });
    if (field === 'response_time_hours') return t('application.change.hours', { count: Number(v) });
    return Array.isArray(v) ? v.join(', ') : String(v);
  };
}

function ServiceCard({ service: s, changes, expanded, onToggle, onChanged }: { service: Service; changes: ProviderChange[]; expanded: boolean; onToggle: () => void; onChanged: () => Promise<void> | void }) {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const fmt = useTermFormat();
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const codes = useMemo(() => s.coverage.map((c) => c.country_code), [s.coverage]);
  const setCountries = async (next: string[]) => { setBusy(true); try { await putCoverage(s.id, next); await onChanged(); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { await removeService(s.id); await onChanged(); } finally { setBusy(false); } };
  const Chevron = expanded ? ChevronDown : ChevronRight;

  const pending = changes.find((c) => c.effect === 'held' && OPEN.has(c.status)) ?? null;
  const pendingValue = (k: string) => (pending?.new_value && k in pending.new_value ? pending.new_value[k] : undefined);
  // Die letzte Entscheidung, die der Partner lesen soll: abgelehnt oder Nachweis verlangt.
  const lastWord = changes.filter((c) => (c.status === 'rejected' || (c.status === 'under_review' && c.requires_reverification)) && c.reviewer_note)
    .sort((a, b) => String(b.reviewed_at ?? '').localeCompare(String(a.reviewed_at ?? '')))[0] ?? null;
  const fieldList = (c: ProviderChange) => (c.field_path ?? '').split(',').filter(Boolean).map((f) => t(`application.change.field.${f}`, { defaultValue: f })).join(', ');
  const since = pending ? new Date(pending.submitted_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) : '';

  const withdraw = async () => {
    if (!pending) return;
    setBusy(true);
    try { await withdrawChange(pending.id); await onChanged(); } finally { setBusy(false); }
  };

  const priceLive = s.price_min != null || s.price_max != null ? `${fmt('price_min', s.price_min, s.currency)} – ${fmt('price_max', s.price_max, s.currency)}` : '—';
  const pricePending = pendingValue('price_min') !== undefined || pendingValue('price_max') !== undefined
    ? `${fmt('price_min', pendingValue('price_min') ?? s.price_min, s.currency)} – ${fmt('price_max', pendingValue('price_max') ?? s.price_max, s.currency)}` : null;
  const otherPending = pending ? Object.keys(pending.new_value ?? {}).filter((k) => !TERMS.includes(k as TermKey)) : [];

  const Pending = ({ value }: { value: string | null }) => value == null ? null : (
    <span className="mt-1 flex flex-wrap items-center gap-2">
      <span className="font-semibold text-fg-brand">{value}</span>
      <Badge tone="warning" size="sm">{t('application.change.pendingSince', { date: since })}</Badge>
    </span>
  );
  const term = (k: TermKey) => {
    const p = pendingValue(k);
    return { live: fmt(k, s[k], s.currency), pending: p === undefined ? null : fmt(k, p, s.currency) };
  };
  const days = term('completion_days_estimate');
  const hours = term('response_time_hours');

  return (
    <div className="rounded-lg border border-stroke">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Chevron size={16} className="shrink-0 text-fg-tertiary" />
        <span className="text-[14px] font-medium text-fg">{s.service_name}</span>
        <Tag tone="neutral">{s.service_code}</Tag>
        <span className="ml-auto flex items-center gap-3">
          {pending && <Badge tone="warning" size="sm">{t('application.change.pendingShort')}</Badge>}
          <Badge tone={SERVICE_TONE[s.status]} size="sm">{t(`application.services.status.${s.status}`)}</Badge>
          <span className="text-[12px] text-fg-tertiary">{t('application.services.countries', { count: s.coverage.length })}</span>
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-stroke-subtle px-4 pb-4 pt-3">
          {editing ? (
            <TermsEditor service={s} pending={pending} onDone={async (msg) => { setEditing(false); setNotice(msg); await onChanged(); }} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-3 text-[12px] text-fg-secondary md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                  <div>
                    <span className="block text-fg-tertiary">{t('application.services.priceRange')}</span>
                    <span>{priceLive}{pricePending && <span className="text-fg-tertiary"> · {t('application.change.live')}</span>}</span>
                    <Pending value={pricePending} />
                  </div>
                  <div><span className="block text-fg-tertiary">{t('application.change.field.completion_days_estimate')}</span>{days.live}<Pending value={days.pending} /></div>
                  <div><span className="block text-fg-tertiary">{t('application.services.responseTime')}</span>{hours.live}<Pending value={hours.pending} /></div>
                  <div><span className="block text-fg-tertiary">{t('application.services.capacity')}</span>{s.capacity_status}</div>
                </div>
                {s.status !== 'retired' && <Button size="sm" variant="secondary" onClick={() => { setNotice(null); setEditing(true); }}>{t('application.change.edit')}</Button>}
              </div>
              {otherPending.length > 0 && <p className="text-[12px] text-fg-tertiary">{t('application.change.morePending', { fields: otherPending.map((f) => t(`application.change.field.${f}`, { defaultValue: f })).join(', ') })}</p>}
              {pending && <button type="button" disabled={busy} onClick={withdraw} className="text-[12px] font-medium text-fg-brand underline underline-offset-2 hover:no-underline">{t('application.change.withdraw')}</button>}
              {notice && <p className="text-[12px] text-fg-secondary">{notice}</p>}
              {lastWord && (
                <div className="rounded-md bg-surface-secondary px-3 py-2 text-[12.5px] text-fg-secondary">
                  {lastWord.status === 'rejected'
                    ? <><span className="font-semibold text-fg">{t('application.change.rejected', { fields: fieldList(lastWord) })}</span> {t('application.change.reviewerSays', { note: lastWord.reviewer_note })}</>
                    : <span>{t('application.change.reverification', { note: lastWord.reviewer_note })}</span>}
                </div>
              )}
            </>
          )}
          <div className="overflow-hidden rounded-md border border-stroke-subtle">
            <div className="grid grid-cols-[180px_160px_170px_1fr_40px] bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">
              <span>{t('application.services.colCountry')}</span><span>{t('application.services.colJurisdiction')}</span><span>{t('application.services.colStatus')}</span><span>{t('application.services.colNote')}</span><span />
            </div>
            {s.coverage.map((c) => (
              <div key={c.id} className="grid grid-cols-[180px_160px_170px_1fr_40px] items-center border-t border-stroke-subtle px-3 py-2 text-[13px]">
                <span className="flex items-center gap-2"><Tag tone="neutral">{c.country_code}</Tag></span>
                <span className="text-fg-secondary">{c.jurisdiction_code ?? t('application.services.wholeCountry')}</span>
                <span><Badge tone={COVERAGE_TONE[c.status]} size="sm">{t(`application.coverageStatus.${c.status}`)}</Badge></span>
                <span className="text-fg-tertiary">{c.limitations ?? '—'}</span>
                <button type="button" aria-label={t('application.services.remove')} disabled={busy} onClick={() => setCountries(codes.filter((x) => x !== c.country_code))} className="justify-self-end text-fg-tertiary hover:text-error-500"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input inputSize="sm" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder={t('application.services.countryPlaceholder')} className="w-[140px]" />
            <Button size="sm" variant="ghost" disabled={busy || !/^[A-Z]{2}$/.test(country) || codes.includes(country)} onClick={() => { void setCountries([...codes, country]); setCountry(''); }}>{t('application.services.addCountry')}</Button>
            <span className="ml-auto text-[12px] text-fg-tertiary">{t('application.services.licenceHint')}</span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>{s.status === 'approved' || s.status === 'limited' ? t('application.services.retire') : t('application.services.remove')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TermsEditor({ service: s, pending, onDone, onCancel }: { service: Service; pending: ProviderChange | null; onDone: (notice: string) => void | Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation('providerws');
  const fmt = useTermFormat();
  const start = (k: TermKey) => {
    const p = pending?.new_value && k in pending.new_value ? pending.new_value[k] : s[k];
    return p == null ? '' : String(p);
  };
  const [form, setForm] = useState<Record<TermKey, string>>(() => Object.fromEntries(TERMS.map((k) => [k, start(k)])) as Record<TermKey, string>);
  const [preview, setPreview] = useState<{ patch: Partial<ServiceInput>; result: ChangePreview } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Nur geaenderte Felder — gemessen am vorbelegten Wert, nicht am Live-Wert.
  const dirty = (): Partial<ServiceInput> => {
    const out: Record<string, number | null> = {};
    for (const k of TERMS) if (form[k] !== start(k)) out[k] = form[k].trim() === '' ? null : Number(form[k]);
    return out as Partial<ServiceInput>;
  };
  const invalid = TERMS.some((k) => form[k].trim() !== '' && !(Number(form[k]) >= 0));

  const next = async () => {
    const patch = dirty();
    if (!Object.keys(patch).length) { onCancel(); return; }
    setBusy(true); setErr(null);
    try {
      const result = await previewService(s.id, patch);
      if (result.held.length) setPreview({ patch, result });
      else { await saveService(s.id, patch); await onDone(t('application.change.saved')); }
    } catch (e) { setErr(identityHintFrom(e, t) ?? (e instanceof Error ? e.message : t('application.saveError'))); }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (!preview) return;
    setBusy(true); setErr(null);
    try { await saveService(s.id, preview.patch); await onDone(t('application.change.sent')); }
    catch (e) { setErr(e instanceof Error ? e.message : t('application.saveError')); }
    finally { setBusy(false); }
  };

  if (preview) {
    const { held, review, instant } = preview.result;
    const now = [...review, ...instant.filter((k) => !review.some((f) => f.field === k)).map((k) => ({ field: k, old: (s as unknown as Record<string, unknown>)[k], new: (preview.patch as Record<string, unknown>)[k], change_type: '' }))];
    const Line = ({ f }: { f: { field: string; old: unknown; new: unknown } }) => (
      <div className="grid grid-cols-[120px_1fr] items-baseline gap-2 text-[13px]">
        <span className="text-[12px] text-fg-tertiary">{t(`application.change.field.${f.field}`, { defaultValue: f.field })}</span>
        <span><span className="text-fg-tertiary line-through">{fmt(f.field, f.old, s.currency)}</span> → <span className="font-semibold text-fg-brand">{fmt(f.field, f.new, s.currency)}</span></span>
      </div>
    );
    return (
      <div className="space-y-3 rounded-lg border border-stroke-brand p-4" role="region" aria-label={t('application.change.summaryTitle')}>
        <p className="text-[15px] font-semibold text-fg">{t('application.change.summaryTitle')}</p>
        <div className="space-y-1.5 rounded-md bg-surface-secondary px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('application.change.groupHeld')}</p>
          {held.map((f) => <Line key={f.field} f={f} />)}
        </div>
        {now.length > 0 && (
          <div className="space-y-1.5 rounded-md bg-surface-secondary px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('application.change.groupInstant')}</p>
            {now.map((f) => <Line key={f.field} f={f} />)}
          </div>
        )}
        <p className="text-[12.5px] text-fg-secondary">{t('application.change.summaryNote')}</p>
        {err && <p className="text-[12px] text-error-500">{err}</p>}
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={send}>{t('application.change.send')}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPreview(null)}>{t('application.change.back')}</Button>
        </div>
      </div>
    );
  }

  const label = (k: TermKey) => k === 'price_min' || k === 'price_max'
    ? t(`application.change.form.${k}`, { currency: s.currency || 'EUR' }) : t(`application.change.form.${k}`);
  return (
    <div className="space-y-3 rounded-lg border border-stroke p-4">
      <p className="text-[13px] font-semibold text-fg">{t('application.change.edit')}</p>
      <div className="grid gap-3 md:grid-cols-4">
        {TERMS.map((k) => (
          <FormField key={k} label={label(k)}>
            <Input inputSize="sm" type="number" min={0} inputMode="numeric" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </FormField>
        ))}
      </div>
      {err && <p className="text-[12px] text-error-500">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || invalid} onClick={next}>{t('application.change.next')}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>{t('application.change.cancel')}</Button>
      </div>
    </div>
  );
}

// ─── 4 · Nachweise (3A) ──────────────────────────────────────────────────────

function EvidencePanel({ app, locale, onChanged }: { app: Application; locale: string; onChanged: () => Promise<void> | void }) {
  const { t } = useTranslation('providerws');
  const [vat, setVat] = useState(app.provider.vat_id ?? '');
  const [vatNote, setVatNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<ChecklistItem | null>(null);
  const reviewed = app.checklist.filter((c) => c.state === 'reviewed').length;
  const byId = (id: string | null): Evidence | undefined => app.evidence.find((e) => e.id === id);

  const pick = (item: ChecklistItem) => { pending.current = item; fileInput.current?.click(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const item = pending.current; e.target.value = '';
    if (!file || !item) return;
    setBusy(item.type + (item.country_code ?? '')); setErr(null);
    try {
      await uploadEvidence(file, { evidence_type: item.type as Exclude<EvidenceType, 'vat_id'>, supports_service_codes: item.service_code ? [item.service_code] : [], supports_countries: item.country_code ? [item.country_code] : [] });
      await onChanged();
    } catch { setErr(t('application.evidence.uploadError')); } finally { setBusy(null); }
  };
  const registry = async () => {
    setBusy('vat'); setVatNote(null);
    try {
      const r = await checkVatRegistry(vat);
      setVatNote(r.vat.status === 'valid' ? t('application.evidence.registryValid') : r.vat.status === 'invalid' ? t('application.evidence.registryInvalid') : t('application.evidence.registryUnavailable'));
      await onChanged();
    } catch { setVatNote(t('application.evidence.registryUnavailable')); } finally { setBusy(null); }
  };

  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={4} title={t('application.chapter.evidence')} badge={<Badge tone={reviewed === app.checklist.length ? 'success' : 'warning'} size="sm">{reviewed} / {app.checklist.length}</Badge>} />
      <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('application.evidence.intro')}</p>
      <input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={onFile} />
      {err && <Banner status="warning" title={err} />}
      <div className="divide-y divide-stroke-subtle overflow-hidden rounded-md border border-stroke-subtle">
        {app.checklist.map((item) => {
          const ev = byId(item.evidence_id);
          const key = item.type + (item.country_code ?? '');
          const isVat = item.type === 'vat_id';
          const isRep = item.type === 'representative_identity';
          const Icon = item.state === 'reviewed' ? CheckCircle2 : item.state === 'missing' ? Upload : item.state === 'rejected' ? AlertCircle : isRep ? Info : FileText;
          const iconTone = item.state === 'reviewed' ? 'text-success-600' : item.state === 'rejected' ? 'text-error-500' : item.state === 'missing' ? 'text-warning-600' : 'text-fg-tertiary';
          return (
            <div key={key} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <Icon size={18} className={cn('mt-0.5 shrink-0', iconTone)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">
                  {t(`application.evidence.type.${item.type}`)}{item.country_code ? ` · ${item.country_code}` : ''}
                  <span className="ml-2 text-[11px] font-normal text-fg-tertiary">{item.service_code ?? t('application.evidence.scopeAccount')} · {item.source === 'document' ? t('application.evidence.scopeDocument') : t('application.evidence.scopeRegistry')}</span>
                </p>
                <p className="text-[12px] text-fg-tertiary">
                  {isVat && (ev ? `${ev.identifier ?? ''} · ${t('application.evidence.registryHint')}` : t('application.evidence.registryHint'))}
                  {isRep && t('application.evidence.reviewerHint')}
                  {!isVat && !isRep && (ev?.original_name ? `${ev.original_name} · ${fmtSize(ev.size_bytes)} · ${t('application.evidence.uploadedOn', { date: fmtDate(ev.uploaded_at, locale) })}` : item.type === 'professional_licence' ? `${t('application.evidence.licenceHint')} ${t('application.evidence.uploadHint')}` : t('application.evidence.uploadHint'))}
                </p>
                {isVat && item.state !== 'reviewed' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input inputSize="sm" value={vat} onChange={(e) => setVat(e.target.value)} placeholder={t('application.evidence.vatPlaceholder')} className="w-[200px]" />
                    <Button size="sm" variant="secondary" disabled={busy === 'vat' || vat.trim().length < 4} onClick={registry}>{t('application.evidence.checkRegistry')}</Button>
                    {vatNote && <span className="text-[12px] text-fg-secondary">{vatNote}</span>}
                  </div>
                )}
              </div>
              <Badge tone={STATE_TONE[item.state]} size="sm" className="mt-0.5">{t(`application.evidence.state.${item.state}`)}</Badge>
              <div className="w-[120px] text-right">
                {item.source === 'document' && (
                  <Button size="sm" variant={item.state === 'missing' || item.state === 'rejected' ? 'secondary' : 'ghost'} disabled={busy === key} onClick={() => pick(item)}>
                    {item.state === 'missing' || item.state === 'rejected' ? t('application.evidence.upload') : t('application.evidence.replace')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── 5 · Annahmen, zwei Stufen (4C) ─────────────────────────────────────────

function AgreementsPanel({ app, locale, onChanged }: { app: Application; locale: string; onChanged: () => Promise<void> | void }) {
  const { t, i18n } = useTranslation('providerws');
  const [modal, setModal] = useState<AgreementType | null>(null);
  const [name, setName] = useState(app.confidential?.representative_name ?? '');
  const [title, setTitle] = useState(app.confidential?.representative_title ?? '');
  const [busy, setBusy] = useState(false);
  const done = SUBMIT_AGREEMENTS.filter((a) => app.agreements.some((x) => x.agreement_type === a));
  const accept = async () => {
    if (!modal) return;
    setBusy(true);
    try { await acceptAgreement({ agreement_type: modal, version: AGREEMENT_VERSION, language: i18n.resolvedLanguage || 'en', accepted_by_name: name.trim(), accepted_by_title: title.trim() || undefined }); setModal(null); await onChanged(); }
    finally { setBusy(false); }
  };
  // Eine fehlende Annahme der zweiten Stufe ist kein Mangel: sie bekommt
  // deshalb keinen Warnrahmen, sondern denselben ruhigen wie eine erteilte.
  const row = (a: AgreementType, pflicht: boolean) => {
    const acc = app.agreements.find((x) => x.agreement_type === a);
    return (
      <div key={a} className={cn('flex flex-wrap items-start gap-3 rounded-md border px-4 py-3', acc || !pflicht ? 'border-stroke-subtle' : 'border-warning-500/50')}>
        <Checkbox checked={!!acc} readOnly aria-label={t(`application.agreements.doc.${a}`)} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">{t(`application.agreements.doc.${a}`)} <span className="ml-2 text-[11px] font-normal text-fg-tertiary">{t('application.agreements.version', { version: acc?.version ?? AGREEMENT_VERSION, language: (acc?.language ?? i18n.resolvedLanguage ?? 'en').toUpperCase() })}</span></p>
          <p className="text-[12px] text-fg-tertiary">{acc ? t('application.agreements.acceptedOn', { date: fmtDate(acc.accepted_at, locale), name: acc.accepted_by_name ?? '' }) : `${t('application.agreements.notAccepted')}${a === 'billing_authorization' ? ' ' + t('application.agreements.billingNote') : ''}`}</p>
        </div>
        <Button size="sm" variant={acc ? 'ghost' : 'secondary'} onClick={() => setModal(a)}>{acc ? t('application.agreements.open') : t('application.agreements.accept')}</Button>
      </div>
    );
  };
  const group = (titel: string, marke: string, hinweis: string, typen: AgreementType[], pflicht: boolean) => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-[12px] font-semibold text-fg">{titel}</h3>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]',
          pflicht ? 'bg-warning-50 text-warning-700' : 'bg-surface-secondary text-fg-tertiary')}>{marke}</span>
      </div>
      <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{hinweis}</p>
      {typen.map((a) => row(a, pflicht))}
    </div>
  );
  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={5} title={t('application.chapter.agreements')} badge={<Badge tone={done.length === SUBMIT_AGREEMENTS.length ? 'success' : 'warning'} size="sm">{done.length} / {SUBMIT_AGREEMENTS.length}</Badge>} />
      <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('application.agreements.intro')}</p>
      <div className="space-y-5">
        {group(t('application.agreements.groupSubmit'), t('application.agreements.tagRequired'), t('application.agreements.groupSubmitHint'), SUBMIT_AGREEMENTS, true)}
        {group(t('application.agreements.groupLater'), t('application.agreements.tagLater'), t('application.agreements.groupLaterHint'), LATER_AGREEMENTS, false)}
        <p className="max-w-3xl text-[12px] leading-relaxed text-fg-tertiary">{t('application.agreements.commercialNote')}</p>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal ? t('application.agreements.acceptTitle', { doc: t(`application.agreements.doc.${modal}`) }) : ''} size="md"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>{t('application.agreements.cancel')}</Button><Button disabled={busy || !name.trim()} onClick={accept}>{t('application.agreements.confirm', { version: AGREEMENT_VERSION })}</Button></div>}>
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-fg-secondary">{modal === 'billing_authorization' ? t('application.agreements.billingNote') : t('application.agreements.intro')}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label={t('application.agreements.nameLabel')} required><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
            <FormField label={t('application.agreements.titleLabel')}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── 6 · Einreichen (4A) ─────────────────────────────────────────────────────

function SubmitPanel({ app, onChanged }: { app: Application; onChanged: () => Promise<void> | void }) {
  const { t } = useTranslation('providerws');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const missing = app.chapters.submit.missing;
  const submittable = app.provider.lifecycle_status === 'draft' || app.provider.lifecycle_status === 'more_info_required';
  const countries = new Set(app.services.flatMap((s) => s.coverage.map((c) => c.country_code)));
  const agreementsDone = SUBMIT_AGREEMENTS.filter((a) => app.agreements.some((x) => x.agreement_type === a)).length;
  const submit = async () => {
    setBusy(true); setNote(null);
    try { const r = await submitApplication(); setNote(r.ok ? t('application.submit.done') : null); await onChanged(); }
    catch (e) { setNote(e instanceof ApiError && e.status === 409 ? t('application.submit.notSubmittable') : t('application.saveError')); }
    finally { setBusy(false); }
  };
  return (
    <Card styleVariant="outlined" className="space-y-4 p-5">
      <PanelHeader n={6} title={t('application.chapter.submit')} badge={<Badge tone={app.chapters.submit.ready ? 'success' : 'neutral'} size="sm">{app.chapters.submit.ready ? t('application.state.ready') : t('application.state.notReady')}</Badge>} />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-fg">{t('application.submit.missingTitle')}</p>
          {missing.length === 0 && <p className="text-[12px] text-fg-tertiary">—</p>}
          {missing.map((m) => <p key={m} className="flex items-center gap-2 text-[13px] text-fg"><AlertCircle size={15} className="text-warning-600" />{t(`application.missing.${m}`)}</p>)}
          <p className="pt-1 text-[12px] leading-relaxed text-fg-tertiary">{t('application.submit.licenceNote')}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-fg">{t('application.submit.readyTitle')}</p>
          {app.chapters.account.complete && app.chapters.legal.complete && <p className="flex items-center gap-2 text-[13px] text-fg-secondary"><CheckCircle2 size={15} className="text-success-600" />{t('application.submit.ready.accountLegal')}</p>}
          {app.services.length > 0 && <p className="flex items-center gap-2 text-[13px] text-fg-secondary"><CheckCircle2 size={15} className="text-success-600" />{t('application.submit.ready.services', { services: app.services.filter((s) => s.status !== 'retired').length, countries: countries.size })}</p>}
          {app.chapters.evidence.complete && <p className="flex items-center gap-2 text-[13px] text-fg-secondary"><CheckCircle2 size={15} className="text-success-600" />{t('application.submit.ready.evidence')}</p>}
          <p className="flex items-center gap-2 text-[13px] text-fg-secondary"><CheckCircle2 size={15} className={agreementsDone === SUBMIT_AGREEMENTS.length ? 'text-success-600' : 'text-fg-tertiary'} />{t('application.submit.ready.agreements', { done: agreementsDone, total: SUBMIT_AGREEMENTS.length })}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button size="lg" disabled={busy || !app.chapters.submit.ready || !submittable} onClick={submit}>{t('application.submit.cta')}</Button>
        <span className="max-w-xl text-[12px] leading-relaxed text-fg-tertiary">{note ?? t('application.submit.note')}</span>
      </div>
    </Card>
  );
}
