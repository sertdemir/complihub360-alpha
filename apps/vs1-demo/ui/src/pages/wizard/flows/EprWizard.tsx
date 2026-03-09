import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";

const PRODUCT_CATEGORIES = [
    { value: "electronics", label: "Elektrogeräte / Elektronik", icon: "devices" },
    { value: "batteries", label: "Batterien / Akkus", icon: "battery_charging_full" },
    { value: "textiles", label: "Textilien / Kleidung", icon: "checkroom" },
    { value: "packaging_only", label: "Nur Verpackung (eigenes Label)", icon: "inventory_2" },
    { value: "food_supplements", label: "Lebensmittel / Nahrungsergänzung", icon: "set_meal" },
    { value: "cosmetics", label: "Kosmetik / Beauty", icon: "spa" },
    { value: "furniture", label: "Möbel / Haushaltsprodukte", icon: "chair" },
    { value: "toys", label: "Spielzeug & Kinderprodukte", icon: "toys" },
];

const ROLES = [
    { value: "manufacturer", label: "Hersteller", description: "Du produzierst oder beziehst von Außerhalb der EU und verkaufst unter deinem Namen.", icon: "factory" },
    { value: "reseller_eu", label: "EU-Händler / Wiederverkäufer", description: "Du kaufst in der EU ein und verkaufst weiter (EPR-Pflicht vom Hersteller übernommen).", icon: "storefront" },
    { value: "importer", label: "Importeur (Non-EU → EU)", description: "Du importierst aus China, USA, etc. und bist damit 1st party für EPR.", icon: "flight_land" },
    { value: "dropshipper", label: "Dropshipper", description: "Du verkaufst, ohne das Produkt zu besitzen oder zu lagern.", icon: "local_shipping" },
];

const EPR_STATUS = [
    { value: "registered_de", label: "Registriert (z.B. LUCID / stif.de)", description: "Du hast eine Elektro-, Verpackungs- oder Batterie-EPR-Registrierung.", icon: "task_alt" },
    { value: "partly", label: "Teilweise registriert", description: "Für einige Kategorien vorhanden, für andere nicht.", icon: "pending" },
    { value: "not_registered", label: "Nicht registriert", description: "Noch keine EPR-Registrierung vorhanden.", icon: "cancel" },
    { value: "not_sure", label: "Nicht sicher", description: "Ich weiß nicht, ob eine Pflicht besteht.", icon: "help" },
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
            label: "Physische Produkte?",
            isValid: !!sellsPhysical,
            content: (
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Verkaufst du physische Produkte?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            EPR (Extended Producer Responsibility) betrifft nur Unternehmen, die physische Waren oder Verpackungen in Verkehr bringen.
                        </p>
                    </div>
                    <YesNoToggle value={sellsPhysical} onChange={setSellsPhysical} />
                    {sellsPhysical === "no" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">check_circle</span>
                            EPR-Pflichten gelten in der Regel nicht für rein digitale Produkte und Dienstleistungen. Du kannst den Wizard trotzdem fortführen, um sicher zu gehen.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Produktkategorien",
            isValid: productCategories.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">In welchen Produktkategorien bist du aktiv?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Die EPR-Anforderungen sind je nach Kategorie sehr unterschiedlich. Elektronik und Batterien unterliegen dem ElektroG, Textilien dem Lieferkettensorgfaltspflichtengesetz (LkSG).
                        </p>
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
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">bolt</span>
                            Elektrogeräte — WEEE / ElektroG: Pflicht zur Registrierung im LUCID-Verzeichnis und bei der stif.de. Rücknehmpflicht für Altgeräte.
                        </div>
                    )}
                    {productCategories.includes("textiles") && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">checkroom</span>
                            Für Textilien gilt ab bestimmten Schwellenwerten das LkSG (Lieferkettensorgfalt). Frankreich hat bereits eine erweiterte textile EPR.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Deine Rolle",
            isValid: !!role,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Welche Rolle spielst du in der Lieferkette?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            EPR-Pflichten hängen stark von deiner Rolle ab. Importeure und Hersteller tragen die Hauptverantwortung.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={ROLES}
                        value={role}
                        onChange={setRole}
                    />
                    {isImporter && hasHighRisk && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
                            <strong>Hohes Risiko:</strong> Als Importeur von Elektronik / Batterien bist du vollverantwortlich für Rücknahme, Entsorgung und Registrierung. Marktplatzsperrung möglich ohne Nachweise.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "EPR-Status",
            isValid: !!eprStatus,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Bist du bereits EPR-registriert?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            In Deutschland sind Hersteller / Importeure zur Registrierung im LUCID-Portal (Verpackungen) und beim Elektro-Register (stif.de) verpflichtet.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={EPR_STATUS}
                        value={eprStatus}
                        onChange={setEprStatus}
                    />
                    {noEprRisk && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">warning</span>
                            <strong>Dringende Maßnahme erforderlich:</strong> Fehlende Registrierung kann zu Abmahnungen, Marktplatzsperren (Amazon, Zalando) und Bußgeldern bis 100.000 € führen. Lass uns das schnell klären.
                        </div>
                    )}
                    {eprStatus === "registered_de" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">check_circle</span>
                            Gut! Wir prüfen trotzdem, ob deine Registrierungen für alle Kategorien und Zielmärkte vollständig sind.
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
