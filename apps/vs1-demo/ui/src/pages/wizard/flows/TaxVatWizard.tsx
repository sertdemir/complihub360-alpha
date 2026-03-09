import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { CountryMultiSelect } from "../../../components/wizard/questions/CountryMultiSelect";
import { RangeSelector } from "../../../components/wizard/questions/RangeSelector";

interface TaxVatState {
    sellingModel: string;
    additionalMarkets: string[];
    revenueThreshold: string;
    goodsType: string;
}

const SELLING_MODELS = [
    { value: "marketplace", label: "Marketplace (Amazon, eBay, Etsy…)", description: "You sell exclusively through third-party platforms.", icon: "shopping_bag" },
    { value: "own_shop", label: "Own Online Shop", description: "You operate your own webshop (Shopify, WooCommerce, etc.).", icon: "storefront" },
    { value: "both", label: "Both Channels", description: "You use your own shop and external platforms in parallel.", icon: "sync_alt" },
    { value: "b2b_wholesale", label: "B2B / Wholesale", description: "You supply businesses or retailers directly.", icon: "business" },
];

const GOODS_TYPES = [
    { value: "physical_goods", label: "Physical Goods", description: "Products with warehousing and shipping.", icon: "inventory_2" },
    { value: "digital_services", label: "Digital Products / Services", description: "Software, courses, downloads, SaaS.", icon: "cloud_download" },
    { value: "both", label: "Mixed (physical + digital)", description: "You have both in your portfolio.", icon: "layers" },
];

const REVENUE_THRESHOLDS = [
    { value: "below_10k", label: "< €10,000", sublabel: "per year" },
    { value: "10k_85k", label: "€10k – €85,000", sublabel: "approaching threshold" },
    { value: "85k_1m", label: "€85,000 – €1M", sublabel: "above mandatory threshold" },
    { value: "above_1m", label: "> €1M", sublabel: "international volume" },
];

const VAT_RISK_SIGNALS = [
    { value: "warehouse_eu", label: "Warehouse in an EU country", icon: "warehouse" },
    { value: "dropshipping", label: "Dropshipping from non-EU", icon: "local_shipping" },
    { value: "fulfillment_by_amazon", label: "FBA (Fulfillment by Amazon)", icon: "shopping_bag" },
    { value: "oss_registered", label: "Already registered for OSS", icon: "receipt_long" },
    { value: "no_vat_number", label: "No VAT ID yet", icon: "warning" },
    { value: "tax_audit", label: "Tax audit received / expected", icon: "gavel" },
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

    const updateRisk = (v: string[]) => dispatch({ type: "SET_RISK_SIGNALS", payload: v });

    const steps = [
        {
            label: "Sales Model",
            isValid: !!local.sellingModel,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">How do you sell your products?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Your sales channel determines which VAT registration obligations apply.
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
                            Marketplaces like Amazon DE report your sales directly to tax authorities. You still need your own VAT ID.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Target Markets",
            isValid: true,
            isOptional: true,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Which countries do you sell to?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Beyond a certain revenue per country, local VAT registration is required. EU OSS threshold: €10,000 / year.
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
                            With 3+ EU countries, we recommend OSS registration — it replaces individual registrations in each member state.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Annual Revenue",
            isValid: !!local.revenueThreshold,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">What is your cross-border annual revenue?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            The EU OSS threshold is €10,000 / year. Above this, VAT registration is required in the destination country.
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
                            You are approaching the VAT registration threshold. We recommend an initial consultation before crossing it.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Product Type",
            isValid: !!local.goodsType,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">What do you sell?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Digital services are taxed at the customer's location. Physical goods follow shipping and destination country rules.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={GOODS_TYPES}
                        value={local.goodsType}
                        onChange={v => setLocal(s => ({ ...s, goodsType: v }))}
                    />
                    <div className="mt-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Special situations (optional)</p>
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
