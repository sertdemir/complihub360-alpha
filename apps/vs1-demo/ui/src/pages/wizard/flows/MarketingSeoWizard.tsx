import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";

const INDUSTRIES = [
    { value: "ecommerce_general", label: "E-Commerce / Onlinehandel", description: "Allgemeiner Produkthandel ohne regulierte Warengruppen.", icon: "shopping_bag" },
    { value: "health_supplements", label: "Gesundheit / Nahrungsergänzung", description: "Health-Claims stark reguliert (Stichwort: HCVO, #30-Liste).", icon: "health_and_safety" },
    { value: "finance_fintech", label: "Finanzprodukte / FinTech", description: "Strenge Werbeverbote für unregulierte Finanzangebote.", icon: "savings" },
    { value: "cosmetics_beauty", label: "Kosmetik / Beauty", description: "Unzulässige Heilversprechen, INCI-Pflichten, Einwirkungsbehauptungen.", icon: "spa" },
    { value: "pets", label: "Tierprodukte / Tiernahrung", description: "Zulassungspflichten und Health-Claim-Einschränkungen.", icon: "pets" },
    { value: "software_saas", label: "Software / SaaS", description: "Preistransparenz, AGB-Pflichten, UWG-konforme Angebote.", icon: "devices" },
];

const CLAIM_TYPES = [
    { value: "health_claims", label: "Gesundheitsbezogene Angaben", icon: "favorite" },
    { value: "eco_claims", label: "Öko- / Nachhaltigkeitsaussagen", icon: "eco" },
    { value: "best_cheapest", label: "Superlative (bestes, günstigstes…)", icon: "star" },
    { value: "testimonials", label: "Kundenbewertungen / Testimonials", icon: "rate_review" },
    { value: "influencer_ads", label: "Influencer-Werbung", icon: "person" },
    { value: "before_after", label: "Vorher-Nachher-Vergleiche", icon: "compare" },
    { value: "guarantee_claims", label: "Garantieversprechen", icon: "verified" },
    { value: "free_trial", label: "Kostenlos-Angebote / Testversionen", icon: "redeem" },
];

const CHANNELS = [
    { value: "google_ads", label: "Google Ads / SEA", icon: "ads_click" },
    { value: "meta_ads", label: "Meta / Instagram / Facebook Ads", icon: "thumb_up" },
    { value: "tiktok_ads", label: "TikTok Ads", icon: "music_video" },
    { value: "seo_organic", label: "SEO / Organischer Content", icon: "search" },
    { value: "email_marketing", label: "E-Mail-Marketing / Newsletter", icon: "mail" },
    { value: "influencer", label: "Influencer / Creator Marketing", icon: "diversity_3" },
    { value: "youtube", label: "YouTube / Video-Content", icon: "play_circle" },
    { value: "affiliate", label: "Affiliate-Marketing", icon: "share" },
];

const COOKIE_STATUS = [
    { value: "compliant_banner", label: "Korrekter Cookie-Banner mit Opt-In", description: "Nutzer müssen aktiv zustimmen bevor Cookies gesetzt werden.", icon: "verified" },
    { value: "opt_out_banner", label: "Opt-Out Banner (veraltet)", description: "Cookies werden vor Einwilligung gesetzt, Opt-Out vorhanden.", icon: "warning" },
    { value: "notice_only", label: "Nur Cookie-Hinweis", description: "Hinweisbanner ohne echte Einwilligungsfunktion.", icon: "info" },
    { value: "no_banner", label: "Kein Cookie-Banner", description: "Keinerlei Einwilligungsmechanismus vorhanden.", icon: "cancel" },
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
            label: "Branche",
            isValid: !!industry,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">In welcher Branche bist du tätig?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Bestimmte Branchen unterliegen verschärften Werbe- und Marketingregeln — besonders im Gesundheits- und Finanzbereich.
                        </p>
                    </div>
                    <SingleSelectCardGroup options={INDUSTRIES} value={industry} onChange={setIndustry} />
                    {industry === "health_supplements" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            Nahrungsergänzung: Nur zugelassene Health Claims aus der HCVO-Liste sind erlaubt. Aussagen wie "stärkt das Immunsystem" sind ohne Zulassung untersagt und werden aktiv abgemahnt.
                        </div>
                    )}
                    {industry === "finance_fintech" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            Finanzwerbung erfordert ggf. BaFin-Erlaubnis. Renditeversprechen ohne Risikohinweis sind unzulässig (§ 64a WpHG, VermAnlG).
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Werbeaussagen",
            isValid: claimTypes.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Welche Art von Aussagen verwendest du in deinem Marketing?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Viele Standardaussagen sind rechtlich riskant oder erfordern spezifische Belege. Wir zeigen dir, wo konkrete Risiken bestehen.
                        </p>
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
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
                            <strong>Kritisch:</strong> Health Claims in deiner Branche sind nur zulässig, wenn sie auf der genehmigten HCVO-Liste stehen. Bei Verstößen drohen Abmahnungen mit Streitwerten ab 20.000 €.
                        </div>
                    )}
                    {hasEcoClaims && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">eco</span>
                            Greenwashing: Die EU-Richtlinie 2024/825 verbietet pauschale Umweltversprechen ohne Nachweis. "Nachhaltig", "klimaneutral", "eco-friendly" müssen belegbar sein.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Marketingkanäle",
            isValid: channels.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Über welche Kanäle bewirbst du deine Produkte?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Jeder Kanal hat eigene Compliance-Anforderungen: Werbekennzeichnung, Datenschutzregeln und branchenspezifische Einschränkungen.
                        </p>
                    </div>
                    <MultiSelectChips options={CHANNELS} value={channels} onChange={setChannels} />
                    {channels.includes("influencer") && (
                        <div className="mt-2">
                            <p className="text-xs text-slate-400 mb-3">Nutzt du Influencer auch für unbezahlt wirkende Empfehlungen (Gratis-Produkte ohne Kennzeichnung)?</p>
                            <YesNoToggle value={usesInfluencer} onChange={setUsesInfluencer} />
                        </div>
                    )}
                    {hasInfluencer && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">campaign</span>
                            Influencer-Posts müssen als Werbung gekennzeichnet sein — auch bei Gratis-Produkten ohne Bezahlung (#werbung, Ad, Anzeige). Fehlende Kennzeichnung: Abmahnrisiko für Influencer UND Marke.
                        </div>
                    )}
                    {channels.includes("email_marketing") && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">mail</span>
                            Double-Opt-In ist in Deutschland Pflicht. Spam-Versand ohne nachweisbare Einwilligung ist bußgeldbewehrt (DSGVO + UWG).
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Cookie-Compliance",
            isValid: !!cookieStatus,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie ist dein Cookie-Consent umgesetzt?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Seit dem BGH-Urteil 2020 (Planet49) und der TTDSG-Einführung 2021 ist in Deutschland echtes Opt-In für nicht-essenzielle Cookies Pflicht.
                        </p>
                    </div>
                    <SingleSelectCardGroup options={COOKIE_STATUS} value={cookieStatus} onChange={setCookieStatus} />
                    {noCookieBanner && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
                            <strong>Sofortiger Handlungsbedarf:</strong> Ohne Cookie-Consent werden Tracking-Cookies illegal gesetzt. Jeder Seitenbesuch eines EU-Nutzers ist eine DSGVO-Verletzung. Abmahnungen und DPA-Beschwerden sind wahrscheinlich.
                        </div>
                    )}
                    {outdatedBanner && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            Opt-Out ist nicht mehr rechtskonform. Seit dem BGH-Urteil 2020 muss Einwilligung aktiv erfolgen (Opt-In). Empfehlung: Upgrade auf Opt-In CMP.
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
