import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { SystemFooter } from '../../components/auth/SystemFooter';
import { ApiError } from '../../api/client';
import { acceptInvite, readInvite, type Invite } from '../../api/providerInvites';
import { errorFieldOf } from '../../lib/serverErrors';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// ─── /provider-invite · die Einladung ins Onboarding (P01, 24.11.2026) ───────
// Der Link aus der Einladungsmail gehoert zu genau einer Bewerbung. Hier
// richtet die eingeladene Person ihr Konto ein (Passwort; die Adresse ist die
// der Bewerbung) und landet danach im Anbieter-Bereich auf "Application",
// wo Unternehmensdaten und Nachweise stehen. Dasselbe Split-Muster wie
// /provider-apply: links der Weg, rechts die eine Eingabe.
//
// Befund aus dem Nachtest (28.11.2026): E-Mail plus "Password" las sich wie
// eine Anmeldung. Feld, Hinweis und Einleitung sagen deshalb selbst, dass hier
// ein neues Passwort gewaehlt wird; es stand vorher nur links in Schritt 01.
//
// Die Seite sagt, was der Schritt ist und was nicht: eingeladen heisst nicht
// verifiziert. Ohne gueltigen Link gibt es kein Formular, sondern den Grund.

const FIELD =
    'mt-2 w-full rounded-lg border border-stroke bg-surface px-3.5 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-stroke-focus/35';
const LABEL = 'block text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary';
const STEPS = ['account', 'profile', 'verification'] as const;
const PASSWORD_MIN = 8;

type Problem = 'invalid' | 'expired' | 'used' | 'unreachable';
type Failure = 'exists' | 'weak' | 'failed' | 'signin';

function problemOf(err: unknown): Problem {
    const code = err instanceof ApiError ? err.body.errorCode : undefined;
    if (code === 'INVITE_EXPIRED') return 'expired';
    if (code === 'INVITE_USED') return 'used';
    if (err instanceof ApiError && err.status === 404) return 'invalid';
    return 'unreachable';
}

export function ProviderInvitePage() {
    const { t, i18n } = useTranslation('providerws');
    const lang = i18n.resolvedLanguage || 'en';
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const authLogin = useAuthStore((s) => s.login);

    const [invite, setInvite] = useState<Invite | null>(null);
    const [problem, setProblem] = useState<Problem | null>(token ? null : 'invalid');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [tried, setTried] = useState(false);
    const [state, setState] = useState<'idle' | 'sending'>('idle');
    const [failure, setFailure] = useState<Failure | null>(null);

    useEffect(() => {
        if (!token) return;
        let live = true;
        readInvite(token).then((i) => { if (live) setInvite(i); }).catch((err) => { if (live) setProblem(problemOf(err)); });
        return () => { live = false; };
    }, [token]);

    const short = password.length < PASSWORD_MIN;
    const fieldError = tried && short ? t('invite.passwordShort', { min: PASSWORD_MIN }) : failure === 'weak' ? t('invite.passwordWeak') : null;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (state === 'sending' || !invite) return;
        setTried(true);
        setFailure(null);
        if (short) { document.getElementById('invite-password')?.focus(); return; }
        setState('sending');
        try {
            const done = await acceptInvite(token, password);
            const sb = isSupabaseConfigured ? await getSupabase() : null;
            if (sb) {
                const { error } = await sb.auth.signInWithPassword({ email: done.email, password });
                // Das Konto besteht, nur die Anmeldung hat nicht geklappt: das
                // sagt die Seite und fuehrt zum Login, statt neu anzulegen.
                if (error) { setFailure('signin'); setState('idle'); return; }
            } else {
                authLogin('partner', invite.first_name ?? invite.firm);
            }
            navigate(`/${lang}/provider-dashboard/application`);
        } catch (err) {
            const code = err instanceof ApiError ? err.body.errorCode : undefined;
            if (code === 'INVITE_EXPIRED' || code === 'INVITE_USED' || code === 'INVITE_INVALID') { setProblem(problemOf(err)); return; }
            setFailure(code === 'EMAIL_HAS_LOGIN' ? 'exists' : errorFieldOf(err) === 'password' ? 'weak' : 'failed');
            setState('idle');
            if (errorFieldOf(err) === 'password') document.getElementById('invite-password')?.focus();
        }
    };

    const until = invite?.expires_at ? new Date(invite.expires_at).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

    return (
        <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
            {/* LINKS · der Weg auf dem Gradient */}
            <div className="flex flex-col justify-between gap-8 bg-gradient-stage px-6 pb-8 pt-8 lg:w-[46%] lg:gap-0 lg:px-14 lg:py-10">
                <Logo lockup="horizontal" href="/" className="h-[36px]" />
                <div className="max-w-[460px] py-6 lg:py-0">
                    <p className="text-body-3xs font-bold uppercase tracking-[0.14em] text-brand">{t('invite.eyebrow')}</p>
                    <h1 className="mt-4 font-serif text-[1.75rem] font-bold leading-[1.16] tracking-tight text-fg lg:text-[2.125rem]">
                        {t('invite.titlePre')}<span className="text-fg-accent-emphasis">{t('invite.titleGold')}</span>{t('invite.titlePost')}
                    </h1>
                    <div className="mt-7 divide-y divide-[rgba(2,22,17,0.08)] border-y border-[rgba(2,22,17,0.08)]">
                        {STEPS.map((k, i) => (
                            <div key={k} className="flex gap-3.5 py-3.5" data-step={k}>
                                <span className="w-5 font-serif text-body-md font-bold text-fg-accent-strong">{`0${i + 1}`}</span>
                                <span className="min-w-0">
                                    <span className="block text-body-sm font-bold text-fg">{t(`invite.steps.${k}.title`)}</span>
                                    <span className="mt-0.5 block text-body-xs leading-relaxed text-fg-secondary">{t(`invite.steps.${k}.desc`)}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-5 text-body-xs leading-relaxed text-fg-secondary">{t('invite.notVerified')}</p>
                </div>
                <SystemFooter className="hidden lg:flex" />
            </div>

            {/* RECHTS · die eine Eingabe, oder der Grund, warum es keine gibt */}
            <div className="flex flex-1 flex-col justify-center border-stroke-subtle px-6 pb-10 pt-8 lg:border-l lg:px-14 lg:py-12">
                <div className="mx-auto w-full max-w-[440px]">
                    {problem ? (
                        <div className="flex flex-col gap-4" role="status" data-problem={problem}>
                            <div className="flex flex-col gap-2 rounded-xl border border-stroke bg-surface-secondary p-[22px]">
                                <h2 className="font-serif text-[1.25rem] font-bold leading-snug text-fg">{t(`invite.problem.${problem}.title`)}</h2>
                                <p className="text-body-sm leading-relaxed text-fg-secondary">{t(`invite.problem.${problem}.body`)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {problem === 'used' && <Button type="button" variant="primary" shape="soft" size="md" onClick={() => navigate(`/${lang}/login`)}>{t('invite.signIn')}</Button>}
                                <Button type="button" variant={problem === 'used' ? 'ghost' : 'secondary'} size="md" onClick={() => navigate(`/${lang}/contact?lane=partner`)}>{t('invite.contact')}</Button>
                            </div>
                        </div>
                    ) : !invite ? (
                        <p className="text-body-sm text-fg-secondary" role="status">{t('invite.loading')}</p>
                    ) : (
                        <form onSubmit={submit} noValidate>
                            <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-fg">
                                {invite.first_name ? t('invite.helloName', { name: invite.first_name }) : t('invite.hello')}
                            </h2>
                            <p className="mt-2 text-body-sm leading-relaxed text-fg-secondary">{t('invite.lead', { firm: invite.firm })}</p>

                            <label htmlFor="invite-email" className={'mt-6 ' + LABEL}>{t('invite.email')}</label>
                            <input id="invite-email" type="email" value={invite.email} readOnly autoComplete="username" aria-describedby="invite-email-hint" className={FIELD + ' bg-surface-secondary text-fg-secondary'} />
                            <p id="invite-email-hint" className="mt-1.5 text-body-3xs leading-snug text-fg-tertiary">{t('invite.emailHint')}</p>

                            <div className="mt-4 flex items-end justify-between">
                                <label htmlFor="invite-password" className={LABEL}>{t('invite.password')}</label>
                                <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="text-body-3xs font-semibold text-brand transition-colors hover:text-brand-700">
                                    {show ? t('invite.hide') : t('invite.show')}
                                </button>
                            </div>
                            <input id="invite-password" type={show ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); if (failure === 'weak') setFailure(null); }} autoComplete="new-password" minLength={PASSWORD_MIN}
                                aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? 'invite-password-error' : 'invite-password-hint'}
                                className={FIELD + (fieldError ? ' border-error-500 bg-error-bg dark:bg-red-500/10' : '')} />
                            {fieldError
                                ? <p id="invite-password-error" className="mt-1.5 text-body-3xs leading-snug text-error-700 dark:text-red-300">{fieldError}</p>
                                : <p id="invite-password-hint" className="mt-1.5 text-body-3xs leading-snug text-fg-tertiary">{t('invite.passwordHint', { min: PASSWORD_MIN })}</p>}

                            {failure && failure !== 'weak' && (
                                <div role="alert" data-failure={failure} className="mt-5 rounded-lg border border-warning-500/30 bg-warning-bg px-4 py-3 text-body-xs leading-relaxed text-warning-800 dark:bg-amber-500/10 dark:text-amber-200">
                                    {t(`invite.failure.${failure}`)}
                                    {failure === 'signin' && (
                                        <button type="button" onClick={() => navigate(`/${lang}/login`)} className="ml-1 font-semibold underline">{t('invite.signIn')}</button>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex items-center justify-between gap-4 border-t border-stroke-subtle pt-5">
                                <p className="max-w-[220px] text-body-3xs leading-relaxed text-fg-tertiary">{until ? t('invite.validUntil', { date: until }) : ''}</p>
                                <Button type="submit" variant="primary" shape="soft" size="lg" loading={state === 'sending'} className="shrink-0">
                                    {state === 'sending' ? t('invite.sending') : t('invite.submit')}
                                    {state !== 'sending' && <ArrowRight size={16} />}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
                <SystemFooter className="mt-10 lg:hidden" />
            </div>
        </div>
    );
}
