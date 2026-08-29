import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Segment } from '../compliance-areas';
import { DOMAINS } from '../../lib/domains';
import { MARKET_CODES } from '../../lib/marketProfiles';

// ─── Provider-Onboarding · das Modal über dem Dashboard ──────────────────────
// Gebaut 2026-08-29 (Canvas "Partner-Onboarding": O1 A, O2 A, O3 A, O4 A,
// O5 B — Nutzer-Entscheidung). Der Flow aus der Produkt-Doku ("Provider Flows
// §2": Kontakt verifizieren → Abdeckung definieren → Aktivierung), aber als
// MODAL über dem gedimmten Dashboard statt als eigene Seite: der Magic-Link
// fuehrt den frisch geprueften Partner direkt in seinen Workspace, und das
// Modal haelt ihn genau so lange auf, bis die Listung stehen kann.
//
// Es ersetzt die ProviderOnboardingPage (1.017 Zeilen, 6-Schritte-Vollbild
// nach Figma 1868:2): die war NIE geroutet — /partner-onboarding zeigte immer
// auf die token-gesicherte Intake-Seite — und damit toter Code seit ihrem
// Commit. Geloescht im selben Zug.
//
// Zwei Feldklassen, bewusst getrennt ausgezeichnet:
//   · Pflicht (gruener Stern): ohne sie keine Listung — das Minimum aus der
//     Doku plus das Antwort-Postfach, der Kern des Magic-Link-Wegs.
//   · "staerkt Ihr Ranking" (Gold-Badge): freiwillig, aber gewichtet. Die
//     Mechanik dahinter (Fristen, Abwertung) ist offen — TODO(ranking-completeness):
//     entscheiden, wie Vollstaendigkeit in die Reihung eingeht.
//
// TODO(partner-onboarding-live): die Angaben gehen bisher nur in den
// localStorage (Schluessel unten) — beim echten Backend ersetzt ein
// Provider-Profil-Endpunkt das Persistieren, und die Bewerbungsdaten aus dem
// Intake fuellen die Felder vor.

const STORAGE_KEY = 'ch360_provider_onboarding_v1';
/** Session-Schluessel des Banner-X: naechster Besuch zeigt ihn wieder. */
const BANNER_DISMISS_KEY = 'ch360_provider_banner_dismissed';
/** Banner → Modal ("Profil vervollständigen") und Modal → Banner (nach dem
    Speichern neu rechnen) — dasselbe CustomEvent-Muster wie AVAILABILITY_EVENT. */
export const OPEN_PROFILE_EVENT = 'ch360:provider-profile-open';
export const PROFILE_SAVED_EVENT = 'ch360:provider-profile-saved';

type StepId = 'welcome' | 'contact' | 'coverage' | 'listing' | 'done';
const FORM_STEPS = ['contact', 'coverage', 'listing'] as const;

interface OnboardingData {
    contactName: string; replyInbox: string; firmName: string; website: string;
    countries: string[]; languages: string[]; areas: string[]; sla: string;
    displayName: string; shortDesc: string; credentials: string;
    certifications: string; activeSince: string; teamSize: string;
}
const EMPTY: OnboardingData = {
    contactName: '', replyInbox: '', firmName: '', website: '',
    countries: [], languages: [], areas: [], sla: '24-48',
    displayName: '', shortDesc: '', credentials: '',
    certifications: '', activeSince: '', teamSize: '',
};

const LANGUAGE_KEYS = ['de', 'en', 'fr', 'nl', 'es', 'tr'] as const;

function readStored(): { completed?: boolean; data?: OnboardingData } | null {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}

export function isProviderOnboarded(): boolean {
    return readStored()?.completed === true;
}

/** Anteil gefuellter Felder — speist Meter und Banner; Pflicht + Ranking gleich gewichtet. */
function completeness(d: OnboardingData): number {
    const fields = [
        d.contactName, d.replyInbox, d.firmName, d.website,
        d.countries.length, d.languages.length, d.areas.length,
        d.displayName, d.shortDesc, d.credentials,
        d.certifications, d.activeSince, d.teamSize,
    ];
    const filled = fields.filter((f) => (typeof f === 'number' ? f > 0 : f.trim().length > 0)).length;
    return Math.round((filled / fields.length) * 100);
}

const FIELD =
    'mt-1.5 w-full rounded-lg border border-stroke bg-surface px-3.5 py-2.5 text-body-sm text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus';
const LABEL = 'flex items-center gap-1 text-body-4xs font-bold uppercase tracking-[0.1em] text-fg-tertiary';
/** Der gruene Pflicht-Stern — Emerald ist die Workspace-Akzentfarbe. */
const Req = () => <span aria-hidden className="text-fg-brand">*</span>;
/** Das Gold-Badge der Ranking-Felder (O4-A). */
function RankBadge() {
    const { t } = useTranslation('providerws');
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-accent-500">
            <TrendingUp size={10} aria-hidden /> {t('onboarding.rankBadge')}
        </span>
    );
}

function Field({ id, label, value, onChange, placeholder, required, rank, hint }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; required?: boolean; rank?: boolean; hint?: string;
}) {
    return (
        <div className="mt-4">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className={LABEL}>{label}{required && <Req />}</label>
                {rank && <RankBadge />}
            </div>
            <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
            {hint && <p className="mt-1.5 text-body-3xs leading-relaxed text-fg-tertiary">{hint}</p>}
        </div>
    );
}

function SegmentGroup({ label, options, selected, onChange, required, single }: {
    label: string; options: { value: string; label: string }[]; selected: string[];
    onChange: (v: string[]) => void; required?: boolean; single?: boolean;
}) {
    const toggle = (v: string) =>
        single
            ? onChange([v])
            : onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    return (
        <div className="mt-4">
            <span className={LABEL}>
                {label}{required && <Req />}
                {!single && selected.length > 0 && (
                    <span className="normal-case tracking-normal text-fg-tertiary">· {selected.length}</span>
                )}
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {options.map((o) => (
                    <Segment key={o.value} selected={selected.includes(o.value)} onClick={() => toggle(o.value)}>
                        {o.label}
                    </Segment>
                ))}
            </div>
        </div>
    );
}

/** O2-A: der Punkte-Fortschritt — drei benannte Schritte. */
function StepDots({ current }: { current: number }) {
    const { t } = useTranslation('providerws');
    return (
        <div className="flex items-center gap-3">
            {FORM_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2" style={{ flex: i > 0 ? 1 : undefined }}>
                    {i > 0 && <span aria-hidden className="h-px min-w-4 flex-1 bg-elevate/15" />}
                    <span
                        aria-hidden
                        className={
                            'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ' +
                            (i <= current ? 'bg-fg-brand text-[#0b1620]' : 'border border-elevate/25 text-fg-tertiary')
                        }
                    >
                        {i < current ? <Check size={11} /> : i + 1}
                    </span>
                    <span className={'text-body-3xs ' + (i === current ? 'font-bold text-fg' : 'font-semibold text-fg-tertiary')}>
                        {t(`onboarding.steps.${s}`)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function ProviderOnboardingModal() {
    const { t } = useTranslation('providerws');
    const [step, setStep] = useState<StepId>(() => (isProviderOnboarded() ? 'done' : 'welcome'));
    const [dismissed, setDismissed] = useState(() => isProviderOnboarded());
    const [data, setData] = useState<OnboardingData>(() => ({ ...EMPTY, ...(readStored()?.data ?? {}) }));

    // "Profil vervollständigen" im Banner oeffnet das Modal direkt im
    // Listungs-Schritt — mit den gespeicherten Angaben vorbefuellt.
    useEffect(() => {
        const onOpen = () => {
            setData({ ...EMPTY, ...(readStored()?.data ?? {}) });
            setStep('listing');
            setDismissed(false);
        };
        window.addEventListener(OPEN_PROFILE_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_PROFILE_EVENT, onOpen);
    }, []);
    const patch = (d: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...d }));

    if (dismissed) return null;

    const stepIndex = FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);
    const canProceed =
        step === 'contact'
            ? Boolean(data.contactName.trim() && /.+@.+\..+/.test(data.replyInbox) && data.firmName.trim())
            : step === 'coverage'
              ? data.countries.length > 0 && data.languages.length > 0 && data.areas.length > 0
              : step === 'listing'
                ? Boolean(data.displayName.trim() && data.shortDesc.trim() && data.credentials.trim())
                : true;

    const activate = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, completedAt: Date.now(), data }));
        } catch { /* Speichern ist Komfort, kein Gate */ }
        window.dispatchEvent(new Event(PROFILE_SAVED_EVENT));
        setStep('done');
    };

    const next = () => {
        if (step === 'welcome') setStep('contact');
        else if (step === 'contact') setStep('coverage');
        else if (step === 'coverage') setStep('listing');
        else if (step === 'listing') activate();
    };
    const back = () => {
        if (step === 'coverage') setStep('contact');
        else if (step === 'listing') setStep('coverage');
    };

    const countryOptions = MARKET_CODES.map((c) => ({ value: c, label: c }));
    const languageOptions = LANGUAGE_KEYS.map((k) => ({ value: k, label: t(`onboarding.languages.${k}`) }));
    const areaOptions = DOMAINS.map((d) => ({ value: d.slug, label: t(`onboarding.areas.${d.i18nKey}`, d.label) }));
    const slaOptions = [
        { value: '24-48', label: t('onboarding.coverage.slaDefault') },
        { value: '12-24', label: t('onboarding.coverage.slaFast') },
    ];

    const navRow = (last: boolean) => (
        <div className="mt-6 flex items-center justify-between border-t border-elevate/10 pt-4">
            <button
                type="button"
                onClick={back}
                disabled={step === 'contact'}
                className="text-body-xs font-semibold text-fg-tertiary transition-colors enabled:hover:text-fg disabled:opacity-40"
            >
                ← {t('onboarding.back')}
            </button>
            <Button variant="accent" size="sm" disabled={!canProceed} onClick={next}>
                {last ? t('onboarding.activate') : t('onboarding.next')} <ArrowRight size={14} className="ml-1.5" />
            </Button>
        </div>
    );

    return (
        // Über allem im Workspace (Drawers liegen bei z-90): das Dashboard
        // bleibt als Kulisse sichtbar, ist aber gedimmt und nicht bedienbar.
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-[2px]" role="dialog" aria-modal="true">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 14, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={
                        'my-auto w-full rounded-xl border border-elevate/15 bg-surface p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] sm:p-8 ' +
                        (step === 'welcome' || step === 'done' ? 'max-w-[480px]' : 'max-w-[560px]')
                    }
                >
                    {step === 'welcome' && (
                        <>
                            <p className="text-body-3xs font-extrabold uppercase tracking-[0.14em] text-fg-brand">
                                {t('onboarding.welcome.eyebrow')}
                            </p>
                            <h2 className="mt-2.5 font-serif text-[1.375rem] font-bold leading-snug text-fg">
                                {t('onboarding.welcome.titlePre')}
                                <span className="text-accent-500">{t('onboarding.welcome.titleGold')}</span>
                                {t('onboarding.welcome.titlePost')}
                            </h2>
                            <p className="mt-3 text-body-sm leading-relaxed text-fg-secondary">{t('onboarding.welcome.body')}</p>
                            <div className="mt-4 divide-y divide-elevate/10 border-y border-elevate/10">
                                {FORM_STEPS.map((s, i) => (
                                    <div key={s} className="flex gap-3.5 py-3">
                                        <span className="font-serif text-body-sm font-bold text-accent-500">0{i + 1}</span>
                                        <span className="min-w-0">
                                            <span className="block text-body-sm font-bold text-fg">{t(`onboarding.steps.${s}`)}</span>
                                            <span className="block text-body-3xs text-fg-tertiary">{t(`onboarding.stepSubs.${s}`)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="accent" size="md" className="mt-5 w-full" onClick={next}>
                                {t('onboarding.welcome.cta')} <ArrowRight size={15} className="ml-1.5" />
                            </Button>
                            <p className="mt-3 text-center text-body-3xs text-fg-tertiary">{t('onboarding.welcome.note')}</p>
                        </>
                    )}

                    {step === 'contact' && (
                        <>
                            <StepDots current={0} />
                            <h2 className="mt-5 font-serif text-[1.25rem] font-bold leading-snug text-fg">{t('onboarding.contact.title')}</h2>
                            <p className="mt-1.5 text-body-xs leading-relaxed text-fg-secondary">{t('onboarding.contact.lead')}</p>
                            <Field id="ob-contact" label={t('onboarding.contact.name')} required value={data.contactName} onChange={(v) => patch({ contactName: v })} placeholder={t('onboarding.contact.namePh')} />
                            <Field id="ob-inbox" label={t('onboarding.contact.inbox')} required value={data.replyInbox} onChange={(v) => patch({ replyInbox: v })} placeholder="dossiers@kanzlei.de" hint={t('onboarding.contact.inboxHint')} />
                            <div className="flex flex-col gap-0 sm:flex-row sm:gap-4">
                                <div className="flex-1"><Field id="ob-firm" label={t('onboarding.contact.firm')} required value={data.firmName} onChange={(v) => patch({ firmName: v })} /></div>
                                <div className="flex-1"><Field id="ob-web" label={t('onboarding.contact.website')} value={data.website} onChange={(v) => patch({ website: v })} /></div>
                            </div>
                            {navRow(false)}
                        </>
                    )}

                    {step === 'coverage' && (
                        <>
                            <StepDots current={1} />
                            <h2 className="mt-5 font-serif text-[1.25rem] font-bold leading-snug text-fg">{t('onboarding.coverage.title')}</h2>
                            <p className="mt-1.5 text-body-xs leading-relaxed text-fg-secondary">{t('onboarding.coverage.lead')}</p>
                            <SegmentGroup label={t('onboarding.coverage.countries')} required options={countryOptions} selected={data.countries} onChange={(v) => patch({ countries: v })} />
                            <SegmentGroup label={t('onboarding.coverage.langs')} required options={languageOptions} selected={data.languages} onChange={(v) => patch({ languages: v })} />
                            <SegmentGroup label={t('onboarding.coverage.areas')} required options={areaOptions} selected={data.areas} onChange={(v) => patch({ areas: v })} />
                            <SegmentGroup label={t('onboarding.coverage.sla')} single options={slaOptions} selected={[data.sla]} onChange={(v) => patch({ sla: v[0] })} />
                            {navRow(false)}
                        </>
                    )}

                    {step === 'listing' && (
                        <>
                            <StepDots current={2} />
                            <h2 className="mt-5 font-serif text-[1.25rem] font-bold leading-snug text-fg">{t('onboarding.listing.title')}</h2>
                            <p className="mt-1.5 text-body-xs leading-relaxed text-fg-secondary">{t('onboarding.listing.lead')}</p>
                            <Field id="ob-display" label={t('onboarding.listing.displayName')} required value={data.displayName} onChange={(v) => patch({ displayName: v })} />
                            <div className="mt-4">
                                <label htmlFor="ob-desc" className={LABEL}>{t('onboarding.listing.shortDesc')}<Req /></label>
                                <textarea id="ob-desc" rows={2} value={data.shortDesc} onChange={(e) => patch({ shortDesc: e.target.value })} placeholder={t('onboarding.listing.shortDescPh')} className={FIELD + ' resize-none'} />
                            </div>
                            <Field id="ob-cred" label={t('onboarding.listing.credentials')} required value={data.credentials} onChange={(v) => patch({ credentials: v })} placeholder={t('onboarding.listing.credentialsPh')} />
                            <Field id="ob-certs" label={t('onboarding.listing.certs')} rank value={data.certifications} onChange={(v) => patch({ certifications: v })} placeholder={t('onboarding.listing.certsPh')} />
                            <div className="flex flex-col gap-0 sm:flex-row sm:gap-4">
                                <div className="flex-1"><Field id="ob-since" label={t('onboarding.listing.activeSince')} rank value={data.activeSince} onChange={(v) => patch({ activeSince: v })} placeholder="2014" /></div>
                                <div className="flex-1"><Field id="ob-team" label={t('onboarding.listing.teamSize')} rank value={data.teamSize} onChange={(v) => patch({ teamSize: v })} placeholder="12" /></div>
                            </div>
                            {navRow(true)}
                        </>
                    )}

                    {step === 'done' && (
                        <div className="text-center">
                            <CheckCircle2 size={30} strokeWidth={1.7} className="mx-auto text-fg-brand" aria-hidden />
                            <h2 className="mt-3 font-serif text-[1.375rem] font-bold leading-snug text-fg">
                                {t('onboarding.done.titlePre')}
                                <span className="text-fg-brand">{t('onboarding.done.titleEm')}</span>
                                {t('onboarding.done.titlePost')}
                            </h2>
                            <p className="mt-2 text-body-sm text-fg-secondary">{t('onboarding.done.lead')}</p>
                            <div className="mt-4 divide-y divide-elevate/10 border-y border-elevate/10 text-left">
                                {(['dossier', 'sla', 'rank'] as const).map((k, i) => (
                                    <div key={k} className="flex gap-3.5 py-2.5">
                                        <span className="font-serif text-body-sm font-bold text-accent-500">0{i + 1}</span>
                                        <span className="text-body-xs leading-relaxed text-fg-secondary">{t(`onboarding.done.${k}`)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <span className="shrink-0 text-body-3xs text-fg-tertiary">
                                    {t('onboarding.done.meterLabel', { pct: completeness(data) })}
                                </span>
                                <span className="h-1.5 max-w-[180px] flex-1 overflow-hidden rounded-full bg-elevate/15">
                                    <span className="block h-full rounded-full bg-gradient-to-r from-[var(--fg-brand,#34d399)] to-[#D4AF37]" style={{ width: `${completeness(data)}%` }} />
                                </span>
                            </div>
                            <Button variant="accent" size="md" className="mt-5 w-full" onClick={() => setDismissed(true)}>
                                {t('onboarding.done.cta')} <ArrowRight size={15} className="ml-1.5" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ─── O5-C · der Vollstaendigkeits-Banner im Workspace ────────────────────────
// Nutzer-Nachwahl 2026-08-29: zusaetzlich zum Erfolgs-Modal bleibt im Main-
// Bereich ein Banner stehen, bis das Profil 100 % erreicht. Das X blendet ihn
// nur fuer die SITZUNG aus — beim naechsten Besuch ist er wieder da: die Copy
// sagt offen, dass ein unvollstaendiges Profil die Reihung kostet, und ein
// endgueltig wegklickbarer Hinweis waere das leiseste Ranking-Leck der Welt.
export function ProviderProfileBanner() {
    const { t } = useTranslation('providerws');
    const [, setTick] = useState(0);
    const [sessionDismissed, setSessionDismissed] = useState(() => {
        try { return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1'; } catch { return false; }
    });

    // Nach jedem Speichern im Modal neu rechnen, ohne Reload.
    useEffect(() => {
        const onSaved = () => setTick((n) => n + 1);
        window.addEventListener(PROFILE_SAVED_EVENT, onSaved);
        return () => window.removeEventListener(PROFILE_SAVED_EVENT, onSaved);
    }, []);

    const stored = readStored();
    if (!stored?.completed || sessionDismissed) return null;
    const pct = completeness({ ...EMPTY, ...(stored.data ?? {}) });
    if (pct >= 100) return null;

    const dismiss = () => {
        try { sessionStorage.setItem(BANNER_DISMISS_KEY, '1'); } catch { /* Sitzungs-Komfort */ }
        setSessionDismissed(true);
    };

    return (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-accent-500/35 bg-accent-500/[0.07] py-3 pl-5 pr-3">
            <span className="h-1.5 w-[130px] shrink-0 overflow-hidden rounded-full bg-elevate/15">
                <span className="block h-full rounded-full bg-gradient-to-r from-[var(--fg-brand,#34d399)] to-[#D4AF37]" style={{ width: `${pct}%` }} />
            </span>
            <span className="min-w-0 flex-1 text-body-xs leading-relaxed text-fg-secondary">
                {t('onboarding.banner.text', { pct })}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new Event(OPEN_PROFILE_EVENT))}>
                    {t('onboarding.banner.cta')}
                </Button>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t('onboarding.banner.dismiss')}
                    title={t('onboarding.banner.dismissTitle')}
                    className="grid h-8 w-8 place-items-center rounded-md text-fg-tertiary transition-colors hover:bg-elevate/10 hover:text-fg"
                >
                    <X size={15} />
                </button>
            </span>
        </div>
    );
}
