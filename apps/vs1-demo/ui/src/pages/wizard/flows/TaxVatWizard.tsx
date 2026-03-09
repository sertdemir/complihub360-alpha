import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { CountryMultiSelect } from "../../../components/wizard/questions/CountryMultiSelect";
import { RangeSelector } from "../../../components/wizard/questions/RangeSelector";

// ── Local state shape ─────────────────────────────────────────────────────────
interface TaxVatState {
    sellingModel: string;
    additionalMarkets: string[];
    revenueThreshold: string;
    goodsType: string;
}

const SELLING_MODELS = [
    { value: "marketplace", label: "Marketplace (Amazon, eBay, Etsy…)", description: "Du verkaufst ausschließlich über externe Plattformen.", icon: "shopping_bag" },
    { value: "own_shop", label: "Eigener Onlineshop", description: "Du betreibst deinen eigenen Webshop (Shopify, WooCommerce o.ä.).", icon: "storefront" },
    { value: "both", label: "Beides", description: "Du nutzt eigene und externe Kanäle parallel.", icon: "sync_alt" },
    { value: "b2b_wholesale", label: "B2B / Großhandel", description: "Du lieferst an Unternehmen oder Händler.", icon: "business" },
];

const GOODS_TYPES = [
    { value: "physical_goods", label: "Physische Waren", description: "Produkte mit Lagerung und Versand.", icon: "inventory_2" },
    { value: "digital_services", label: "Digitale Produkte / Dienstleistungen", description: "Software, Kurse, Downloads, SaaS.", icon: "cloud_download" },
    { value: "both", label: "Gemischt (physisch + digital)", description: "Du hast beides im Sortiment.", icon: "layers" },
];

const REVENUE_THRESHOLDS = [
    { value: "below_10k", label: "< 10.000 €", sublabel: "pro Jahr" },
    { value: "10k_85k", label: "10 – 85.000 €", sublabel: "nahe Schwellenwert" },
    { value: "85k_1m", label: "85.000 – 1 Mio. €", sublabel: "über Pflichtgrenze" },
    { value: "above_1m", label: "> 1 Mio. €", sublabel: "internationales Volumen" },
];

const VAT_RISK_SIGNALS = [
    { value: "warehouse_eu", label: "Lager in einem EU-Land", icon: "warehouse" },
    { value: "dropshipping", label: "Dropshipping aus Nicht-EU", icon: "local_shipping" },
    { value: "fulfillment_by_amazon", label: "FBA (Fulfillment by Amazon)", icon: "shopping_bag" },
    { value: "oss_registered", label: "OSS bereits registriert", icon: "receipt_long" },
    { value: "no_vat_number", label: "Noch keine USt-IdNr.", icon: "warning" },
    { value: "tax_audit", label: "Steuerprüfung erhalten / erwartet", icon: "gavel" },
];

export function TaxVatWizard() {
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [local, setLocal] = useState<TaxVatState>({
        sellingModel: "",
        additionalMarkets: [],
        revenueThreshold: "",
        goodsType: "",
    });

    // Keep riskSignals and category in context for review
    const updateRisk = (v: string[]) => dispatch({ type: "SET_RISK_SIGNALS", payload: v });

    const steps = [
        {
            label: "Vertriebsmodell",
            isValid: !!local.sellingModel,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie verkaufst du deine Produkte?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Dein Vertriebskanal bestimmt, welche USt-Registrierungspflichten entstehen.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={SELLING_MODELS}
                        value={local.sellingModel}
                        onChange={v => setLocal(s => ({ ...s, sellingModel: v }))}
                    />
                    {local.sellingModel === "marketplace" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                            Marktplätze wie Amazon DE melden Umsätze automatisch an die Finanzbehörden. Eine eigene USt-IdNr. ist trotzdem notwendig.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Zielmärkte",
            isValid: true,
            isOptional: true,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">In welche Länder verkaufst du?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Ab einem bestimmten Umsatz pro Land entstehen lokale USt-Registrierungspflichten (EU-OSS-Schwelle: 10.000 € / Jahr).
                        </p>
                    </div>
                    <CountryMultiSelect
                        primaryCountry={profile.country}
                        value={local.additionalMarkets}
                        onChange={v => {
                            setLocal(s => ({ ...s, additionalMarkets: v }));
                            dispatch({ type: "SET_MARKETS", payload: [profile.country, ...v] });
                        }}
                    />
                    {local.additionalMarkets.length >= 3 && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">tips_and_updates</span>
                            Bei 3+ EU-Ländern empfehlen wir die OSS-Registrierung beim Bundeszentralamt für Steuern — das erspart separate Registrierungen.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Jahresumsatz",
            isValid: !!local.revenueThreshold,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie hoch ist dein grenzüberschreitender Jahresumsatz?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Die EU-OSS-Grenze liegt bei 10.000 € / Jahr. Darüber besteht Registrierungspflicht im Bestimmungsland.
                        </p>
                    </div>
                    <RangeSelector
                        bands={REVENUE_THRESHOLDS}
                        value={local.revenueThreshold}
                        onChange={v => {
                            setLocal(s => ({ ...s, revenueThreshold: v }));
                            dispatch({ type: "SET_REVENUE_BAND", payload: v as any });
                        }}
                    />
                    {local.revenueThreshold === "10k_85k" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            Du näherst dich der USt-Pflichtgrenze. Wir empfehlen eine Erstberatung, bevor du sie überschreitest.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Warenart",
            isValid: !!local.goodsType,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Was verkaufst du?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Digitale Dienstleistungen werden am Ort des Kunden besteuert. Für physische Waren gelten das Versand- und Bestimmungsland.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={GOODS_TYPES}
                        value={local.goodsType}
                        onChange={v => setLocal(s => ({ ...s, goodsType: v }))}
                    />
                    <div className="mt-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Besondere Situationen (optional)</p>
                        <MultiSelectChips
                            options={VAT_RISK_SIGNALS}
                            value={profile.riskSignals}
                            onChange={updateRisk}
                        />
                    </div>
                </div>
            ),
        },
    ];

    return (
        <WizardFlowShell
            steps={steps}
            currentStep={step}
            categoryRoute="/wizard/tax-vat"
            onNext={() => {
                if (step === 0) dispatch({ type: "SET_BUSINESS_TYPE", payload: local.sellingModel === "b2b_wholesale" ? "other" : "marketplace" });
                setStep(s => s + 1);
            }}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
