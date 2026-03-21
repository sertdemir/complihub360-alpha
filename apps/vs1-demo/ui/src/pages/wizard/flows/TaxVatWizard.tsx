import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { CountryMultiSelect } from "../../../components/wizard/questions/CountryMultiSelect";
import { RangeSelector } from "../../../components/wizard/questions/RangeSelector";
import { Typography } from "../../../components/ui/Typography";

interface TaxVatState {
    sellingModel: string;
    additionalMarkets: string[];
    revenueThreshold: string;
    goodsType: string;
}

const getSellingModels = (t: TFunction) => [
    { value: "marketplace", label: t('wizard.taxVat.models.marketplace.label', "Marketplace (Amazon, eBay, Etsy…)"), description: t('wizard.taxVat.models.marketplace.desc', "You sell exclusively through third-party platforms."), icon: "shopping_bag" },
    { value: "own_shop", label: t('wizard.taxVat.models.ownShop.label', "Own Online Shop"), description: t('wizard.taxVat.models.ownShop.desc', "You operate your own webshop (Shopify, WooCommerce, etc.)."), icon: "storefront" },
    { value: "both", label: t('wizard.taxVat.models.both.label', "Both Channels"), description: t('wizard.taxVat.models.both.desc', "You use your own shop and external platforms in parallel."), icon: "sync_alt" },
    { value: "b2b_wholesale", label: t('wizard.taxVat.models.b2b.label', "B2B / Wholesale"), description: t('wizard.taxVat.models.b2b.desc', "You supply businesses or retailers directly."), icon: "business" },
];

const getGoodsTypes = (t: TFunction) => [
    { value: "physical_goods", label: t('wizard.taxVat.goods.physical.label', "Physical Goods"), description: t('wizard.taxVat.goods.physical.desc', "Products with warehousing and shipping."), icon: "inventory_2" },
    { value: "digital_services", label: t('wizard.taxVat.goods.digital.label', "Digital Products / Services"), description: t('wizard.taxVat.goods.digital.desc', "Software, courses, downloads, SaaS."), icon: "cloud_download" },
    { value: "both", label: t('wizard.taxVat.goods.mixed.label', "Mixed (physical + digital)"), description: t('wizard.taxVat.goods.mixed.desc', "You have both in your portfolio."), icon: "layers" },
];

const getRevenueThresholds = (t: TFunction) => [
    { value: "below_10k", label: t('wizard.taxVat.revenue.below10k.label', "< €10,000"), sublabel: t('wizard.taxVat.revenue.below10k.sub', "per year") },
    { value: "10k_85k", label: t('wizard.taxVat.revenue.mid1.label', "€10k – €85,000"), sublabel: t('wizard.taxVat.revenue.mid1.sub', "approaching threshold") },
    { value: "85k_1m", label: t('wizard.taxVat.revenue.mid2.label', "€85,000 – €1M"), sublabel: t('wizard.taxVat.revenue.mid2.sub', "above mandatory threshold") },
    { value: "above_1m", label: t('wizard.taxVat.revenue.above1m.label', "> €1M"), sublabel: t('wizard.taxVat.revenue.above1m.sub', "international volume") },
];

const getVatRiskSignals = (t: TFunction) => [
    { value: "warehouse_eu", label: t('wizard.taxVat.signals.warehouseEu', "Warehouse in an EU country"), icon: "warehouse" },
    { value: "dropshipping", label: t('wizard.taxVat.signals.dropshipping', "Dropshipping from non-EU"), icon: "local_shipping" },
    { value: "fulfillment_by_amazon", label: t('wizard.taxVat.signals.fba', "FBA (Fulfillment by Amazon)"), icon: "shopping_bag" },
    { value: "oss_registered", label: t('wizard.taxVat.signals.oss', "Already registered for OSS"), icon: "receipt_long" },
    { value: "no_vat_number", label: t('wizard.taxVat.signals.noVat', "No VAT ID yet"), icon: "warning" },
    { value: "tax_audit", label: t('wizard.taxVat.signals.audit', "Tax audit received / expected"), icon: "gavel" },
];

export function TaxVatWizard() {
    const { t } = useTranslation('common');
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [local, setLocal] = useState<TaxVatState>({
        sellingModel: "",
        additionalMarkets: [],
        revenueThreshold: "",
        goodsType: "",
    });

    const updateRisk = (v: string[]) => dispatch({ type: "SET_RISK_SIGNALS", payload: v });

    const SELLING_MODELS = getSellingModels(t);
    const GOODS_TYPES = getGoodsTypes(t);
    const REVENUE_THRESHOLDS = getRevenueThresholds(t);
    const VAT_RISK_SIGNALS = getVatRiskSignals(t);

    const steps = [
        {
            label: t('wizard.taxVat.steps.salesModel.label', "Sales Model"),
            isValid: !!local.sellingModel,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.taxVat.steps.salesModel.title', "How do you sell your products?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.taxVat.steps.salesModel.subtitle', "Your sales channel determines which VAT registration obligations apply.")}
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={SELLING_MODELS}
                        value={local.sellingModel}
                        onChange={v => setLocal(s => ({ ...s, sellingModel: v }))}
                    />
                    {local.sellingModel === "marketplace" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">info</span>
                            <span>{t('wizard.taxVat.steps.salesModel.marketplaceNotice', "Marketplaces like Amazon DE report your sales directly to tax authorities. You still need your own VAT ID.")}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.taxVat.steps.targetMarkets.label', "Target Markets"),
            isValid: true,
            isOptional: true,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.taxVat.steps.targetMarkets.title', "Which countries do you sell to?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.taxVat.steps.targetMarkets.subtitle', "Beyond a certain revenue per country, local VAT registration is required. EU OSS threshold: €10,000 / year.")}
                        </Typography>
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
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">tips_and_updates</span>
                            <span>{t('wizard.taxVat.steps.targetMarkets.ossNotice', "With 3+ EU countries, we recommend OSS registration — it replaces individual registrations in each member state.")}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.taxVat.steps.revenue.label', "Annual Revenue"),
            isValid: !!local.revenueThreshold,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.taxVat.steps.revenue.title', "What is your cross-border annual revenue?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.taxVat.steps.revenue.subtitle', "The EU OSS threshold is €10,000 / year. Above this, VAT registration is required in the destination country.")}
                        </Typography>
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
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">warning</span>
                            <span>{t('wizard.taxVat.steps.revenue.thresholdNotice', "You are approaching the VAT registration threshold. We recommend an initial consultation before crossing it.")}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.taxVat.steps.productType.label', "Product Type"),
            isValid: !!local.goodsType,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.taxVat.steps.productType.title', "What do you sell?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.taxVat.steps.productType.subtitle', "Digital services are taxed at the customer's location. Physical goods follow shipping and destination country rules.")}
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={GOODS_TYPES}
                        value={local.goodsType}
                        onChange={v => setLocal(s => ({ ...s, goodsType: v }))}
                    />
                    <div className="border-t border-neutral-100 pt-6">
                        <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                            {t('wizard.taxVat.steps.productType.special', "SPECIAL SITUATIONS (OPTIONAL)")}
                        </Typography>
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
