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
import { SendFailed } from '../components/contact/SendStates';
import { EMAIL_RE, failureOf, invalidFieldOf, sendContact, type SendFailure } from '../api/contact';

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
// Senden (Beta-Plan Di 13.10.): POST /api/v1/contact mit lane 'application'.
// Die Bewerbung kommt als strukturierte Mail ins Postfach; passt es, laden wir
// per Intake-Link ein (bestehender Weg). Canvas „Kontakt und Bewerbung
// senden", Wahl D2 (10.10.2026): links wird die Aussicht zum Stand — Schritt
// 01 bekommt den Haken. Figma: Screens-Datei, 3638:62.

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
    const [hp, setHp] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
    const [failure, setFailure] = useState<{ kind: SendFailure; error: unknown } | null>(null);
    const [acknowledged, setAcknowledged] = useState(true);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const sent = status === 'sent';

    const canSubmit =
        firm.trim() && contact.trim() && EMAIL_RE.test(email.trim()) && credentials.trim() && areas.length > 0 && markets.length > 0;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit || status === 'sending') return;
        setStatus('sending');
        setFailure(null);
        setFieldError(null);
        try {
            const r = await sendContact({
                lane: 'application', locale: lang, name: contact.trim(), email: email.trim(), firm: firm.trim(),
                website: website.trim(), credentials: credentials.trim(), areas, markets, message, hp,
            });
            setAcknowledged(r.acknowledged);
            setStatus('sent');
        } catch (err) {
            const field = invalidFieldOf(err);
            if (field) {
                // Das Feld, das der Server bemaengelt (die Kontaktperson heisst
                // dort `name`). Jedes Feld der Route hat einen eigenen Satz.
                setFieldError(t(`contactSend.field.${field}`));
                setStatus('idle');
                return;
            }
            setFailure({ kind: failureOf(err), error: err });
            setStatus('failed');
        }
    };

    const toggle = (list: string[], set: (v: string[]) => void) => (v: string) =>
        set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · die Aussicht auf dem Gradient */}
            <div className="flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:w-[46%] lg:gap-0 lg:px-14 lg:py-10">
                <Logo lockup="horizontal" href="/" className="h-[36px]" />

                <div className="max-w-[460px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">
                        {t('partnerApply.eyebrow')}
                    </p>
                    <h1 className="mt-4 font-serif text-[1.75rem] font-bold leading-[1.16] tracking-tight text-fg lg:text-[2.125rem]">
                        {t('partnerApply.titlePre')}
                        <span className="text-fg-accent-emphasis">{t('partnerApply.titleGold')}</span>
                        {t('partnerApply.titlePost')}
                    </h1>

                    {/* Die Aussicht: was nach dem Absenden passiert — der Kern
                        der Nutzer-Anforderung ("das müssen wir ihm sagen"). */}
                    <div className="mt-7 divide-y divide-[rgba(2,22,17,0.08)] border-y border-[rgba(2,22,17,0.08)]">
                        {OUTLOOK.map((k, i) => {
                            const done = sent && i === 0;
                            return (
                                <div key={k} className="flex gap-3.5 py-3.5" data-step={k} data-done={done}>
                                    <span className={'w-5 font-serif text-body-md font-bold ' + (done ? 'text-brand' : 'text-accent-700 dark:text-fg-accent-strong')}>
                                        {done ? '✓' : `0${i + 1}`}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-body-sm font-bold text-fg">{t(`partnerApply.outlook.${k}.title`)}</span>
                                        <span className={'mt-0.5 block text-body-xs leading-relaxed ' + (done ? 'font-semibold text-brand' : 'text-fg-secondary')}>
                                            {done ? t('partnerApply.sent.progress') : t(`partnerApply.outlook.${k}.desc`)}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 grid grid-cols-3 border-y border-stroke-subtle py-4">
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
                        <div className="flex flex-col gap-4" role="status">
                            {acknowledged ? (
                                <div className="flex flex-col gap-2 rounded-xl border border-success-500/30 bg-success-bg p-[22px] dark:bg-emerald-500/10">
                                    <h2 className="font-serif text-[1.25rem] font-bold leading-snug text-fg">{t('partnerApply.sent.title')}</h2>
                                    <p className="text-body-sm leading-relaxed text-fg-secondary">{t('partnerApply.sent.body', { email: email.trim() })}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 rounded-xl border border-warning-500/30 bg-warning-bg p-[22px] dark:bg-amber-500/10">
                                    <h2 className="font-serif text-[1.25rem] font-bold leading-snug text-fg">{t('partnerApply.sent.title')}</h2>
                                    <p className="text-body-sm leading-relaxed text-warning-700 dark:text-amber-200">{t('contactSend.ackFailed', { email: email.trim() })}</p>
                                </div>
                            )}
                            {/* Kein „Zurueck zum Formular": eine zweite Bewerbung waere ein Duplikat (D2). */}
                            <div>
                                <Button type="button" variant="ghost" size="md" onClick={() => navigate(`/${lang}`)}>
                                    {t('partnerApply.sent.home')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit}>
                            <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">{t('partnerApply.formTitle')}</h2>
                            <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('partnerApply.formLead')}</p>


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

                            {/* Honeypot: fuer Menschen unsichtbar und nicht erreichbar. */}
                            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                                <label htmlFor="pa-hp">Website</label>
                                <input id="pa-hp" name="website_hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                            </div>

                            {fieldError && <p role="alert" className="mt-5 text-body-2xs leading-snug text-error-700 dark:text-red-400">{fieldError}</p>}
                            {status === 'failed' && failure && (
                                <div className="mt-5"><SendFailed kind="application" failure={failure.kind} error={failure.error} /></div>
                            )}

                            <div className="mt-6 flex items-center justify-between gap-4 border-t border-stroke-subtle pt-5">
                                <p className="max-w-[220px] text-body-3xs leading-relaxed text-fg-tertiary">{t('partnerApply.privacy')}</p>
                                <Button type="submit" variant="primary" shape="soft" size="lg" disabled={!canSubmit} loading={status === 'sending'} className="shrink-0">
                                    {status === 'sending' ? t('contactSend.sending') : status === 'failed' ? t('contactSend.retry') : t('partnerApply.submit')}
                                    {status !== 'sending' && <ArrowRight size={16} />}
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
