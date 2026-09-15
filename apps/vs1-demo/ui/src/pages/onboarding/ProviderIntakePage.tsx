import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FilterChip } from '../../components/ui/Badge';
import { Banner } from '../../components/ui/Banner';
import { LogoMark } from '../../components/ui/Logo';
import { apiFetch } from '../../api/client';
import { DOMAINS } from '../../lib/domains';
import type { BillingModel } from '../../api/provider';

// ─── Provider Intake (v2 §10, D7) ────────────────────────────────────────────
// Providers are recruited offline/B2B and onboard via THIS token-gated link —
// there is no self-registration. The submitted package lands as
// partner_status='inactive' and goes through manual vetting before activation.
// Without a valid ?token= the page shows the invite-only notice.

export function ProviderIntakePage() {
  const { t } = useTranslation('providerws');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [countries, setCountries] = useState('');
  const [languages, setLanguages] = useState('');
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [billing, setBilling] = useState<BillingModel>('project');
  const [pseudonym, setPseudonym] = useState('');
  const [region, setRegion] = useState('');
  const [activeSince, setActiveSince] = useState('');
  const [certs, setCerts] = useState('');
  const [statutes, setStatutes] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const canSubmit = useMemo(() => name.trim().length > 1 && statutes && state !== 'sending', [name, statutes, state]);

  const submit = async () => {
    setState('sending');
    try {
      await apiFetch('/api/v1/provider/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_token: token,
          name: name.trim(),
          website_url: website.trim() || null,
          countries_supported: countries.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
          languages: languages.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
          categories: [...cats],
          billing_model: billing,
          pseudonym_label: pseudonym.trim() || null,
          region: region.trim() || null,
          active_since: parseInt(activeSince, 10) || null,
          certifications: certs.split('\n').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="dark min-h-screen bg-[#1F2937] px-6 py-10 text-fg">
      <div className="mx-auto max-w-[720px] space-y-6">
        <div className="flex items-center gap-2.5">
          <LogoMark tone="on-petrol" className="h-[24px] w-auto" />
          <span className="text-[15px] font-semibold text-white">CompliHub360</span>
          <span className="text-[11px] font-semibold tracking-[0.12em] text-[#d4af37]">· PARTNER INTAKE</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="rounded-xl border border-stroke bg-surface-secondary/40 p-8">
        <h1 className="font-serif text-[26px] font-bold text-fg">{t('intake.inviteOnlyTitle')}</h1>
        <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('intake.inviteOnlyBody')}</p>
        <p className="mt-4 text-[12px] text-fg-tertiary">{t('intake.inviteOnlyContact')}</p>
      </div>,
    );
  }

  if (state === 'done') {
    return shell(
      <div className="rounded-xl border border-[#097070] bg-surface-secondary/40 p-8">
        <h1 className="font-serif text-[26px] font-bold text-fg">{t('intake.doneTitle')}</h1>
        <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('intake.doneBody')}</p>
        <p className="mt-4 text-[12px] text-fg-tertiary">{t('intake.doneNote')}</p>
      </div>,
    );
  }

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <p className="mb-1 text-[12px] font-medium text-fg-secondary">{label}</p>
      {node}
    </div>
  );

  return shell(
    <>
      <div>
        <h1 className="font-serif text-[28px] font-bold leading-tight text-fg">{t('intake.title')}</h1>
        <p className="mt-1 text-body-sm leading-relaxed text-fg-secondary">{t('intake.sub')}</p>
      </div>
      {state === 'error' && <Banner status="error" title={t('intake.errorTitle')}>{t('intake.errorBody')}</Banner>}
      <div className="space-y-4 rounded-xl border border-stroke bg-surface-secondary/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('intake.secFirm')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field(t('intake.name'), <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio Bianchi SRL" />)}
          {field(t('intake.website'), <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {field(t('intake.countries'), <Input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="IT, DE, AT" />)}
          {field(t('intake.languages'), <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="IT, DE, EN" />)}
        </div>
        {field(t('intake.domains'),
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <FilterChip key={d.slug} size="sm" selected={cats.has(d.slug)}
                onClick={() => setCats((s) => { const n = new Set(s); n.has(d.slug) ? n.delete(d.slug) : n.add(d.slug); return n; })}>
                {d.label}
              </FilterChip>
            ))}
          </div>,
        )}
      </div>
      <div className="space-y-4 rounded-xl border border-stroke bg-surface-secondary/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('intake.secMatchmaking')}</p>
        {field(t('settings.billingModelLabel'),
          <div className="flex flex-wrap gap-2">
            {(['abo', 'hourly', 'project', 'mixed'] as BillingModel[]).map((m) => (
              <FilterChip key={m} size="sm" selected={billing === m} onClick={() => setBilling(m)}>{t(`settings.billingModel.${m}`)}</FilterChip>
            ))}
          </div>,
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {field(t('settings.pseudonymLabel'), <Input value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} placeholder={t('intake.pseudonymPh')} />)}
          {field(t('settings.regionLabel'), <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Norditalien" />)}
          {field(t('settings.activeSinceLabel'), <Input value={activeSince} onChange={(e) => setActiveSince(e.target.value)} placeholder="2015" />)}
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-stroke bg-surface-secondary/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-fg-tertiary">{t('intake.secCerts')}</p>
        {field(t('intake.certs'),
          <textarea value={certs} onChange={(e) => setCerts(e.target.value)} rows={4}
            placeholder={t('intake.certsPh')}
            className="w-full rounded-lg border border-stroke bg-transparent px-3.5 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-focus" />,
        )}
        <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-fg-secondary">
          <input type="checkbox" checked={statutes} onChange={(e) => setStatutes(e.target.checked)} className="mt-0.5" />
          {t('intake.statutes')}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!canSubmit}>{state === 'sending' ? t('intake.sending') : t('intake.submit')}</Button>
        <p className="text-[11px] text-fg-tertiary">{t('intake.vettingNote')}</p>
      </div>
    </>,
  );
}
