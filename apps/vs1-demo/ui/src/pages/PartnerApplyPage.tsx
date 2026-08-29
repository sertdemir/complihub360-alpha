import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Segment } from '../components/compliance-areas';
import { SystemFooter } from '../components/auth/SystemFooter';
import { DOMAINS } from '../lib/domains';
import { MARKET_CODES } from '../lib/marketProfiles';

// ─── /partner-apply · die Partner-Bewerbung ──────────────────────────────────
// Gebaut 2026-08-29 (Nutzer-Entscheidung): "Als Partner bewerben" fuehrt in
// ein EIGENES Formular, nicht auf die Kontaktseite — der Bewerber soll beim
// Ausfuellen sehen, was danach passiert. Links die Aussicht (Eingang &
// Pruefung → persoenlicher Zugangslink → Onboarding & Listung), rechts das
// Formular mit dem Minimum, mit dem die Pruefung starten kann. Dasselbe
// Split-Muster wie Login und Registrierung (Eingabe im Split, Meldung als
// Karte) — dreimal in Folge so gewaehlt.
//
// Die Felder folgen dem echten, token-gesicherten Intake (Name, Website,
// Laender, Bereiche, Zulassung/Zertifikate): was hier ankommt, kann die
// manuelle Pruefung direkt verwenden. Der Anbieter-Weg der Kontaktseite
// bleibt fuer formlose Fragen bestehen.
//
// TODO(partner-apply-live): einen oeffentlichen Bewerbungs-Endpunkt gibt es
// noch nicht — der echte Intake verlangt einen Einladungs-Token. Bis der
// Endpunkt steht, sagt das Formular das offen (derselbe ehrliche Weg wie das
// Kontaktformular) statt einen Versand vorzutaeuschen.
const APPLY_ENDPOINT: string | null = null;

/** Wie in LegalPages.tsx und auf der Kontaktseite: sichtbar offen statt erfunden. */
function Placeholder({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded bg-warning-bg px-1.5 py-0.5 font-mono text-[0.85em] text-warning-700 ring-1 ring-inset ring-warning-500/30">
            [{children}]
        </span>
    );
}

const FIELD =
    'mt-2 w-full rounded-lg border border-stroke bg-surface px-3.5 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35';
const LABEL = 'block text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary';

const OUTLOOK = ['review', 'access', 'listing'] as const;

export function PartnerApplyPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('common');
    const lang = i18n.resolvedLanguage || 'en';

    const [firm, setFirm] = useState('');
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [credentials, setCredentials] = useState('');
    const [areas, setAreas] = useState<string[]>([]);
    const [markets, setMarkets] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const canSubmit =
        firm.trim() && contact.trim() && /.+@.+\..+/.test(email) && credentials.trim() && areas.length > 0 && markets.length > 0;

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Solange kein Endpunkt existiert, wird KEIN Versand vorgetaeuscht.
        setSent(true);
    };

    const toggle = (list: string[], set: (v: string[]) => void) => (v: string) =>
        set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · die Aussicht auf dem Gradient */}
            <div className="flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:w-[46%] lg:gap-0 lg:px-14 lg:py-10">
                <Logo lockup="horizontal" tone="on-light" href="/" markClassName="h-9" />

                <div className="max-w-[460px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">
                        {t('partnerApply.eyebrow')}
                    </p>
                    <h1 className="mt-4 font-serif text-[1.75rem] font-bold leading-[1.16] tracking-tight text-fg lg:text-[2.125rem]">
                        {t('partnerApply.titlePre')}
                        <span className="text-accent-700 dark:text-fg-accent-strong">{t('partnerApply.titleGold')}</span>
                        {t('partnerApply.titlePost')}
                    </h1>

                    {/* Die Aussicht: was nach dem Absenden passiert — der Kern
                        der Nutzer-Anforderung ("das müssen wir ihm sagen"). */}
                    <div className="mt-7 divide-y divide-[rgba(2,22,17,0.08)] border-y border-[rgba(2,22,17,0.08)]">
                        {OUTLOOK.map((k, i) => (
                            <div key={k} className="flex gap-3.5 py-3.5">
                                <span className="font-serif text-body-md font-bold text-accent-700 dark:text-fg-accent-strong">0{i + 1}</span>
                                <span className="min-w-0">
                                    <span className="block text-body-sm font-bold text-fg">{t(`partnerApply.outlook.${k}.title`)}</span>
                                    <span className="mt-0.5 block text-body-xs leading-relaxed text-fg-secondary">
                                        {t(`partnerApply.outlook.${k}.desc`)}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 grid grid-cols-3 border-y border-accent-500/40 py-4">
                        {(['confirm', 'answer', 'fee'] as const).map((k, i) => (
                            <div key={k} className={'px-4 text-center ' + (i > 0 ? 'border-l border-stroke-subtle' : '')}>
                                <span className="font-serif text-body-md font-bold tabular-nums text-fg">
                                    {t(`partnerApply.facts.${k}.value`)}
                                </span>
                                <span className="mt-0.5 block text-body-3xs text-fg-tertiary">{t(`partnerApply.facts.${k}.label`)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <SystemFooter className="hidden lg:flex" />
            </div>

            {/* RECHTS · das Formular */}
            <div className="flex flex-1 flex-col justify-center border-stroke-subtle px-6 pb-10 pt-8 lg:border-l lg:px-14 lg:py-12">
                <div className="mx-auto w-full max-w-[440px]">
                    {sent ? (
                        <div className="rounded-xl border border-stroke-subtle bg-surface-secondary p-6">
                            <h2 className="font-serif text-[1.25rem] font-bold leading-snug text-fg">
                                {t('partnerApply.notWiredTitle')}
                            </h2>
                            <p className="mt-2.5 text-body-sm leading-relaxed text-fg-secondary">
                                {t('partnerApply.notWiredBody')} <Placeholder>partner@…</Placeholder>
                            </p>
                            <button
                                type="button"
                                onClick={() => setSent(false)}
                                className="mt-4 text-body-sm font-semibold text-brand transition-colors hover:text-brand-700"
                            >
                                ← {t('partnerApply.backToForm')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit}>
                            <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">{t('partnerApply.formTitle')}</h2>
                            <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('partnerApply.formLead')}</p>

                            {!APPLY_ENDPOINT && (
                                <div className="mt-4 rounded-lg border border-warning-500/30 bg-warning-bg px-4 py-2.5 text-body-2xs leading-relaxed text-warning-700">
                                    {t('partnerApply.draftNote')}
                                </div>
                            )}

                            <div className="mt-2 flex flex-col gap-0 sm:flex-row sm:gap-4">
                                <div className="flex-1">
                                    <label htmlFor="pa-firm" className={'mt-4 ' + LABEL}>{t('partnerApply.firm')}</label>
                                    <input id="pa-firm" value={firm} onChange={(e) => setFirm(e.target.value)} className={FIELD} />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="pa-contact" className={'mt-4 ' + LABEL}>{t('partnerApply.contact')}</label>
                                    <input id="pa-contact" value={contact} onChange={(e) => setContact(e.target.value)} className={FIELD} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-0 sm:flex-row sm:gap-4">
                                <div className="flex-1">
                                    <label htmlFor="pa-email" className={'mt-4 ' + LABEL}>{t('partnerApply.email')}</label>
                                    <input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('partnerApply.emailPh')} className={FIELD} />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="pa-web" className={'mt-4 ' + LABEL}>{t('partnerApply.website')}</label>
                                    <input id="pa-web" value={website} onChange={(e) => setWebsite(e.target.value)} className={FIELD} />
                                </div>
                            </div>
                            <label htmlFor="pa-cred" className={'mt-4 ' + LABEL}>{t('partnerApply.credentials')}</label>
                            <input id="pa-cred" value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder={t('partnerApply.credentialsPh')} className={FIELD} />

                            <span className={'mt-5 ' + LABEL}>{t('partnerApply.areas')}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {DOMAINS.map((d) => (
                                    <Segment key={d.slug} selected={areas.includes(d.slug)} onClick={() => toggle(areas, setAreas)(d.slug)}>
                                        {t(`register.domains.${d.i18nKey}`, { ns: 'auth', defaultValue: d.label })}
                                    </Segment>
                                ))}
                            </div>

                            <span className={'mt-5 ' + LABEL}>{t('partnerApply.markets')}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {MARKET_CODES.map((c) => (
                                    <Segment key={c} selected={markets.includes(c)} onClick={() => toggle(markets, setMarkets)(c)}>
                                        {c}
                                    </Segment>
                                ))}
                            </div>

                            <label htmlFor="pa-msg" className={'mt-5 ' + LABEL}>{t('partnerApply.message')}</label>
                            <textarea id="pa-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('partnerApply.messagePh')} className={FIELD + ' resize-none'} />

                            <div className="mt-6 flex items-center justify-between gap-4 border-t border-stroke-subtle pt-5">
                                <p className="max-w-[220px] text-body-3xs leading-relaxed text-fg-tertiary">{t('partnerApply.privacy')}</p>
                                <Button type="submit" variant="primary" shape="soft" size="lg" disabled={!canSubmit} className="shrink-0">
                                    {t('partnerApply.submit')} <ArrowRight size={16} />
                                </Button>
                            </div>
                            <p className="mt-4 text-center text-body-2xs text-fg-tertiary">
                                {t('partnerApply.questions')}{' '}
                                <button type="button" onClick={() => navigate(`/${lang}/contact?lane=partner`)} className="font-semibold text-brand transition-colors hover:text-brand-700">
                                    {t('partnerApply.questionsLink')}
                                </button>
                            </p>
                        </form>
                    )}
                </div>
                <SystemFooter className="mt-10 lg:hidden" />
            </div>
        </div>
    );
}
