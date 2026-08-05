import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import { Typography } from "../../components/ui/Typography";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/useAuthStore";

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type Role = "user" | "partner";

interface UserFormData {
    name: string;
    email: string;
    password: string;
    consent: boolean;
    companyName: string;
    industry: string;
    companySize: string;
    country: string;
    targetMarkets: string[];
    complianceAreas: string[];
    intent: string;
    urgency: string;
}

interface PartnerFormData {
    name: string;
    email: string;
    password: string;
    consent: boolean;
    firmName: string;
    specializations: string[];
    countries: string[];
    slaResponse: string;
    capacity: string;
    website: string;
}

const DEFAULT_USER: UserFormData = {
    name: "", email: "", password: "", consent: false,
    companyName: "", industry: "", companySize: "", country: "", targetMarkets: [],
    complianceAreas: [], intent: "", urgency: "",
};

const DEFAULT_PARTNER: PartnerFormData = {
    name: "", email: "", password: "", consent: false,
    firmName: "", specializations: [], countries: [],
    slaResponse: "", capacity: "", website: "",
};

/* ─── Constants ──────────────────────────────────────────────────────────────── */
/* Option definitions carry stable values + i18n key segments; the user-visible
   labels are resolved via the 'auth' namespace (register.*) inside components. */

const INDUSTRY_KEYS = ["ecommerce", "marketplace", "saas", "agency", "manufacturing", "other"] as const;

const COMPANY_SIZE_VALUES = ["1-10", "11-50", "51-200", "201+"] as const;

const COUNTRY_DEFS = [
    { value: "de", flag: "🇩🇪" }, { value: "uk", flag: "🇬🇧" }, { value: "fr", flag: "🇫🇷" }, { value: "nl", flag: "🇳🇱" },
    { value: "at", flag: "🇦🇹" }, { value: "ch", flag: "🇨🇭" }, { value: "it", flag: "🇮🇹" }, { value: "es", flag: "🇪🇸" },
    { value: "pl", flag: "🇵🇱" }, { value: "se", flag: "🇸🇪" }, { value: "us", flag: "🇺🇸" }, { value: "eu", flag: "🇪🇺" },
] as const;

const COMPLIANCE_AREA_DEFS = [
    { value: "tax-vat", tKey: "taxVat", icon: "account_balance" },
    { value: "data-privacy", tKey: "dataPrivacy", icon: "shield" },
    { value: "epr", tKey: "epr", icon: "inventory_2" },
    { value: "marketing-seo", tKey: "marketingSeo", icon: "campaign" },
    { value: "corporate", tKey: "corporate", icon: "domain" },
    { value: "full-support", tKey: "fullSupport", icon: "support_agent" },
] as const;

const SPECIALIZATION_DEFS = [
    { value: "tax-vat", tKey: "taxVat" },
    { value: "data-privacy", tKey: "dataPrivacy" },
    { value: "epr", tKey: "epr" },
    { value: "marketing", tKey: "marketing" },
    { value: "corporate", tKey: "corporate" },
    { value: "trade", tKey: "trade" },
] as const;

const INTENT_DEFS = [
    { value: "self-check", tKey: "selfCheck" },
    { value: "expert", tKey: "expert" },
    { value: "full-service", tKey: "fullService" },
] as const;

const URGENCY_DEFS = [
    { value: "today", tKey: "today", icon: "⚡" },
    { value: "week", tKey: "week", icon: "📅" },
    { value: "month", tKey: "month", icon: "🗓️" },
    { value: "researching", tKey: "researching", icon: "🔍" },
] as const;

/* ─── Benefits Data (icons only — copy lives in auth:register.*Benefits) ─────── */

const USER_BENEFIT_ICONS = ["speed", "dashboard", "group", "verified"] as const;
const PARTNER_BENEFIT_ICONS = ["trending_up", "handshake", "public", "bolt"] as const;

/** Country <select>/chip options with the localized country name. */
function useCountryOptions() {
    const { t } = useTranslation("auth");
    return COUNTRY_DEFS.map((c) => ({ value: c.value, label: `${c.flag} ${t(`register.countryNames.${c.value}`)}` }));
}

/* ─── Shared Components ──────────────────────────────────────────────────────── */

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

function StepProgress({ current, total, label }: { current: number; total: number; label: string }) {
    const { t } = useTranslation("auth");
    const pct = Math.round((current / total) * 100);
    return (
        <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center">
                <Typography variant="body" weight="semibold" className="uppercase tracking-widest text-neutral-400 text-[10px]">
                    {t("register.stepProgress", { current, total, label })}
                </Typography>
                <Typography variant="body" weight="bold" className="text-primary-600 text-[10px]">
                    {pct}%
                </Typography>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: total }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                            i < current ? "bg-primary-500" : "bg-neutral-100"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

function InputField({ id, label, type = "text", required, value, onChange, placeholder, minLength }: {
    id: string; label: string; type?: string; required?: boolean;
    value: string; onChange: (v: string) => void; placeholder: string; minLength?: number;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                {label}
            </label>
            <input
                id={id}
                type={type}
                required={required}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                minLength={minLength}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
        </div>
    );
}

function SelectField({ id, label, value, onChange, options, placeholder }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                {label}
            </label>
            <select
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function MultiSelectChips({ label, options, selected, onChange }: {
    label: string; options: { value: string; label: string; icon?: string }[];
    selected: string[]; onChange: (v: string[]) => void;
}) {
    const toggle = (val: string) => {
        onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
    };
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map(o => {
                    const active = selected.includes(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => toggle(o.value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                                active
                                    ? "bg-primary-50 border-primary-300 text-primary-700"
                                    : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                            }`}
                        >
                            {o.icon && <span className="material-symbols-outlined text-base">{o.icon}</span>}
                            {o.label}
                            {active && <span className="material-symbols-outlined text-sm text-primary-500">check</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    const { t } = useTranslation("auth");
    return (
        <label className="flex items-start gap-3 cursor-pointer group select-none">
            <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    checked ? "border-primary-500 bg-primary-500" : "border-neutral-300 group-hover:border-neutral-400"
                }`}
            >
                {checked && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
            </button>
            <span className="text-xs text-neutral-500 leading-relaxed">
                <Trans
                    t={t}
                    i18nKey="register.consent"
                    components={{
                        terms: <a href="#" className="text-primary-500 hover:underline" />,
                        privacy: <a href="#" className="text-primary-500 hover:underline" />,
                    }}
                />
            </span>
        </label>
    );
}

/* ─── Slide Animation ────────────────────────────────────────────────────────── */

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

/* ─── User Wizard Steps ──────────────────────────────────────────────────────── */

function UserStep1({ data, onChange }: { data: UserFormData; onChange: (d: Partial<UserFormData>) => void }) {
    const { t } = useTranslation("auth");
    return (
        <div className="flex flex-col gap-4">
            {/* Google SSO */}
            <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all"
            >
                <GoogleIcon />
                {t("register.googleSignup")}
            </button>
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400 font-medium">{t("register.orEmail")}</span>
                <div className="flex-1 h-px bg-neutral-200" />
            </div>
            <InputField id="reg-name" label={t("register.nameLabel")} required value={data.name} onChange={v => onChange({ name: v })} placeholder={t("register.namePlaceholder")} />
            <InputField id="reg-email" label={t("register.emailLabel")} type="email" required value={data.email} onChange={v => onChange({ email: v })} placeholder="name@unternehmen.de" />
            <InputField id="reg-password" label={t("register.passwordLabel")} type="password" required value={data.password} onChange={v => onChange({ password: v })} placeholder={t("register.passwordPlaceholder")} minLength={8} />
            <ConsentCheckbox checked={data.consent} onChange={v => onChange({ consent: v })} />
        </div>
    );
}

function UserStep2({ data, onChange }: { data: UserFormData; onChange: (d: Partial<UserFormData>) => void }) {
    const { t } = useTranslation("auth");
    const countryOptions = useCountryOptions();
    const industries = INDUSTRY_KEYS.map(k => ({ value: k, label: t(`register.industries.${k}`) }));
    const companySizes = COMPANY_SIZE_VALUES.map((v, i) => ({ value: v, label: t(`register.companySizes.${i}`) }));
    return (
        <div className="flex flex-col gap-5">
            <InputField id="reg-company" label={t("register.companyLabel")} required value={data.companyName} onChange={v => onChange({ companyName: v })} placeholder={t("register.companyPlaceholder")} />
            <SelectField id="reg-industry" label={t("register.industryLabel")} value={data.industry} onChange={v => onChange({ industry: v })} options={industries} placeholder={t("register.industryPlaceholder")} />
            <SelectField id="reg-size" label={t("register.sizeLabel")} value={data.companySize} onChange={v => onChange({ companySize: v })} options={companySizes} placeholder={t("register.sizePlaceholder")} />
            <SelectField id="reg-country" label={t("register.countryLabel")} value={data.country} onChange={v => onChange({ country: v })} options={countryOptions} placeholder={t("register.countryPlaceholder")} />
            <MultiSelectChips
                label={t("register.targetMarketsLabel")}
                options={countryOptions}
                selected={data.targetMarkets}
                onChange={v => onChange({ targetMarkets: v })}
            />
        </div>
    );
}

function UserStep3({ data, onChange }: { data: UserFormData; onChange: (d: Partial<UserFormData>) => void }) {
    const { t } = useTranslation("auth");
    const complianceAreas = COMPLIANCE_AREA_DEFS.map(a => ({ value: a.value, label: t(`register.complianceAreas.${a.tKey}`), icon: a.icon }));
    const intents = INTENT_DEFS.map(o => ({ value: o.value, label: t(`register.intents.${o.tKey}.label`), desc: t(`register.intents.${o.tKey}.desc`) }));
    const urgencyOptions = URGENCY_DEFS.map(o => ({ value: o.value, label: t(`register.urgencyOptions.${o.tKey}`), icon: o.icon }));
    return (
        <div className="flex flex-col gap-5">
            <MultiSelectChips
                label={t("register.complianceAreasLabel")}
                options={complianceAreas}
                selected={data.complianceAreas}
                onChange={v => onChange({ complianceAreas: v })}
            />
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{t("register.intentLabel")}</span>
                <div className="flex flex-col gap-2">
                    {intents.map(opt => {
                        const active = data.intent === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange({ intent: opt.value })}
                                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                    active ? "bg-primary-50 border-primary-300" : "bg-white border-neutral-200 hover:border-neutral-300"
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                                    active ? "border-primary-500" : "border-neutral-300"
                                }`}>
                                    {active && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                                </div>
                                <div>
                                    <span className={`text-sm font-semibold block ${active ? "text-primary-700" : "text-neutral-700"}`}>
                                        {opt.label}
                                    </span>
                                    <span className="text-xs text-neutral-500">{opt.desc}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{t("register.urgencyLabel")}</span>
                <div className="grid grid-cols-2 gap-2">
                    {urgencyOptions.map(opt => {
                        const active = data.urgency === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange({ urgency: opt.value })}
                                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                                    active ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                }`}
                            >
                                <span>{opt.icon}</span>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ─── Partner Wizard Steps ───────────────────────────────────────────────────── */

function PartnerStep1({ data, onChange }: { data: PartnerFormData; onChange: (d: Partial<PartnerFormData>) => void }) {
    const { t } = useTranslation("auth");
    return (
        <div className="flex flex-col gap-4">
            <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all"
            >
                <GoogleIcon />
                {t("register.googleSignup")}
            </button>
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-400 font-medium">{t("register.orEmail")}</span>
                <div className="flex-1 h-px bg-neutral-200" />
            </div>
            <InputField id="preg-name" label={t("register.nameLabel")} required value={data.name} onChange={v => onChange({ name: v })} placeholder={t("register.namePlaceholder")} />
            <InputField id="preg-email" label={t("register.emailLabel")} type="email" required value={data.email} onChange={v => onChange({ email: v })} placeholder="name@kanzlei.de" />
            <InputField id="preg-password" label={t("register.passwordLabel")} type="password" required value={data.password} onChange={v => onChange({ password: v })} placeholder={t("register.passwordPlaceholder")} minLength={8} />
            <ConsentCheckbox checked={data.consent} onChange={v => onChange({ consent: v })} />
        </div>
    );
}

function PartnerStep2({ data, onChange }: { data: PartnerFormData; onChange: (d: Partial<PartnerFormData>) => void }) {
    const { t } = useTranslation("auth");
    const countryOptions = useCountryOptions();
    const specializations = SPECIALIZATION_DEFS.map(s => ({ value: s.value, label: t(`register.specializations.${s.tKey}`) }));
    return (
        <div className="flex flex-col gap-5">
            <InputField id="preg-firm" label={t("register.firmLabel")} required value={data.firmName} onChange={v => onChange({ firmName: v })} placeholder={t("register.firmPlaceholder")} />
            <MultiSelectChips
                label={t("register.specializationsLabel")}
                options={specializations}
                selected={data.specializations}
                onChange={v => onChange({ specializations: v })}
            />
            <MultiSelectChips
                label={t("register.coverageLabel")}
                options={countryOptions}
                selected={data.countries}
                onChange={v => onChange({ countries: v })}
            />
        </div>
    );
}

function PartnerStep3({ data, onChange }: { data: PartnerFormData; onChange: (d: Partial<PartnerFormData>) => void }) {
    const { t } = useTranslation("auth");
    const SLA_OPTIONS = ["24h", "48h", "72h"].map((value, i) => ({ value, label: t(`register.slaOptions.${i}`) }));
    const CAPACITY_OPTIONS = ["1-5", "6-15", "16+"].map((value, i) => ({ value, label: t(`register.capacityOptions.${i}`) }));

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{t("register.slaLabel")}</span>
                <div className="flex flex-col gap-2">
                    {SLA_OPTIONS.map(opt => {
                        const active = data.slaResponse === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange({ slaResponse: opt.value })}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                                    active ? "bg-primary-50 border-primary-300 text-primary-700" : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                    active ? "border-primary-500" : "border-neutral-300"
                                }`}>
                                    {active && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                                </div>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <SelectField id="preg-capacity" label={t("register.capacityLabel")} value={data.capacity} onChange={v => onChange({ capacity: v })} options={CAPACITY_OPTIONS} placeholder={t("register.capacityPlaceholder")} />
            <InputField id="preg-website" label={t("register.websiteLabel")} value={data.website} onChange={v => onChange({ website: v })} placeholder="https://www.kanzlei.de" />
        </div>
    );
}

/* ─── Step Definitions ───────────────────────────────────────────────────────── */

const STEP_COUNT = 3;

/* ─── Benefits Panel ─────────────────────────────────────────────────────────── */

function BenefitsPanel({ role }: { role: Role }) {
    const { t } = useTranslation("auth");
    const benefitNs = role === "user" ? "userBenefits" : "partnerBenefits";
    const icons = role === "user" ? USER_BENEFIT_ICONS : PARTNER_BENEFIT_ICONS;
    const benefits = icons.map((icon, i) => ({
        icon,
        title: t(`register.${benefitNs}.${i}.title`),
        desc: t(`register.${benefitNs}.${i}.desc`),
    }));

    return (
        <div className="hidden desktop-s:flex flex-col justify-between h-full bg-primary-900 text-white p-10 lg:p-12">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-12">
                <span className="material-symbols-outlined text-primary-300 text-2xl">verified_user</span>
                <span className="text-lg font-bold tracking-tight">CompliHub360</span>
            </div>

            {/* Benefits */}
            <div className="flex-1 flex flex-col justify-center">
                <Typography variant="body" weight="semibold" className="uppercase tracking-widest text-primary-400 text-[10px] mb-4">
                    {role === "user" ? t("register.benefits.userEyebrow") : t("register.benefits.partnerEyebrow")}
                </Typography>
                <Typography variant="h2" weight="bold" className="text-white mb-8 leading-tight">
                    {role === "user"
                        ? t("register.benefits.userHeadline")
                        : t("register.benefits.partnerHeadline")}
                </Typography>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={role}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5"
                    >
                        {benefits.map((b, i) => (
                            <motion.div
                                key={b.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.08 }}
                                className="flex items-start gap-4"
                            >
                                <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-primary-300 text-xl">{b.icon}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-white block mb-0.5">{b.title}</span>
                                    <span className="text-xs text-primary-300/80 leading-relaxed">{b.desc}</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Trust signal */}
            <div className="mt-12 pt-6 border-t border-white/10">
                <span className="text-xs text-primary-400/60">
                    {t("register.benefits.trust")}
                </span>
            </div>
        </div>
    );
}

/* ─── Main RegisterPage ──────────────────────────────────────────────────────── */

export function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation("auth");
    const lang = i18n.resolvedLanguage || 'en';
    const authLogin = useAuthStore(s => s.login);
    const [role, setRole] = useState<Role>("user");
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [loading, setLoading] = useState(false);

    const [userData, setUserData] = useState<UserFormData>(DEFAULT_USER);
    const [partnerData, setPartnerData] = useState<PartnerFormData>(DEFAULT_PARTNER);

    const steps = Array.from({ length: STEP_COUNT }, (_, i) =>
        t(`register.${role === "user" ? "userSteps" : "partnerSteps"}.${i}`)
    );
    const isLastStep = step === steps.length - 1;

    const updateUser = (patch: Partial<UserFormData>) => setUserData(prev => ({ ...prev, ...patch }));
    const updatePartner = (patch: Partial<PartnerFormData>) => setPartnerData(prev => ({ ...prev, ...patch }));

    const canProceed = () => {
        if (step === 0) {
            const d = role === "user" ? userData : partnerData;
            return d.name && d.email && d.password.length >= 8 && d.consent;
        }
        return true;
    };

    const handleNext = () => {
        if (isLastStep) {
            setLoading(true);
            const name = role === "user" ? userData.name : partnerData.name;
            authLogin(role, name);
            const queryParams = new URLSearchParams(location.search);
            const redirectTarget = queryParams.get("redirect");

            setTimeout(() => {
                if (redirectTarget) {
                    navigate(redirectTarget);
                } else {
                    const target = role === 'partner' ? `/${lang}/partner-dashboard` : `/${lang}/dashboard`;
                    navigate(target);
                }
            }, 1000);
        } else {
            setDirection(1);
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        if (step === 0) return;
        setDirection(-1);
        setStep(s => s - 1);
    };

    const handleRoleSwitch = (newRole: Role) => {
        if (newRole === role) return;
        // Matchmaking v2 (spec §10 / D7): providers are recruited offline and
        // onboard via the token-gated intake link — no self-registration here.
        if (newRole === "partner") {
            navigate(`/${i18n.resolvedLanguage || "en"}/provider-intake`);
            return;
        }
        setRole(newRole);
        setStep(0);
        setDirection(1);
    };

    const renderStep = () => {
        if (role === "user") {
            switch (step) {
                case 0: return <UserStep1 data={userData} onChange={updateUser} />;
                case 1: return <UserStep2 data={userData} onChange={updateUser} />;
                case 2: return <UserStep3 data={userData} onChange={updateUser} />;
            }
        } else {
            switch (step) {
                case 0: return <PartnerStep1 data={partnerData} onChange={updatePartner} />;
                case 1: return <PartnerStep2 data={partnerData} onChange={updatePartner} />;
                case 2: return <PartnerStep3 data={partnerData} onChange={updatePartner} />;
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col desktop-s:flex-row">
            {/* Left: Benefits Panel */}
            <div className="desktop-s:w-1/2 desktop-s:max-w-[600px]">
                <BenefitsPanel role={role} />
            </div>

            {/* Right: Wizard Form */}
            <div className="flex-1 bg-neutral-50 flex flex-col">
                {/* Mobile Header */}
                <header className="desktop-s:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-6 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <button onClick={() => navigate("/")} className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary-600 text-2xl">verified_user</span>
                            <Typography variant="h3" className="tracking-tight">CompliHub360</Typography>
                        </button>
                        <Link to="/login" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
                            {t("register.login")}
                        </Link>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center px-6 py-10">
                    <div className="w-full max-w-lg">
                        {/* Role Toggle */}
                        <div className="flex items-center bg-neutral-100 rounded-xl p-1 mb-8">
                            {(["user", "partner"] as Role[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => handleRoleSwitch(r)}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all ${
                                        role === r
                                            ? "bg-white text-neutral-900 shadow-sm"
                                            : "text-neutral-500 hover:text-neutral-700"
                                    }`}
                                >
                                    {r === "user" ? t("register.roleUser") : t("register.rolePartner")}
                                </button>
                            ))}
                        </div>

                        {/* Wizard Card */}
                        <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                            <div className="px-8 pt-6">
                                <StepProgress current={step + 1} total={steps.length} label={steps[step]} />
                            </div>

                            {/* Animated Step Content */}
                            <div className="relative overflow-hidden">
                                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                                    <motion.div
                                        key={`${role}-${step}`}
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                        className="px-8 py-6"
                                    >
                                        {renderStep()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Footer Navigation */}
                            <div className="px-8 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                                        step === 0
                                            ? "text-neutral-300 cursor-not-allowed"
                                            : "text-neutral-500 hover:text-neutral-900"
                                    }`}
                                    disabled={step === 0}
                                >
                                    <span className="material-symbols-outlined text-base">arrow_back</span>
                                    {t("register.back")}
                                </button>

                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={handleNext}
                                    disabled={!canProceed() || loading}
                                    className="rounded-xl gap-2"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {t("register.creating")}
                                        </span>
                                    ) : isLastStep ? (
                                        <>
                                            {t("register.createAccount")}
                                            <span className="material-symbols-outlined text-base">check</span>
                                        </>
                                    ) : (
                                        <>
                                            {t("register.next")}
                                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Login Link */}
                        <p className="text-center text-sm text-neutral-500 mt-6">
                            {t("register.alreadyRegistered")}{" "}
                            <Link to="/login" className="text-primary-500 hover:text-primary-600 hover:underline font-semibold transition-colors">
                                {t("register.login")}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
