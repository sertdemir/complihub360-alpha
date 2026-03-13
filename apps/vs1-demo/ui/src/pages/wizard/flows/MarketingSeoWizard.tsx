import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { Typography } from "../../../components/ui/Typography";

const INDUSTRIES = [
    { value: "ecommerce_general", label: "E-Commerce / Online Retail", description: "General product trade without regulated goods categories.", icon: "shopping_bag" },
    { value: "health_supplements", label: "Health / Dietary Supplements", description: "Health claims are heavily regulated (EU Health Claims Regulation).", icon: "health_and_safety" },
    { value: "finance_fintech", label: "Financial Products / FinTech", description: "Strict advertising rules for unregulated financial offerings.", icon: "savings" },
    { value: "cosmetics_beauty", label: "Cosmetics / Beauty", description: "Prohibited medical claims, INCI labeling requirements.", icon: "spa" },
    { value: "pets", label: "Pet Products / Pet Food", description: "Approval requirements and health claim restrictions.", icon: "pets" },
    { value: "software_saas", label: "Software / SaaS", description: "Price transparency, terms & conditions obligations, UWG-compliant offers.", icon: "devices" },
];

const CLAIM_TYPES = [
    { value: "health_claims", label: "Health-related claims", icon: "favorite" },
    { value: "eco_claims", label: "Eco / sustainability claims", icon: "eco" },
    { value: "best_cheapest", label: "Superlatives (best, cheapest…)", icon: "star" },
    { value: "testimonials", label: "Customer reviews / testimonials", icon: "rate_review" },
    { value: "influencer_ads", label: "Influencer advertising", icon: "person" },
    { value: "before_after", label: "Before & after comparisons", icon: "compare" },
    { value: "guarantee_claims", label: "Guarantee promises", icon: "verified" },
    { value: "free_trial", label: "Free offers / trial periods", icon: "redeem" },
];

const CHANNELS = [
    { value: "google_ads", label: "Google Ads / SEA", icon: "ads_click" },
    { value: "meta_ads", label: "Meta / Instagram / Facebook Ads", icon: "thumb_up" },
    { value: "tiktok_ads", label: "TikTok Ads", icon: "music_video" },
    { value: "seo_organic", label: "SEO / Organic Content", icon: "search" },
    { value: "email_marketing", label: "Email Marketing / Newsletter", icon: "mail" },
    { value: "influencer", label: "Influencer / Creator Marketing", icon: "diversity_3" },
    { value: "youtube", label: "YouTube / Video Content", icon: "play_circle" },
    { value: "affiliate", label: "Affiliate Marketing", icon: "share" },
];

const COOKIE_STATUS = [
    { value: "compliant_banner", label: "Proper cookie banner with opt-in", description: "Users must actively consent before cookies are set.", icon: "verified" },
    { value: "opt_out_banner", label: "Opt-out banner (outdated)", description: "Cookies are set before consent, opt-out available.", icon: "warning" },
    { value: "notice_only", label: "Notice only", description: "Info banner without a real consent mechanism.", icon: "info" },
    { value: "no_banner", label: "No cookie banner", description: "No consent mechanism of any kind.", icon: "cancel" },
];

export function MarketingSeoWizard() {
    const { dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [industry, setIndustry] = useState("");
    const [claimTypes, setClaimTypes] = useState<string[]>([]);
    const [channels, setChannels] = useState<string[]>([]);
    const [usesInfluencer, setUsesInfluencer] = useState<"yes" | "no" | "">("");
    const [cookieStatus, setCookieStatus] = useState("");

    const hasHealthClaims = claimTypes.includes("health_claims") && ["health_supplements", "cosmetics_beauty", "pets"].includes(industry);
    const hasInfluencer = channels.includes("influencer") || usesInfluencer === "yes";
    const hasEcoClaims = claimTypes.includes("eco_claims");
    const noCookieBanner = cookieStatus === "no_banner";
    const outdatedBanner = cookieStatus === "opt_out_banner";

    const steps = [
        {
            label: "Industry",
            isValid: !!industry,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">What industry are you in?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Certain industries are subject to stricter advertising and marketing regulations — especially health and financial services.
                        </Typography>
                    </div>
                    <SingleSelectCardGroup options={INDUSTRIES} value={industry} onChange={setIndustry} />
                    {industry === "health_supplements" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
                            <span>Dietary supplements: only approved health claims on the EU authorised list (HCVO/Regulation 1924/2006) are permitted. Claims like "boosts immunity" without authorization are banned and actively prosecuted.</span>
                        </div>
                    )}
                    {industry === "finance_fintech" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
                            <span>Financial advertising may require regulatory authorization. Return promises without risk disclosures are prohibited under applicable securities and investment law.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Ad Claims",
            isValid: claimTypes.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">What types of claims do you use in your marketing?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Many standard claims are legally risky or require specific evidence. We'll show you where concrete risks exist.
                        </Typography>
                    </div>
                    <MultiSelectChips
                        options={CLAIM_TYPES}
                        value={claimTypes}
                        onChange={v => {
                            setClaimTypes(v);
                            dispatch({ type: "SET_RISK_SIGNALS", payload: v });
                        }}
                    />
                    {hasHealthClaims && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                            <span><strong>Critical:</strong> Health claims in your industry are only permitted if they appear on the EU approved list. Violations attract warning letters with claim values from €20,000+.</span>
                        </div>
                    )}
                    {hasEcoClaims && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">eco</span>
                            <span>Greenwashing: EU Directive 2024/825 prohibits blanket environmental promises without substantiation. Terms like "sustainable", "carbon neutral", "eco-friendly" must be verifiable.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Marketing Channels",
            isValid: channels.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Which channels do you use to promote your products?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Each channel has its own compliance requirements: ad labeling, privacy rules, and industry-specific restrictions.
                        </Typography>
                    </div>
                    <MultiSelectChips options={CHANNELS} value={channels} onChange={setChannels} />
                    {channels.includes("influencer") && (
                        <div className="flex flex-col gap-4">
                            <Typography variant="body" className="text-neutral-600">
                                Do you use influencers for posts that appear organic (free products without labeling)?
                            </Typography>
                            <YesNoToggle value={usesInfluencer} onChange={setUsesInfluencer} />
                        </div>
                    )}
                    {hasInfluencer && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">campaign</span>
                            <span>Influencer posts must be labeled as advertising — including free product placements without payment (#ad, #sponsored). Missing labels create legal risk for both the influencer and the brand.</span>
                        </div>
                    )}
                    {channels.includes("email_marketing") && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">mail</span>
                            <span>Double opt-in is required in Germany. Sending emails without documented consent is a GDPR and competition law violation.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Cookie Compliance",
            isValid: !!cookieStatus,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">How is your cookie consent implemented?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            Since the BGH Planet49 ruling (2020) and the TTDSG (2021), genuine opt-in consent for non-essential cookies is mandatory in Germany and across the EU.
                        </Typography>
                    </div>
                    <SingleSelectCardGroup options={COOKIE_STATUS} value={cookieStatus} onChange={setCookieStatus} />
                    {noCookieBanner && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                            <span><strong>Immediate action required:</strong> Without cookie consent, tracking cookies are placed illegally. Every EU user visit constitutes a GDPR violation. Warning letters and DPA complaints are likely.</span>
                        </div>
                    )}
                    {outdatedBanner && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">warning</span>
                            <span>Opt-out is no longer legally compliant. Since the BGH ruling in 2020, consent must be active (opt-in). Recommendation: upgrade to an opt-in CMP.</span>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <WizardFlowShell
            steps={steps}
            currentStep={step}
            categoryRoute="/wizard/marketing-seo"
            onNext={() => setStep(s => s + 1)}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
