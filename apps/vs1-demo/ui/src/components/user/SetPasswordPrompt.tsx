import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check, Circle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldError, FIELD_ERROR_CLASS, errorAria } from "../ui/FieldError";
import { focusField } from "../ui/FormErrorSummary";
import { useAuthStore } from "../../store/useAuthStore";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import { authFailureFrom } from "../../lib/serverErrors";

// ─── Passwort festlegen (Canvas-Wahl L3-A, 28.11.2026) ───────────────────────
// Unternehmen melden sich seit dem 28.11. mit E-Mail und Passwort an. Konten,
// die ueber den alten Anmeldelink oder Google entstanden sind, haben keins —
// ihnen bietet das Dashboard nach der Anmeldung dieses Fenster an.
//
// Ueberspringbar ("Spaeter"): Wert vor Verpflichtung (DNA). Es kommt bei der
// naechsten Anmeldung wieder; gemerkt wird dafuer nur Konto-ID und Zeitpunkt
// der letzten Anmeldung, im localStorage dieses Browsers.
//
// Ob ein Passwort existiert, weiss nur die Datenbank (auth.users) — der Browser
// fragt `current_user_has_password()` (Migration 20261128000000). Schlaegt die
// Frage fehl, bleibt das Fenster zu: Es ist ein Angebot, kein Tor.

const LATER_KEY = "ch360_pw_prompt_later";

export interface PasswordRules { length: boolean; mix: boolean; match: boolean }

export function passwordRules(pw: string, confirm: string): PasswordRules {
    return {
        length: pw.length >= 8,
        mix: /\p{L}/u.test(pw) && /\d/.test(pw),
        match: pw.length > 0 && pw === confirm,
    };
}

const readLater = (): string | null => { try { return localStorage.getItem(LATER_KEY); } catch { return null; } };
const writeLater = (v: string) => { try { localStorage.setItem(LATER_KEY, v); } catch { /* privates Fenster: dann eben beim naechsten Laden wieder */ } };

const FIELD =
    "mt-2 w-full rounded-lg border border-stroke-input bg-surface px-3.5 py-3 text-body-md text-fg outline-none transition-colors placeholder:text-fg-tertiary focus:border-stroke-focus focus:ring-2 focus:ring-inset focus:ring-primary-500/35";
const LABEL = "block text-body-3xs font-bold uppercase tracking-[0.1em] text-fg-secondary";

export function SetPasswordPrompt() {
    const { t } = useTranslation("auth");
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const role = useAuthStore((s) => s.role);

    const [open, setOpen] = useState(false);
    const [stamp, setStamp] = useState<string | null>(null);
    const [pw, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [serverPw, setServerPw] = useState<null | "weakPassword" | "samePassword">(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isLoggedIn || role !== "user" || !isSupabaseConfigured) return;
        let cancelled = false;
        void (async () => {
            const sb = await getSupabase();
            if (!sb || cancelled) return;
            const { data: { session } } = await sb.auth.getSession();
            const user = session?.user;
            if (!user || cancelled) return;
            const here = `${user.id}|${user.last_sign_in_at ?? ""}`;
            if (readLater() === here) return;
            const { data, error: rpcError } = await sb.rpc("current_user_has_password");
            if (cancelled) return;
            if (rpcError) {
                // Kein Tor: ohne Antwort kein Fenster. Sichtbar in der Konsole,
                // damit eine fehlende Migration nicht still bleibt.
                console.warn("[SetPasswordPrompt] current_user_has_password failed", rpcError.message);
                return;
            }
            if (data === false) { setStamp(here); setOpen(true); }
        })();
        return () => { cancelled = true; };
    }, [isLoggedIn, role]);

    const rules = passwordRules(pw, confirm);
    const allOk = rules.length && rules.mix && rules.match;

    const later = () => {
        if (stamp) writeLater(stamp);
        setOpen(false);
    };

    const save = async () => {
        setTried(true);
        setError(false);
        if (!allOk) { focusField(!rules.length || !rules.mix ? "set-pw-new" : "set-pw-confirm"); return; }
        const sb = await getSupabase();
        if (!sb) { setError(true); return; }
        setSaving(true);
        const { error: e } = await sb.auth.updateUser({ password: pw });
        setSaving(false);
        if (e) {
            const f = authFailureFrom(e);
            if (f === "weakPassword" || f === "samePassword") { setServerPw(f); focusField("set-pw-new"); return; }
            setError(true);
            return;
        }
        setSaved(true);
    };

    const newError = serverPw ? t(`authErrors.${serverPw}`) : null;
    const gold = { gold: <span className="text-fg-accent-strong" /> };
    const ruleRows: { key: keyof PasswordRules; label: string }[] = [
        { key: "length", label: t("setPassword.rules.length") },
        { key: "mix", label: t("setPassword.rules.mix") },
        { key: "match", label: t("setPassword.rules.match") },
    ];

    return (
        <Modal
            open={open}
            onClose={saved ? () => setOpen(false) : later}
            size="sm"
            hideClose
            title={
                <span className="font-serif text-[1.5rem] font-bold leading-tight text-fg">
                    <Trans t={t} i18nKey={saved ? "setPassword.savedTitle" : "setPassword.title"} components={gold} />
                </span>
            }
            description={saved ? t("setPassword.savedBody") : t("setPassword.body")}
            footer={saved ? (
                <Button fullWidth onClick={() => setOpen(false)}>{t("setPassword.continue")}</Button>
            ) : (
                <>
                    <Button variant="outline" onClick={later}>{t("setPassword.later")}</Button>
                    <Button className="flex-1" loading={saving} onClick={save}>{t("setPassword.save")}</Button>
                </>
            )}
        >
            {!saved && (
                <form noValidate onSubmit={(e) => { e.preventDefault(); void save(); }} className="pb-1">
                    <label htmlFor="set-pw-new" className={"mt-2 " + LABEL}>{t("setPassword.newLabel")}</label>
                    <div className="relative">
                        <input
                            id="set-pw-new"
                            type={show ? "text" : "password"}
                            autoComplete="new-password"
                            value={pw}
                            onChange={(e) => { setPw(e.target.value); setServerPw(null); }}
                            className={FIELD + " pr-20" + (newError ? FIELD_ERROR_CLASS : "")}
                            {...errorAria("set-pw-new", !!newError)}
                        />
                        <button
                            type="button"
                            onClick={() => setShow((v) => !v)}
                            className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 px-1 text-body-2xs font-semibold text-fg-tertiary transition-colors hover:text-fg"
                        >
                            {show ? t("setPassword.hide") : t("setPassword.show")}
                        </button>
                    </div>
                    <FieldError id="set-pw-new" message={newError} />
                    <label htmlFor="set-pw-confirm" className={"mt-4 " + LABEL}>{t("setPassword.confirmLabel")}</label>
                    <input
                        id="set-pw-confirm"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={FIELD}
                    />
                    <ul aria-live="polite" className="mt-4 flex flex-col gap-1.5">
                        {ruleRows.map(({ key, label }) => (
                            <li key={key} className={"flex items-center gap-2 text-body-xs " + (rules[key] ? "text-success-700 dark:text-success-300" : "text-fg-secondary")}>
                                {rules[key]
                                    ? <Check size={15} strokeWidth={2.5} aria-hidden />
                                    : <Circle size={14} aria-hidden className="text-fg-tertiary" />}
                                <span>{label}</span>
                                <span className="sr-only">: {t(rules[key] ? "setPassword.rules.met" : "setPassword.rules.open")}</span>
                            </li>
                        ))}
                    </ul>
                    {tried && !allOk && (
                        <p role="alert" className="mt-3 text-body-xs text-error-700 dark:text-error-300">{t("setPassword.incomplete")}</p>
                    )}
                    {error && (
                        <p role="alert" className="mt-3 text-body-xs text-error-700 dark:text-error-300">{t("setPassword.error")}</p>
                    )}
                    <p className="mt-4 text-body-2xs leading-relaxed text-fg-tertiary">{t("setPassword.note")}</p>
                    {/* Enter im Feld speichert; der sichtbare Knopf sitzt im Fuss. */}
                    <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>{t("setPassword.save")}</button>
                </form>
            )}
        </Modal>
    );
}
