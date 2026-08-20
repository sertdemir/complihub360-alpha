import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { ChangeEmailDrawer } from '../../components/provider/ChangeEmailDrawer';
import { fetchCoverage, updateMatchmakingProfile, type BillingModel, type PricingRow } from '../../api/provider';
import { Input } from '../../components/ui/Input';
import { FilterChip } from '../../components/ui/Badge';

// ─── Provider /settings ───────────────────────────────────────────────────────
// Mirrors "Provider · /settings (Desktop)": settings section list (Profile
// active) + the Profile → Public-identity detail panel. Fixture data.

const SECTIONS = [
  { key: 'matchmaking', titleKey: 'settings.sectionMatchmaking', subKey: 'settings.sectionMatchmakingSub' },
  { key: 'profile', titleKey: 'settings.sectionProfile', subKey: 'settings.sectionProfileSub' },
  { key: 'security', titleKey: 'settings.sectionSecurity', subKey: 'settings.sectionSecuritySub' },
  { key: 'notifications', titleKey: 'settings.sectionNotifications', subKey: 'settings.sectionNotificationsSub' },
  { key: 'integrations', titleKey: 'settings.sectionIntegrations', subKey: 'settings.sectionIntegrationsSub' },
  { key: 'team', titleKey: 'settings.sectionTeam', subKey: 'settings.sectionTeamSub' },
  { key: 'workspace', titleKey: 'settings.sectionWorkspace', subKey: 'settings.sectionWorkspaceSub' },
];

export function SettingsPage() {
  const { t } = useTranslation('providerws');
  // B9: destructive workspace actions run through the Confirm drawer.
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [paused, setPaused] = useState(false);
  // B8: live contact address + change drawer (verify-first).
  const [emailOpen, setEmailOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('g.dahlmann@dahlmann-cpa.de');
  useEffect(() => {
    fetchCoverage().then((c) => { if ((c as { contact_email?: string }).contact_email) setContactEmail((c as { contact_email?: string }).contact_email!); }).catch(() => {});
  }, []);
  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('settings.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <div className="space-y-2">
            {SECTIONS.map((s, i) => (
              <Card key={s.key} styleVariant={i === 0 ? 'outlined' : 'filled'} interactive selected={i === 0} className="px-4 py-3">
                <p className={i === 0 ? 'text-[13px] font-semibold text-fg-brand' : 'text-[13px] font-semibold text-fg'}>{t(s.titleKey)}</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">{t(s.subKey)}</p>
              </Card>
            ))}
          </div>

          <div className="space-y-5">
            <MatchmakingPanel />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">{t('settings.publicIdentityTitle')}</h2>
                <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('settings.publicIdentitySub')}</p>
              </div>
            </div>

            <Card styleVariant="filled" className="flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#d4af37] text-[13px] font-bold text-[#101411]">DC</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{t('settings.avatarTitle')}</p>
                <p className="mt-0.5 text-[11px] text-fg-tertiary">{t('settings.avatarSpec')}</p>
              </div>
              <Button size="sm" variant="secondary">{t('settings.replace')}</Button>
            </Card>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('settings.legalName')}</p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <p className="text-[14px] font-medium text-fg">Dahlmann CPA Steuerberatungs GmbH</p>
                <Tag tone="neutral">{t('settings.lockedTag')}</Tag>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">{t('settings.bioLabel')}</p>
              <Card styleVariant="filled" className="mt-1.5 p-4">
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                  Boutique Steuerberatungs-Praxis · Munich · 8 partners, 24 staff · specialist in cross-border
                  e-commerce VAT, EPR registrations, and German GoBD compliance audits for D2C + marketplace seller segment.
                </p>
              </Card>
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-[14px] font-semibold text-fg">{t('settings.contactEmailTitle')}</h3>
                <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-fg-tertiary">
                  {t('settings.contactEmailBody')}
                </p>
              </div>
              <Card styleVariant="filled" className="flex items-center gap-3 p-4">
                <p className="text-[13px] font-medium text-fg">{contactEmail}</p>
                <Tag tone="success">{t('settings.verifiedTag')}</Tag>
                <div className="ml-auto">
                  <Button size="sm" variant="secondary" onClick={() => setEmailOpen(true)}>{t('settings.changeEmail')}</Button>
                </div>
              </Card>
            </div>

            {/* B9: Workspace danger zone — every action guarded by ConfirmDrawer */}
            <div className="space-y-3">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">{t('settings.workspaceTitle')}</h2>
                <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('settings.workspaceSub')}</p>
              </div>
              {paused && (
                <Banner status="brand" title={t('settings.pausedBannerTitle')} action={<Button size="sm" variant="secondary" onClick={() => setPaused(false)}>{t('settings.resume')}</Button>}>
                  {t('settings.pausedBannerBody')}
                </Banner>
              )}
              <Card styleVariant="filled" className="divide-y divide-elevate/5 p-0">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-fg">{t('settings.pauseTitle')}</p>
                    <p className="mt-0.5 text-[11px] text-fg-tertiary">{t('settings.pauseSub')}</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={paused}
                    onClick={() => setConfirm({
                      title: t('settings.pauseConfirmTitle'),
                      consequence: t('settings.pauseConfirmConsequence'),
                      confirmLabel: t('settings.pauseConfirmLabel'),
                      onConfirm: () => setPaused(true),
                    })}>
                    {paused ? t('settings.pausedButton') : t('settings.pauseButton')}
                  </Button>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-error-500">{t('settings.deleteTitle')}</p>
                    <p className="mt-0.5 text-[11px] text-fg-tertiary">{t('settings.deleteSub')}</p>
                  </div>
                  <Button size="sm" variant="ghost"
                    onClick={() => setConfirm({
                      title: t('settings.deleteConfirmTitle'),
                      consequence: t('settings.deleteConfirmConsequence'),
                      confirmLabel: t('settings.deleteConfirmLabel'),
                      keyword: 'DELETE',
                      onConfirm: () => { /* deletion request lands with CS until provider auth (B8) */ },
                    })}>
                    {t('settings.deleteButton')}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDrawer spec={confirm} onClose={() => setConfirm(null)} />
      <ChangeEmailDrawer open={emailOpen} currentEmail={contactEmail} onClose={() => setEmailOpen(false)} />
    </ProviderShell>
  );
}

// ─── Matchmaking panel (v2 §10) ──────────────────────────────────────────────
// Provider self-service for the anonymous listing card + detail page: billing
// model (shown on the card instead of a price), full pricing table (revealed
// only on the monetised detail page) and the anonymized identity fields.
function MatchmakingPanel() {
  const { t } = useTranslation('providerws');
  const [billing, setBilling] = useState<BillingModel>('project');
  const [pseudonym, setPseudonym] = useState('Verifizierte Steuerkanzlei · Norditalien');
  const [region, setRegion] = useState('Norditalien');
  const [activeSince, setActiveSince] = useState('2015');
  const [rows, setRows] = useState<PricingRow[]>([
    { service: 'VAT-Erstregistrierung Italien', price: 'ab €450 · einmalig' },
    { service: 'Laufende OSS-Betreuung', price: '€180 / Quartal' },
    { service: 'Fachberatung (Stundensatz)', price: '€140 / Std.' },
  ]);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done'>('idle');

  const save = async () => {
    setSaved('saving');
    try {
      await updateMatchmakingProfile({
        billing_model: billing,
        pricing_table: rows,
        pseudonym_label: pseudonym,
        region,
        active_since: parseInt(activeSince, 10) || null,
      });
    } catch { /* fixture mode: keep local state */ }
    setSaved('done');
    setTimeout(() => setSaved('idle'), 2000);
  };

  const MODELS: BillingModel[] = ['abo', 'hourly', 'project', 'mixed'];
  return (
    <Card styleVariant="filled" className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{t('settings.matchmakingTitle')}</h2>
        <p className="mt-0.5 text-[12px] text-fg-tertiary">{t('settings.matchmakingSub')}</p>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-medium text-fg-secondary">{t('settings.billingModelLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <FilterChip key={m} size="sm" selected={billing === m} onClick={() => setBilling(m)}>
              {t(`settings.billingModel.${m}`)}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-[12px] font-medium text-fg-secondary">{t('settings.pseudonymLabel')}</p>
          <Input value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-[12px] font-medium text-fg-secondary">{t('settings.regionLabel')}</p>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-[12px] font-medium text-fg-secondary">{t('settings.activeSinceLabel')}</p>
          <Input value={activeSince} onChange={(e) => setActiveSince(e.target.value)} />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-medium text-fg-secondary">{t('settings.pricingTableLabel')}</p>
          <button
            type="button"
            className="text-[12px] font-medium text-fg-brand hover:underline"
            onClick={() => setRows((r) => [...r, { service: '', price: '' }])}
          >
            {t('settings.pricingAddRow')}
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" value={row.service} placeholder={t('settings.pricingServicePh')}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)))} />
              <Input className="w-[180px]" value={row.price} placeholder={t('settings.pricingPricePh')}
                onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <button type="button" aria-label={t('settings.pricingRemoveRow')} className="text-fg-tertiary hover:text-fg"
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-fg-tertiary">{t('settings.pricingNoteV2')}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={saved === 'saving'}>{t('settings.matchmakingSave')}</Button>
        {saved === 'done' && <span className="text-[12px] text-fg-brand">{t('settings.matchmakingSaved')}</span>}
      </div>
    </Card>
  );
}
