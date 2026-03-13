import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { Typography } from "../../../components/ui/Typography";

const PRODUCT_CATEGORIES = [
    { value: "electronics", label: "Electronics / Electrical Equipment", icon: "devices" },
    { value: "batteries", label: "Batteries / Accumulators", icon: "battery_charging_full" },
    { value: "textiles", label: "Textiles / Clothing", icon: "checkroom" },
    { value: "packaging_only", label: "Packaging only (own label)", icon: "inventory_2" },
    { value: "food_supplements", label: "Food / Dietary Supplements", icon: "set_meal" },
    { value: "cosmetics", label: "Cosmetics / Beauty", icon: "spa" },
    { value: "furniture", label: "Furniture / Household Products", icon: "chair" },
    { value: "toys", label: "Toys & Children's Products", icon: "toys" },
];

const ROLES = [
    { value: "manufacturer", label: "Manufacturer", description: "You produce or source from outside the EU and sell under your brand name.", icon: "factory" },
    { value: "reseller_eu", label: "EU Retailer / Reseller", description: "You purchase within the EU and resell (EPR responsibility stays with manufacturer).", icon: "storefront" },
    { value: "importer", label: "Importer (non-EU → EU)", description: "You import from China, USA, etc. and are therefore the first party for EPR.", icon: "flight_land" },
    { value: "dropshipper", label: "Dropshipper", description: "You sell without owning or storing the product yourself.", icon: "local_shipping" },
];

const EPR_STATUS = [
    { value: "registered_de", label: "Registered (e.g. LUCID / stif.de)", description: "You have an EPR registration for electronics, packaging, or batteries.", icon: "task_alt" },
    { value: "partly", label: "Partially registered", description: "Registered for some categories but not all.", icon: "pending" },
    { value: "not_registered", label: "Not registered", description: "No EPR registration in place yet.", icon: "cancel" },
    { value: "not_sure", label: "Not sure", description: "I'm not certain whether a registration obligation applies.", icon: "help" },
];

export function EprWizard() {
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [sellsPhysical, setSellsPhysical] = useState<"yes" | "no" | "">("");
    const [productCategories, setProductCategories] = useState<string[]>([]);
    const [role, setRole] = useState("");
    const [eprStatus, setEprStatus] = useState("");

    const highRiskCategories = ["electronics", "batteries", "textiles"];
    const hasHighRisk = productCategories.some(c => highRiskCategories.includes(c));
    const isImporter = role === "importer" || role === "manufacturer";
    const noEprRisk = eprStatus === "not_registered" && productCategories.length > 0;

    const steps = [
        {
            label: "Physical Products?",
            isValid: !!sellsPhysical,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Do you sell physical products?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            EPR (Extended Producer Responsibility) only applies to businesses that place physical goods or packaging on the market.
                        </Typography>
                    </div>
                    <YesNoToggle value={sellsPhysical} onChange={setSellsPhysical} />
                    {sellsPhysical === "no" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                            <span>EPR obligations generally don't apply to purely digital products and services. You can still continue the wizard to be certain.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Product Categories",
            isValid: productCategories.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Which product categories are you active in?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            EPR requirements differ significantly by category. Electronics and batteries are subject to WEEE/ElektroG, textiles to supply chain due diligence laws.
                        </Typography>
                    </div>
                    <MultiSelectChips
                        options={PRODUCT_CATEGORIES}
                        value={productCategories}
                        onChange={v => {
                            setProductCategories(v);
                            dispatch({ type: "SET_RISK_SIGNALS", payload: v });
                        }}
                    />
                    {productCategories.includes("electronics") && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">bolt</span>
                            <span>Electrical equipment — WEEE / ElektroG: mandatory registration in the LUCID directory and at stif.de. Take-back obligations for old devices apply.</span>
                        </div>
                    )}
                    {productCategories.includes("textiles") && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">checkroom</span>
                            <span>For textiles, the German Supply Chain Due Diligence Act (LkSG) applies above certain thresholds. France already has an extended textile EPR scheme.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Your Role",
            isValid: !!role,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">What is your role in the supply chain?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            EPR obligations depend heavily on your role. Importers and manufacturers bear the primary responsibility.
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={ROLES}
                        value={role}
                        onChange={setRole}
                    />
                    {isImporter && hasHighRisk && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
                            <span><strong>High risk:</strong> As an importer of electronics / batteries, you are fully responsible for take-back, disposal, and registration. Marketplace suspension is possible without proof of compliance.</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "EPR Status",
            isValid: !!eprStatus,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">Are you already EPR-registered?</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            In Germany, manufacturers / importers are required to register in the LUCID portal (packaging) and the electronics register (stif.de).
                        </Typography>
                    </div>
                    <SingleSelectCardGroup
                        options={EPR_STATUS}
                        value={eprStatus}
                        onChange={setEprStatus}
                    />
                    {noEprRisk && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">warning</span>
                            <span><strong>Urgent action required:</strong> Missing registration can lead to warnings, marketplace suspensions (Amazon, Zalando) and fines up to €100,000. Let's resolve this quickly.</span>
                        </div>
                    )}
                    {eprStatus === "registered_de" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                            <span>Great! We'll still verify that your registrations are complete for all categories and target markets.</span>
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
            categoryRoute="/wizard/epr"
            onNext={() => setStep(s => s + 1)}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
