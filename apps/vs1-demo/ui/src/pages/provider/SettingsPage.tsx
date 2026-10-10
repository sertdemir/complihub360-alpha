import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProviderShell } from '../../components/provider/ProviderShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDrawer, type ConfirmSpec } from '../../components/provider/ConfirmDrawer';
import { ChangeEmailDrawer } from '../../components/provider/ChangeEmailDrawer';
import { CalendarPanel } from '../../components/provider/CalendarPanel';
import { AvailabilityPanel } from '../../components/provider/AvailabilityPanel';
import { InboxAddress } from '../../components/contact/SendStates';
import { AVAILABILITY_EVENT, fetchCoverage, setAvailability, updateMatchmakingProfile, type BillingModel, type PricingRow } from '../../api/provider';
import { fetchApplication } from '../../api/application';
import { CONTACT_INBOX, failureOf, sendContact, type SendFailure } from '../../api/contact';
import { identityHintFrom } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { FilterChip } from '../../components/ui/Badge';

// ─── Provider /settings ───────────────────────────────────────────────────────
// Canvas „Partner-Einstellungen ehrlich", Wahl 10.10.2026: A1 · B2 · C2 · D1.
// Figma: Screens-Datei, Seite „Partner-Einstellungen ehrlich (A1 · B2 · C2 · D1)",
// 3662:561. Bis hierher stand hier, was nicht stimmte: Firmierung, Bio und
// Avatar fest im Code, ein Menue mit vier Abschnitten, die es nicht gab,
// „Pausieren" nur im Browser und „Loeschen", nach dem nichts geschah.
//
// A1 · das Menue springt nur auf Abschnitte, die es gibt.
// B2 · „Nach der Buchung sichtbar": Firmierung und Website aus der Bewerbung —
//      vor der Buchung ist der Anbieter anonym (Matchmaking-Vorschau).
// C2 · Pausieren schaltet denselben Zustand wie die Kopfzeile (availability).
//      Der Server nimmt Pausierte aus Suche, Slots und Buchung, ohne Rangabzug.
// D1 · „Loeschung anfragen" geht als Nachricht an unser Postfach.

const SECTIONS = [
  { id: 'calendar', labelKey: 'settings.navCalendar' },
  { id: 'matchmaking', labelKey: 'settings.navMatchmaking' },
  { id: 'after-booking', labelKey: 'settings.navAfterBooking' },
  { id: 'contact-email', labelKey: 'settings.navContactEmail' },
  { id: 'availability', labelKey: 'settings.navAvailability' },
  { id: 'workspace', labelKey: 'settings.navWorkspace' },
] as const;

const anchor = (id: string) => `settings-${id}`;

function SectionCard({ id, title, body, children }: { id: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <Card id={anchor(id)} styleVariant="filled" className="scroll-mt-6 space-y-3 p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {body && <p className="mt-1 max-w-2xl text-body-sm leading-relaxed text-fg-secondary">{body}</p>}
      </div>
      {children}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
      <span className="w-28 shrink-0 text-[12px] text-fg-tertiary">{label}</span>
      <span className="min-w-0 break-words text-body-sm text-fg">{value || '—'}</span>
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation('providerws');
  const locale = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [active, setActive] = useState<string>('calendar');
  const [emailOpen, setEmailOpen] = useState(false);
  // Kein Platzhalter: bis die API antwortet, steht hier ein Strich — nie die
  // Adresse eines anderen Anbieters (bis 09.10.2026 die Fixture-Adresse).
  const [contactEmail, setContactEmail] = useState('');
  const [availability, setAvail] = useState<'available' | 'ooo' | null>(null);
  const [availFailed, setAvailFailed] = useState(false);
  const [identity, setIdentity] = useState<{ key: string; name: string; website: string } | null>(null);
  const [identityFailed, setIdentityFailed] = useState(false);
  const [identityAttempt, setIdentityAttempt] = useState(0);
  const [deletion, setDeletion] = useState<'idle' | 'sent' | SendFailure>('idle');

  useEffect(() => {
    fetchCoverage().then((c) => {
      if (c.contact_email) setContactEmail(c.contact_email);
      setAvail(c.availability ?? 'available');
    }).catch(() => {});
    // Die Kopfzeile schaltet denselben Zustand — beide Stellen zeigen dasselbe.
    const onSync = (e: Event) => setAvail((e as CustomEvent<'available' | 'ooo'>).detail);
    window.addEventListener(AVAILABILITY_EVENT, onSync);
    return () => window.removeEventListener(AVAILABILITY_EVENT, onSync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIdentityFailed(false);
    fetchApplication()
      .then((a) => { if (!cancelled) setIdentity({ key: a.provider.provider_key, name: a.provider.name ?? '', website: a.provider.website_url ?? '' }); })
      .catch(() => { if (!cancelled) setIdentityFailed(true); });
    return () => { cancelled = true; };
  }, [identityAttempt]);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(anchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const switchAvailability = (next: 'available' | 'ooo') => {
    const pausing = next === 'ooo';
    setConfirm({
      title: t(pausing ? 'settings.pauseConfirmTitle' : 'settings.resumeConfirmTitle'),
      consequence: t(pausing ? 'settings.pauseConfirmConsequence' : 'settings.resumeConfirmConsequence'),
      confirmLabel: t(pausing ? 'settings.pauseConfirmLabel' : 'settings.resumeConfirmLabel'),
      onConfirm: async () => {
        setAvailFailed(false);
        try {
          await setAvailability(next);
          setAvail(next);
        } catch {
          // Kein stilles Zuruecksetzen: der Status bleibt, und das steht da.
          setAvailFailed(true);
        }
      },
    });
  };

  const requestDeletion = () => setConfirm({
    title: t('settings.deleteConfirmTitle'),
    consequence: t('settings.deleteConfirmConsequence'),
    confirmLabel: t('settings.deleteConfirmLabel'),
    onConfirm: async () => {
      try {
        await sendContact({
          lane: 'privacy',
          locale,
          name: identity?.name || identity?.key || '—',
          email: contactEmail,
          message: `Workspace-Loeschung angefragt (Partner-Einstellungen). Anbieter-Schluessel: ${identity?.key ?? 'unbekannt'}`,
        });
        setDeletion('sent');
      } catch (err) {
        setDeletion(failureOf(err));
      }
    },
  });

  const paused = availability === 'ooo';
  const deletionFailed = deletion !== 'idle' && deletion !== 'sent';

  return (
    <ProviderShell>
      <div className="mx-auto max-w-[1140px] space-y-6">
        <div>
          <h1 className="font-serif text-[30px] font-bold leading-tight text-fg">{t('settings.title')}</h1>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-fg-secondary">{t('settings.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px,1fr]">
          <nav aria-label={t('settings.navLabel')} className="lg:sticky lg:top-6 lg:self-start">
            <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => jump(s.id)}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={active === s.id
                      ? 'w-full rounded-lg bg-brand-light px-3 py-2 text-left text-body-sm font-semibold text-fg'
                      : 'w-full rounded-lg px-3 py-2 text-left text-body-sm text-fg-secondary hover:bg-elevate/5 hover:text-fg'}
                  >
                    {t(s.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 max-w-[760px] space-y-5">
            {/* Kalender (Canvas A1): eigene Karte oben — der Rueckweg von Nylas landet hier. */}
            <div id={anchor('calendar')} className="scroll-mt-6"><CalendarPanel onConfirm={setConfirm} /></div>
            <div id={anchor('matchmaking')} className="scroll-mt-6"><MatchmakingPanel /></div>

            {/* B2: erst nach der Buchung sichtbar, aus der Bewerbung. */}
            <SectionCard id="after-booking" title={t('settings.afterBookingTitle')} body={t('settings.afterBookingBody')}>
              {identityFailed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-body-sm text-fg-secondary">{t('settings.afterBookingFailed')}</span>
                  <Button size="sm" variant="ghost" onClick={() => setIdentityAttempt((n) => n + 1)}>{t('common:states.actions.tryAgain')}</Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Field label={t('settings.legalName')} value={identity?.name ?? ''} />
                  <Field label={t('settings.websiteLabel')} value={identity?.website ?? ''} />
                </div>
              )}
              <button type="button" className="text-[12px] font-medium text-fg-brand underline-offset-2 hover:underline"
                onClick={() => navigate(`/${locale}/partner-dashboard/application`)}>
                {t('settings.changeViaApplication')}
              </button>
            </SectionCard>

            <SectionCard id="contact-email" title={t('settings.contactEmailTitle')} body={t('settings.contactEmailBody')}>
              <Field label={t('settings.contactEmailLabel')} value={contactEmail} />
              <Button size="sm" variant="secondary" onClick={() => setEmailOpen(true)}>{t('settings.changeEmail')}</Button>
            </SectionCard>

            {/* C2: derselbe Zustand wie der Schalter in der Kopfzeile. */}
            <SectionCard id="availability" title={t('settings.availabilityTitle')} body={paused ? undefined : t('settings.availabilityBody')}>
              {availFailed && <Banner status="error" title={t('settings.availabilityFailed')} />}
              {paused && (
                <Banner status="brand" title={t('settings.pausedBannerTitle')}>{t('settings.pausedBannerBody')}</Banner>
              )}
              <Button size="sm" variant="secondary" disabled={availability === null}
                onClick={() => switchAvailability(paused ? 'available' : 'ooo')}>
                {paused ? t('settings.resume') : t('settings.pauseButton')}
              </Button>
            </SectionCard>
            {/* Phase 6 (Canvas 3B): buchbare Fenster je Wochentag und Zeitzone —
                derselbe Aufruf wie Pausieren, andere Felder. */}
            <AvailabilityPanel />

            {/* D1: Loeschung als Anfrage an unser Postfach, keine vorgetaeuschte Loeschung. */}
            <SectionCard id="workspace" title={t('settings.deleteTitle')} body={t('settings.deleteBody')}>
              {deletion === 'sent' && <Banner status="success" title={t('settings.deleteSent')} />}
              {deletionFailed && (
                <div role="alert" className="flex flex-col gap-2 rounded-xl border border-error-500/30 bg-error-bg px-[18px] py-[15px]">
                  <p className="text-body-md font-bold text-fg">{t('settings.deleteFailedTitle')}</p>
                  <p className="text-body-sm leading-relaxed text-error-700 dark:text-red-300">
                    {t(`settings.deleteFailed.${deletion}`)}
                    {CONTACT_INBOX && <> {t('common:contactSend.direct')}</>}
                  </p>
                  <InboxAddress />
                </div>
              )}
              {deletion !== 'sent' && (
                <Button size="sm" variant="secondary" disabled={!contactEmail} onClick={requestDeletion}>
                  {deletionFailed ? t('common:contactSend.retry') : t('settings.deleteButton')}
                </Button>
              )}
            </SectionCard>
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
export function MatchmakingPanel() {
  const { t } = useTranslation('providerws');
  // Startet leer und fuellt sich aus dem gespeicherten Profil. Bis 09.10.2026
  // standen hier Beispielwerte (Norditalien, 2015, drei Preiszeilen) — wer
  // speicherte, schrieb sie in sein oeffentliches Profil.
  const [billing, setBilling] = useState<BillingModel>('project');
  const [region, setRegion] = useState('');
  const [activeSince, setActiveSince] = useState('');
  const [rows, setRows] = useState<PricingRow[]>([]);
  // Speichern erst, wenn der gespeicherte Stand geladen ist — sonst ueberschreibt
  // ein Klick das Profil mit leeren Feldern.
  const [loaded, setLoaded] = useState(false);
  // E2 (TKT-PROV-12): scheitert der Abruf, sagt ein Satz am Knopf, warum er
  // gesperrt ist — vorher stand er grau da, ohne Grund.
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [identityHint, setIdentityHint] = useState<string | null>(null);

  useEffect(() => {
    setLoadFailed(false);
    fetchCoverage().then((c) => {
      if (c.billing_model) setBilling(c.billing_model);
      setRegion(c.region ?? '');
      setActiveSince(c.active_since != null ? String(c.active_since) : '');
      setRows(Array.isArray(c.pricing_table) ? c.pricing_table : []);
      setLoaded(true);
    }).catch(() => setLoadFailed(true)); // bleibt gesperrt: ohne gespeicherten Stand kein Ueberschreiben
  }, [attempt]);

  const save = async () => {
    setSaved('saving');
    setIdentityHint(null);
    try {
      await updateMatchmakingProfile({
        billing_model: billing,
        pricing_table: rows,
        region,
        active_since: parseInt(activeSince, 10) || null,
      });
    } catch (e) {
      // Phase 3: der Identitaets-Scan blockiert und benennt die Stelle (422).
      // Sachlich, ohne Verstoss-Sprache — der Anbieter soll wissen, was er
      // aendern muss, nicht, dass er etwas falsch gemacht haette.
      const hint = identityHintFrom(e, t);
      if (hint) { setIdentityHint(hint); setSaved('idle'); return; }
      // Kein „Gespeichert", wenn nichts gespeichert wurde.
      setSaved('error');
      return;
    }
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
      {/* Phase 3: kein Pseudonym-Feld mehr. Der Titel vor der Buchung entsteht
          im System aus freigegebenen Bereichen und Region — hier die Vorschau. */}
      <div className="rounded-lg border border-brand/40 bg-brand-light px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-brand">{t('settings.previewTitle')}</p>
        <p className="mt-1 text-[14px] font-bold text-fg">Verified Provider <span className="text-fg-tertiary">A/B/C</span></p>
        <p className="text-[12px] text-fg-secondary">{[t('settings.previewAreas'), region.trim()].filter(Boolean).join(' · ')}</p>
        <p className="mt-1.5 text-[11px] text-fg-tertiary">{t('settings.previewNote')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
      {identityHint && <Banner status="warning" title={identityHint} />}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!loaded || saved === 'saving'}>{t('settings.matchmakingSave')}</Button>
        {saved === 'done' && <span className="text-[12px] text-fg-brand">{t('settings.matchmakingSaved')}</span>}
        {saved === 'error' && <span className="text-[12px] text-error-500">{t('application.saveError')}</span>}
        {loadFailed && (
          <>
            <span className="min-w-0 flex-1 text-[12px] text-fg-secondary">{t('common:states.partner.profileUnavailable')}</span>
            <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>{t('common:states.actions.tryAgain')}</Button>
          </>
        )}
      </div>
    </Card>
  );
}
