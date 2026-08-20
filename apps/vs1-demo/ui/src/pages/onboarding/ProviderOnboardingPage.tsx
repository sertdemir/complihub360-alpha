import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Lock,
    FileText,
    ShieldCheck,
    Loader2,
    UploadCloud,
    CreditCard,
    CalendarDays,
    Eye,
    EyeOff,
    AlertTriangle,
    Sparkles,
    TrendingUp,
    Lightbulb,
} from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuthStore } from "../../store/useAuthStore";

// ─── Provider Onboarding · Figma 1868:2 / 1840:3678 / 1870:2 / 1874:2 / 1875:2 / 1876:2 ──
// Dark full-screen 6-step wizard a partner walks after accepting an invite:
//   Account → Firm → Coverage → Verify → Tooling → Review & Activate
// Shell = topbar + step rail + two-col body (narrative left / form right) + footer
// bar. Same dark surface as the auth screens; petrol for selection/primary, gold
// for the one highlighted word per headline.

const STEPS = ["Account", "Firm", "Coverage", "Verify", "Tooling", "Review"] as const;
const TOTAL = STEPS.length;

// ── shared field primitives ──────────────────────────────────────────────────
function FieldLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b8079]">{children}</span>
            {right}
        </div>
    );
}

function TextField({
    value,
    onChange,
    placeholder,
    suffix,
    type = "text",
    error,
    readOnly = false,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    suffix?: React.ReactNode;
    type?: string;
    error?: string;
    readOnly?: boolean;
}) {
    const border = error
        ? "border-rose-500/70 focus:border-rose-400"
        : readOnly
          ? "border-[#0e3e34]"
          : "border-[#0e3e34] focus:border-[#2a7d6d]";
    return (
        <div>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    aria-invalid={!!error}
                    className={
                        "w-full rounded-xl border bg-[rgba(0,10,8,0.7)] px-4 py-3.5 pr-20 text-[15px] outline-none transition-colors placeholder:text-[#5e7167] " +
                        border +
                        (readOnly ? " cursor-default text-white/70" : " text-white")
                    }
                />
                {suffix ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div> : null}
            </div>
            {error ? <p className="mt-1.5 text-[12px] font-medium text-rose-400">{error}</p> : null}
        </div>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors " +
                (active
                    ? "border-[#1b5d56] bg-[#14363a] text-emerald-200"
                    : "border-[#0e3e34] bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white")
            }
        >
            {active ? <Check size={13} className="text-emerald-400" /> : null}
            {children}
        </button>
    );
}

function CountBadge({ n }: { n: number }) {
    return (
        <span className="ml-2 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
            {n} selected
        </span>
    );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
    return (
        <p className="mb-3 flex items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b8079]">
            {children}
            {count !== undefined ? <CountBadge n={count} /> : null}
        </p>
    );
}

// Domain / firm-type select card (petrol border + check when selected)
function SelectCard({
    active,
    onClick,
    badge,
    title,
    sub,
    multi = false,
}: {
    active: boolean;
    onClick: () => void;
    badge?: string;
    title: string;
    sub?: string;
    multi?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors " +
                (active ? "border-[#1b5d56] bg-[#14363a]" : "border-[#0e3e34] bg-[rgba(0,10,8,0.7)] hover:border-white/25")
            }
        >
            {badge ? (
                <span
                    className={
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-bold " +
                        (active ? "bg-[#1b5d56]/50 text-[#7fd1bf]" : "bg-white/5 text-[#6b8079]")
                    }
                >
                    {badge}
                </span>
            ) : null}
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-white">{title}</span>
                {sub ? <span className={"block text-[12px] " + (active ? "text-emerald-300/80" : "text-[#6b8079]")}>{sub}</span> : null}
            </span>
            <span
                className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border " +
                    (active ? "border-emerald-400 bg-emerald-400 text-primary-950" : "border-white/25") +
                    (multi ? " rounded-md" : "")
                }
            >
                {active ? <Check size={13} /> : null}
            </span>
        </button>
    );
}

// ── topbar / stepper / footer ────────────────────────────────────────────────
function TopBar({ onSignOut }: { onSignOut: () => void }) {
    return (
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f162a] px-6 py-4 lg:px-10">
            <Logo lockup="horizontal" tone="on-petrol" href="/" markClassName="h-8" />
            <div className="flex items-center gap-4 text-[13px] text-white/55">
                <span className="hidden text-[14px] font-semibold uppercase tracking-[0.12em] text-accent-400 sm:inline">
                    Partner Onboarding
                </span>
                <span className="hidden text-white/20 sm:inline">·</span>
                <button onClick={onSignOut} className="font-semibold text-emerald-400 hover:text-emerald-300">
                    Sign out
                </button>
            </div>
        </div>
    );
}

function Stepper({ current }: { current: number }) {
    return (
        <div className="mx-auto flex w-full max-w-[940px] items-start px-4 pt-12 pb-14 lg:pt-14 lg:pb-20">
            {STEPS.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={label} className="flex flex-1 items-start last:flex-none">
                        <div className="flex flex-col items-center">
                            <span
                                className={
                                    "grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] transition-colors " +
                                    (done
                                        ? "border-emerald-500 bg-transparent text-emerald-400"
                                        : active
                                          ? "border-emerald-400 bg-emerald-400 text-primary-950"
                                          : "border-white/20 bg-transparent text-white/30")
                                }
                            >
                                {done ? <Check size={13} /> : active ? <span className="h-2 w-2 rounded-full bg-primary-950" /> : null}
                            </span>
                            <span
                                className={
                                    "mt-2 hidden text-[12px] sm:block " +
                                    (active ? "font-semibold text-white" : done ? "text-emerald-400/80" : "text-white/35")
                                }
                            >
                                {label}
                            </span>
                        </div>
                        {i < TOTAL - 1 ? (
                            <span className={"mt-3 h-0.5 flex-1 " + (done ? "bg-emerald-500/60" : "bg-white/10")} />
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

function FooterBar({
    onBack,
    onNext,
    nextLabel,
    showBack,
}: {
    onBack: () => void;
    onNext: () => void;
    nextLabel: string;
    showBack: boolean;
}) {
    return (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-white/10 bg-[#0f162a]/95 px-6 py-4 backdrop-blur lg:px-10">
            {showBack ? (
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0e3e34] px-4 py-2.5 text-[14px] font-semibold text-white/70 transition-colors hover:bg-white/5"
                >
                    <ArrowLeft size={15} /> Back
                </button>
            ) : (
                <span className="w-[88px]" />
            )}
            <span className="hidden flex-1 items-center justify-center gap-2 text-center text-[13px] text-[#6b8079] md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Progress auto-saves · You can return any time within 14 days
            </span>
            <button
                onClick={onNext}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-fixed px-6 py-3 text-[14px] font-semibold text-fg-on-brand-fixed shadow-[0_14px_30px_-14px_rgba(14,100,80,0.9)] transition-transform duration-200 hover:-translate-y-0.5"
            >
                {nextLabel} <ArrowRight size={16} />
            </button>
        </div>
    );
}

// Left narrative column
function Narrative({
    eyebrow,
    title,
    body,
    children,
}: {
    eyebrow: string;
    title: React.ReactNode;
    body: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="lg:max-w-[420px]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-400">{eyebrow}</span>
            <h1 className="mt-3 font-serif text-[2rem] font-bold leading-[1.12] tracking-tight text-white lg:text-[2.5rem]">{title}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">{body}</p>
            {children}
        </div>
    );
}

const FINE = "text-[12px] leading-relaxed text-white/35";

// ── option data ──────────────────────────────────────────────────────────────
const MARKETS = ["Germany", "Austria", "Netherlands", "France", "Italy", "Spain", "United Kingdom", "Switzerland", "Türkiye", "United States"];
const LANGS = ["Deutsch", "English", "Türkçe", "Français", "Italiano", "Español", "Polski", "Nederlands"];
const DOMAINS = [
    { id: "vat", badge: "VAT", title: "VAT & Indirect Tax", sub: "OSS · KDV · State Sales Tax" },
    { id: "epr", badge: "EPR", title: "Extended Producer Responsibility", sub: "LUCID · Triman · UK PRN" },
    { id: "cst", badge: "CST", title: "Customs & Excise", sub: "EORI · IOSS · Origin" },
    { id: "dat", badge: "DAT", title: "Data Privacy", sub: "GDPR · DPA · UK GDPR" },
    { id: "psf", badge: "PSF", title: "Product Safety", sub: "CE · UKCA · GPSR" },
    { id: "oth", badge: "OTH", title: "Other (specify in Verify)", sub: "Free-text in next step" },
];
const MODELS = ["D2C", "Marketplace", "B2B", "SaaS", "Hybrid"];
const DEPTH = ["Filing", "Advisory", "Audit", "Litigation"];
const FIRM_TYPES = [
    { id: "solo", title: "Solo", sub1: "1 partner", sub2: "Single-licensed practitioner" },
    { id: "boutique", title: "Boutique", sub1: "2 – 10 partners", sub2: "Tight specialist team" },
    { id: "mid", title: "Mid-sized", sub1: "11 – 50 partners", sub2: "Multi-domain firm" },
];
const PW_RULES = [
    { id: "len", label: "12+ characters", test: (p: string) => p.length >= 12 },
    { id: "up", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { id: "low", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { id: "num", label: "Number", test: (p: string) => /\d/.test(p) },
    { id: "sym", label: "Symbol (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type DocState = "idle" | "uploaded" | "verifying";

// ── Onboarding momentum — a rotating perk card in the left column ─────────────
// Keeps the narrative column alive and previews the value waiting after
// activation. Flavours rotate Feature → Fact → Tip across the six steps.
const PERK_FLAVORS = {
    feature: { eyebrow: "What you'll unlock", Icon: Sparkles, tint: "text-accent-400", tag: "Available after activation" },
    fact: { eyebrow: "Did you know", Icon: TrendingUp, tint: "text-emerald-400", tag: "" },
    tip: { eyebrow: "Pro tip", Icon: Lightbulb, tint: "text-emerald-400", tag: "" },
} as const;

const PERKS: { flavor: keyof typeof PERK_FLAVORS; title: string; body: string }[] = [
    { flavor: "feature", title: "Your Verified-Partner badge", body: "Lands on your public profile the moment Trust Ops clears your docs — and ranks you above unverified firms in search." },
    { flavor: "fact", title: "Verified partners get ~3× more profile clicks", body: "A complete firm profile is the strongest matchmaking signal — the more we know, the better the leads we route you." },
    { flavor: "tip", title: "Pick your coverage generously", body: "Partners covering 3+ domains receive roughly 2× more Engagement Requests in their first month. You can refine later." },
    { flavor: "feature", title: "One-click Engagement Requests", body: "Accept or decline leads straight from your inbox — we handle the client intro and book the intro call for you." },
    { flavor: "fact", title: "$0 fixed fees, no subscription", body: "You only pay $2 per profile click and $100 per accepted engagement. Decline freely — declines never cost a cent." },
    { flavor: "tip", title: "Reply within 2 hours", body: "Partners who answer Engagement Requests fast win ~60% more mandates. Turn on email + push alerts in Settings → Notifications." },
];

function PerkCard({ flavor, title, body }: { flavor: keyof typeof PERK_FLAVORS; title: string; body: string }) {
    const f = PERK_FLAVORS[flavor];
    const Icon = f.Icon;
    return (
        <div className="mt-8 rounded-2xl border border-[#0e3e34] bg-[rgba(0,10,8,0.5)] p-5">
            <div className="flex items-center gap-2">
                <Icon size={15} className={f.tint} />
                <span className={"text-[11px] font-semibold uppercase tracking-[0.14em] " + f.tint}>{f.eyebrow}</span>
            </div>
            <p className="mt-2.5 text-[15px] font-semibold text-white">{title}</p>
            <p className="mt-1 max-w-none text-[13px] leading-relaxed text-white/55">{body}</p>
            {f.tag ? (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#6b8079]">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400/70" /> {f.tag}
                </span>
            ) : null}
        </div>
    );
}

export function ProviderOnboardingPage() {
    const navigate = useNavigate();
    const { locale = "en" } = useParams();
    const logout = useAuthStore((s) => s.logout);

    const [step, setStep] = useState(0);
    const [pw, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);

    const [firmName, setFirmName] = useState("Dahlmann CPA Steuerberatungs GmbH");
    const [founded, setFounded] = useState("2014");
    const [firmType, setFirmType] = useState("boutique");
    const [license, setLicense] = useState("");
    const [vatId, setVatId] = useState("");
    const [langs, setLangs] = useState<string[]>(["Deutsch", "English"]);

    const [markets, setMarkets] = useState<string[]>(["Germany", "Austria"]);
    const [domains, setDomains] = useState<string[]>(["vat", "epr", "dat"]);
    const [models, setModels] = useState<string[]>(["D2C", "Marketplace"]);
    const [depth, setDepth] = useState<string[]>(["Filing", "Advisory", "Audit"]);

    const [docs, setDocs] = useState<Record<string, DocState>>({
        license: "uploaded",
        id: "verifying",
        address: "idle",
        indemnity: "idle",
    });
    const [notes, setNotes] = useState("");
    const [calConnected, setCalConnected] = useState(false);

    // Validation — Figma ships no error frames for onboarding, so we add a
    // sensible blocking layer. Errors surface only after a failed Next attempt
    // (`attempted`), then clear live as the user fixes each field.
    const [attempted, setAttempted] = useState(false);

    const pwValid = PW_RULES.every((r) => r.test(pw));
    const pwMatch = confirm.length > 0 && confirm === pw;

    const errs: Record<string, string> = {};
    if (step === 0) {
        if (!pwValid) errs.pw = "Password doesn't meet all requirements yet";
        if (!pwMatch) errs.confirm = confirm.length === 0 ? "Re-enter your password to confirm" : "Passwords don't match";
    }
    if (step === 1) {
        if (!firmName.trim()) errs.firmName = "Firm legal name is required";
        if (!/^\d{4}$/.test(founded.trim())) errs.founded = "Enter a 4-digit year";
        if (langs.length === 0) errs.langs = "Pick at least one language";
    }
    if (step === 2) {
        if (markets.length === 0) errs.markets = "Select at least one market";
        if (domains.length === 0) errs.domains = "Select at least one compliance domain";
    }
    if (step === 3) {
        const missing = (["license", "id", "address"] as const).filter((k) => docs[k] === "idle");
        if (missing.length) errs.docs = "Upload all required documents to continue";
    }
    const stepValid = Object.keys(errs).length === 0;

    const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, v: string) =>
        setter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));

    const goNext = () => {
        if (!stepValid) {
            setAttempted(true);
            return;
        }
        setAttempted(false);
        if (step < TOTAL - 1) setStep((s) => s + 1);
        else navigate(`/${locale}/partner-dashboard`);
    };
    const goBack = () => {
        setAttempted(false);
        setStep((s) => Math.max(0, s - 1));
    };
    // surface an error only once a Next attempt failed for this step
    const err = (k: string) => (attempted ? errs[k] : undefined);

    const nextLabel = step === 0 ? "Create account" : step === TOTAL - 1 ? "Submit for activation" : "Continue";

    return (
        <div className="flex min-h-screen flex-col bg-[#1f2937] text-white">
            <TopBar onSignOut={() => { logout(); navigate(`/${locale}/login`); }} />
            <Stepper current={step} />

            <div className="flex-1 px-6 pb-10 lg:px-10">
                <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="contents"
                        >
                            {/* LEFT — narrative (per step) */}
                            <div>
                                {step === 0 && (
                                    <Narrative
                                        eyebrow="Step 1 of 6 · Account"
                                        title={<>Welcome, <span className="text-accent-400">Partner</span>.</>}
                                        body="Your invite is verified. Set your access password — your firm details come next."
                                    />
                                )}
                                {step === 1 && (
                                    <Narrative
                                        eyebrow="Step 2 of 6 · Firm profile"
                                        title={<><span className="text-accent-400">Tell</span> us about your firm.</>}
                                        body="Used to issue compliant invoices, route the right leads, and prepare your Verified-Partner badge. Your license # stays private — only verified-status is shown."
                                    />
                                )}
                                {step === 2 && (
                                    <Narrative
                                        eyebrow="Step 3 of 6 · Coverage"
                                        title={<>What do you <span className="text-accent-400">cover</span>?</>}
                                        body="We route leads only where you can actually deliver. Pick generously — you can refine after the first matches."
                                    />
                                )}
                                {step === 3 && (
                                    <Narrative
                                        eyebrow="Step 4 of 6 · Verification"
                                        title={<><span className="text-accent-400">Prove</span> you're who you say.</>}
                                        body="Upload practice license, government-issued ID, and proof of firm address. We cross-check manually — typical turnaround 1-2 business days. You can keep going to Tooling while we verify."
                                    >
                                        <p className="mt-7 flex items-start gap-2 text-[14px] text-white/55">
                                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                            Typical review: 1-2 business days · You get an email when verified
                                        </p>
                                        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">Document handling</p>
                                        <p className={"mt-1.5 " + FINE}>
                                            Encrypted at rest (AES-256) · Stored in EU-based vault · Auto-deleted 90 days after verification · Never shared with third parties.
                                        </p>
                                    </Narrative>
                                )}
                                {step === 4 && (
                                    <Narrative
                                        eyebrow="Step 5 of 6 · Tooling"
                                        title={<><span className="text-accent-400">Wire up</span> billing + calendar.</>}
                                        body="Stripe for invoicing, Cal.com for booking. Both self-hosted on our infrastructure — no third-party data leaves CompliHub. Takes about 5 minutes."
                                    >
                                        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">How you're billed</p>
                                            <div className="mt-3 space-y-3 text-[13px]">
                                                {[
                                                    ["$2", "per affiliate click — when a Customer opens your profile from search"],
                                                    ["$100", "per accept — when you accept an Engagement Request"],
                                                    ["$0", "fixed fee, no subscription, no listing cost"],
                                                ].map(([amt, txt]) => (
                                                    <div key={amt} className="flex gap-3">
                                                        <span className="w-10 shrink-0 font-bold text-accent-400">{amt}</span>
                                                        <span className="text-white/70">{txt}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-white/40">
                                                Stripe issues monthly invoices with full VAT · Net 30
                                            </p>
                                        </div>
                                    </Narrative>
                                )}
                                {step === 5 && (
                                    <Narrative
                                        eyebrow="Step 6 of 6 · Review"
                                        title={<>Ready to <span className="text-accent-400">activate</span>.</>}
                                        body="Quick scan, then submit. We'll review your documents and notify you the moment verification passes — typical 1-2 business days."
                                    >
                                        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">What happens after submit</p>
                                            <div className="mt-4 space-y-4">
                                                {[
                                                    ["Documents reviewed", "CompliHub Trust Ops verifies license & ID (1-2 business days)"],
                                                    ["Workspace activated", "We email you the moment you're live — Verified-Partner badge appears in search"],
                                                    ["First leads route", "You start receiving Engagement Requests within 24h of activation"],
                                                ].map(([t, d], i) => (
                                                    <div key={t} className="flex gap-3">
                                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-emerald-400/40 text-[11px] font-bold text-emerald-400">
                                                            {i + 1}
                                                        </span>
                                                        <span>
                                                            <span className="block text-[14px] font-semibold text-white">{t}</span>
                                                            <span className="block text-[12px] text-white/50">{d}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Narrative>
                                )}
                                <PerkCard {...PERKS[step]} />
                            </div>

                            {/* RIGHT — form (per step) */}
                            <div className="min-w-0">
                                {step === 0 && (
                                    <div className="space-y-5">
                                        <div>
                                            <FieldLabel>Email · from invite</FieldLabel>
                                            <TextField
                                                value="g.dahlmann@dahlmann-cpa.de"
                                                onChange={() => {}}
                                                readOnly
                                                suffix={
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-300">
                                                        <Check size={12} /> verified
                                                    </span>
                                                }
                                            />
                                        </div>
                                        <div>
                                            <FieldLabel>Set password</FieldLabel>
                                            <TextField
                                                type={showPw ? "text" : "password"}
                                                value={pw}
                                                onChange={setPw}
                                                placeholder="••••••••••••"
                                                error={err("pw")}
                                                suffix={
                                                    <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)} className="text-white/55 transition-colors hover:text-white">
                                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                }
                                            />
                                            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b8079]">Password must include</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                                                {PW_RULES.map((r) => {
                                                    const ok = r.test(pw);
                                                    return (
                                                        <span key={r.id} className={ok ? "font-medium text-emerald-400" : attempted ? "text-rose-400/80" : "text-white/40"}>
                                                            {r.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <FieldLabel>Confirm password</FieldLabel>
                                            <TextField
                                                type={showPw ? "text" : "password"}
                                                value={confirm}
                                                onChange={setConfirm}
                                                placeholder="••••••••••••"
                                                error={err("confirm")}
                                                suffix={
                                                    <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)} className="text-white/55 transition-colors hover:text-white">
                                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                }
                                            />
                                        </div>
                                        <div className="flex items-start gap-3 pt-2">
                                            <Lock size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                                            <div className="w-full">
                                                <p className="text-[14px] font-semibold text-white">Two-factor available after setup</p>
                                                <p className="mt-1 max-w-none text-[13px] text-white/55">
                                                    Once onboarding completes, enable TOTP-based 2FA from Profile → Security. Strongly recommended.
                                                </p>
                                            </div>
                                        </div>
                                        <p className={"max-w-none pt-2 text-right " + FINE}>argon2id hashing · Encrypted in transit · Account activity audit-logged</p>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div>
                                            <FieldLabel>Firm legal name</FieldLabel>
                                            <TextField value={firmName} onChange={setFirmName} error={err("firmName")} />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <FieldLabel>Country of registration</FieldLabel>
                                                <div className="flex items-center gap-2 rounded-xl border border-[#0e3e34] bg-[rgba(0,10,8,0.7)] px-4 py-3.5 text-[15px] text-white">
                                                    <span>🇩🇪</span> Germany
                                                </div>
                                            </div>
                                            <div>
                                                <FieldLabel>Founded</FieldLabel>
                                                <TextField value={founded} onChange={setFounded} placeholder="YYYY" error={err("founded")} />
                                            </div>
                                        </div>
                                        <div>
                                            <SectionLabel>Firm type</SectionLabel>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                {FIRM_TYPES.map((ft) => (
                                                    <button
                                                        key={ft.id}
                                                        type="button"
                                                        onClick={() => setFirmType(ft.id)}
                                                        className={
                                                            "rounded-xl border px-4 py-3.5 text-left transition-colors " +
                                                            (firmType === ft.id ? "border-[#1b5d56] bg-[#14363a]" : "border-[#0e3e34] bg-[rgba(0,10,8,0.7)] hover:border-white/25")
                                                        }
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[14px] font-semibold text-white">{ft.title}</span>
                                                            <span className={"grid h-4 w-4 place-items-center rounded-full border " + (firmType === ft.id ? "border-emerald-400 bg-emerald-400 text-primary-950" : "border-white/25")}>
                                                                {firmType === ft.id ? <Check size={11} /> : null}
                                                            </span>
                                                        </div>
                                                        <p className={"mt-1 text-[12px] " + (firmType === ft.id ? "text-emerald-300/80" : "text-white/55")}>{ft.sub1}</p>
                                                        <p className="text-[12px] text-white/40">{ft.sub2}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <FieldLabel>License / registration #</FieldLabel>
                                                <TextField value={license} onChange={setLicense} placeholder="StB-Nr. 14/12345 / 67890" suffix={<span className="text-[12px] text-white/40">Where?</span>} />
                                            </div>
                                            <div>
                                                <FieldLabel>VAT ID (for invoicing)</FieldLabel>
                                                <TextField value={vatId} onChange={setVatId} placeholder="DE 123 456 789" suffix={<span className="text-[12px] text-white/40">EU</span>} />
                                            </div>
                                        </div>
                                        <div>
                                            <SectionLabel>Languages spoken</SectionLabel>
                                            <div className="flex flex-wrap gap-2">
                                                {LANGS.map((l) => (
                                                    <Chip key={l} active={langs.includes(l)} onClick={() => toggle(setLangs, l)}>
                                                        {l}
                                                    </Chip>
                                                ))}
                                            </div>
                                            {err("langs") ? <p className="mt-2 text-[12px] font-medium text-rose-400">{err("langs")}</p> : null}
                                        </div>
                                        <p className={FINE}>Stripe Invoicing pulls these details · License # cross-checked against the BStBK Registry</p>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-7">
                                        <div>
                                            <SectionLabel count={markets.length}>Markets you operate in</SectionLabel>
                                            <div className="flex flex-wrap gap-2">
                                                {MARKETS.map((m) => (
                                                    <Chip key={m} active={markets.includes(m)} onClick={() => toggle(setMarkets, m)}>
                                                        {m}
                                                    </Chip>
                                                ))}
                                                <button className="inline-flex items-center gap-1.5 rounded-full border border-[#0e3e34] bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-white/65 hover:border-white/25">
                                                    + Others
                                                </button>
                                            </div>
                                            {err("markets") ? <p className="mt-2 text-[12px] font-medium text-rose-400">{err("markets")}</p> : null}
                                        </div>
                                        <div>
                                            <SectionLabel count={domains.length}>Compliance domains you handle</SectionLabel>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {DOMAINS.map((d) => (
                                                    <SelectCard key={d.id} multi active={domains.includes(d.id)} onClick={() => toggle(setDomains, d.id)} badge={d.badge} title={d.title} sub={d.sub} />
                                                ))}
                                            </div>
                                            {err("domains") ? <p className="mt-2 text-[12px] font-medium text-rose-400">{err("domains")}</p> : null}
                                        </div>
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div>
                                                <SectionLabel count={models.length}>Business models served</SectionLabel>
                                                <div className="flex flex-wrap gap-2">
                                                    {MODELS.map((m) => (
                                                        <Chip key={m} active={models.includes(m)} onClick={() => toggle(setModels, m)}>
                                                            {m}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <SectionLabel count={depth.length}>Service depth</SectionLabel>
                                                <div className="flex flex-wrap gap-2">
                                                    {DEPTH.map((m) => (
                                                        <Chip key={m} active={depth.includes(m)} onClick={() => toggle(setDepth, m)}>
                                                            {m}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className={FINE}>You can extend coverage anytime — but adding markets later requires a 2-business-day re-verification.</p>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-3">
                                        <DocRow
                                            title="Practice License / Registration"
                                            tag="REQUIRED"
                                            sub="StB-Bestellungsurkunde.pdf · 2.1 MB"
                                            state={docs.license}
                                            onClick={() => setDocs((d) => ({ ...d, license: "uploaded" }))}
                                        />
                                        <DocRow
                                            title="Government-issued Photo ID"
                                            tag="REQUIRED"
                                            sub="Passport or national ID, both sides for ID cards"
                                            state={docs.id}
                                            onClick={() => setDocs((d) => ({ ...d, id: d.id === "idle" ? "verifying" : d.id }))}
                                        />
                                        <DocRow
                                            title="Proof of Firm Address"
                                            tag="REQUIRED"
                                            sub="Utility bill or official letter, < 3 months old"
                                            state={docs.address}
                                            onClick={() => setDocs((d) => ({ ...d, address: "uploaded" }))}
                                        />
                                        <DocRow
                                            title="Professional Indemnity Insurance"
                                            tag="OPTIONAL"
                                            sub="Boosts your trust badge in search results"
                                            state={docs.indemnity}
                                            onClick={() => setDocs((d) => ({ ...d, indemnity: "uploaded" }))}
                                        />
                                        {err("docs") ? (
                                            <p className="flex items-center gap-1.5 pt-1 text-[12px] font-medium text-rose-400">
                                                <AlertTriangle size={13} /> {err("docs")}
                                            </p>
                                        ) : null}
                                        <div className="pt-4">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b8079]">Notes on other domains · optional</p>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={3}
                                                placeholder={'e.g. „Crypto-asset MiCA compliance · ISO 27001 audit · WEEE for B2B importers" — anything Compliance-related we don\'t list as standard.'}
                                                className="w-full resize-none rounded-xl border border-[#0e3e34] bg-[rgba(0,10,8,0.7)] px-4 py-3.5 text-[14px] text-white/80 outline-none transition-colors placeholder:text-white/30 focus:border-[#2a7d6d]"
                                            />
                                        </div>
                                        <p className={"pt-1 " + FINE}>Documents reviewed by CompliHub Trust Ops · 4-eye check on practice license</p>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-4">
                                        <ToolingRow
                                            icon={<CreditCard size={18} />}
                                            iconBg="bg-indigo-500/20 text-indigo-300"
                                            title="Stripe Invoicing"
                                            sub="Monthly invoices with full VAT"
                                            connected
                                            body="Connected to your VAT-ID. Invoices generated automatically on the 1st of each month for affiliate clicks and accepted engagements."
                                            meta="Connected · acct_1Mxxxx · Webhook live"
                                            action="Manage"
                                            onAction={() => {}}
                                        />
                                        <ToolingRow
                                            icon={<CalendarDays size={18} />}
                                            iconBg="bg-white/10 text-white/70"
                                            title="Cal.com"
                                            sub="Self-hosted booking at cal.complihub360.com"
                                            connected={calConnected}
                                            body="Clients book intro calls directly into your calendar. We host Cal.com ourselves — no third-party tracking, no data leaves CompliHub infrastructure."
                                            meta="↗ See what data is shared"
                                            action={calConnected ? "Manage" : "Connect Cal.com"}
                                            onAction={() => setCalConnected(true)}
                                        />
                                        <p className="flex items-start gap-2 pt-2 text-[13px] text-white/55">
                                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                                            You can connect later from Settings → Tooling — but Stripe is required before your first invoice cycle. Cal.com can wait until after activation.
                                        </p>
                                        <p className={"pt-1 " + FINE}>OAuth handshakes signed by CompliHub · Scopes restricted to invoicing & calendar-write only</p>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="space-y-4">
                                        <ReviewSection n={1} title="Account" status="Complete" onEdit={() => setStep(0)}>
                                            <KV k="Email" v="g.dahlmann@dahlmann-cpa.de · verified" />
                                            <KV k="Password" v="••••••••••••" />
                                            <KV k="2FA" v="Enable after activation (recommended)" />
                                        </ReviewSection>
                                        <ReviewSection n={2} title="Firm" status="Complete" onEdit={() => setStep(1)}>
                                            <KV k="Legal" v="Dahlmann CPA Steuerberatungs GmbH · DE" />
                                            <KV k="Type" v="Boutique · 2-10 partners · founded 2014" />
                                            <KV k="IDs" v="StB-Nr. 14/12345 · VAT DE 123 456 789" />
                                        </ReviewSection>
                                        <ReviewSection n={3} title="Coverage" status="Complete" onEdit={() => setStep(2)}>
                                            <KV k="Markets" v="DE · AT" />
                                            <KV k="Domains" v="VAT · EPR · Data Privacy" />
                                            <KV k="Models" v="D2C · Marketplace · Filing/Advisory/Audit" />
                                        </ReviewSection>
                                        <ReviewSection n={4} title="Verification" status="Pending verify" pending onEdit={() => setStep(3)}>
                                            <KV k="License" v="StB-Bestellungsurkunde.pdf · uploaded" />
                                            <KV k="Photo ID" v="verifying — 1 of 4 in queue" />
                                            <KV k="Address proof" v="pending upload (required)" />
                                        </ReviewSection>
                                        <ReviewSection n={5} title="Tooling" status="Complete" onEdit={() => setStep(4)}>
                                            <KV k="Stripe" v="acct_1Mxxxx · webhook live" />
                                            <KV k="Cal.com" v="Will connect after activation" />
                                        </ReviewSection>
                                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4">
                                            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                                                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> 4 of 5 sections complete — Verification still pending
                                            </p>
                                            <p className="mt-1 text-[13px] text-white/55">
                                                You can submit now — Verification continues in the background. Workspace activates only after all documents pass.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <FooterBar onBack={goBack} onNext={goNext} nextLabel={nextLabel} showBack={step > 0} />
        </div>
    );
}

// ── verification doc row ──────────────────────────────────────────────────────
function DocRow({ title, tag, sub, state, onClick }: { title: string; tag: string; sub: string; state: DocState; onClick: () => void }) {
    const selected = state === "uploaded";
    const verifying = state === "verifying";
    return (
        <div
            className={
                "flex items-center gap-4 rounded-xl border px-4 py-3.5 " +
                (selected ? "border-accent-400/60 bg-accent-400/[0.04]" : verifying ? "border-amber-400/30 bg-[rgba(0,10,8,0.7)]" : "border-[#0e3e34] bg-[rgba(0,10,8,0.7)]")
            }
        >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <FileText size={18} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-white">
                    {title} <span className={"ml-1 text-[11px] font-semibold uppercase tracking-wide " + (tag === "REQUIRED" ? "text-accent-400/80" : "text-white/35")}>· {tag}</span>
                </p>
                <p className="truncate text-[12px] text-white/50">{sub}</p>
            </div>
            {selected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300">
                    <ShieldCheck size={13} /> Uploaded
                </span>
            ) : verifying ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-[12px] font-semibold text-amber-300">
                    <Loader2 size={13} className="animate-spin" /> Verifying…
                </span>
            ) : (
                <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:bg-white/5">
                    <UploadCloud size={13} /> Drop / click
                </button>
            )}
        </div>
    );
}

// ── tooling integration row ───────────────────────────────────────────────────
function ToolingRow({
    icon,
    iconBg,
    title,
    sub,
    connected,
    body,
    meta,
    action,
    onAction,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    sub: string;
    connected: boolean;
    body: string;
    meta: string;
    action: string;
    onAction: () => void;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-lg " + iconBg}>{icon}</span>
                    <div>
                        <p className="text-[15px] font-semibold text-white">{title}</p>
                        <p className="text-[12px] text-white/50">{sub}</p>
                    </div>
                </div>
                <span
                    className={
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold " +
                        (connected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/50")
                    }
                >
                    {connected ? <Check size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-white/40" />}
                    {connected ? "Connected" : "Not connected"}
                </span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-white/65">{body}</p>
            <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] text-white/40">{meta}</span>
                <button
                    onClick={onAction}
                    className={
                        connected
                            ? "inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/70 hover:text-white"
                            : "inline-flex items-center gap-1.5 rounded-xl bg-brand-fixed px-4 py-2.5 text-[13px] font-semibold text-fg-on-brand-fixed transition-transform hover:-translate-y-0.5"
                    }
                >
                    {action} <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ── review summary section ────────────────────────────────────────────────────
function ReviewSection({
    n,
    title,
    status,
    pending,
    onEdit,
    children,
}: {
    n: number;
    title: string;
    status: string;
    pending?: boolean;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-[11px] text-white/60">{n}</span>
                    {title}
                </p>
                <div className="flex items-center gap-3">
                    <span
                        className={
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold " +
                            (pending ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300")
                        }
                    >
                        {pending ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : <Check size={12} />} {status}
                    </span>
                    <button onClick={onEdit} className="text-[13px] font-semibold text-white/55 hover:text-white">
                        Edit
                    </button>
                </div>
            </div>
            <div className="mt-3 space-y-1.5 pl-[34px]">{children}</div>
        </div>
    );
}

function KV({ k, v }: { k: string; v: string }) {
    return (
        <p className="text-[13px]">
            <span className="inline-block w-28 text-white/40">{k}</span>
            <span className="text-white/70">{v}</span>
        </p>
    );
}
