import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { RangeSelector } from "../../../components/wizard/questions/RangeSelector";

const TEAM_SIZES = [
    { value: "solo", label: "Solo / 1 Person", sublabel: "Solopreneur / Freelancer" },
    { value: "micro", label: "2 – 10 Personen", sublabel: "Micro-Team / Startup" },
    { value: "small", label: "11 – 50 Personen", sublabel: "KMU / Scale-up" },
    { value: "medium", label: "50+ Personen", sublabel: "Mittelstand / Enterprise" },
];

const PRIORITY_AREAS = [
    { value: "tax-vat", label: "Steuer & USt", icon: "account_balance" },
    { value: "epr", label: "EPR / Produktpflichten", icon: "inventory_2" },
    { value: "data-privacy", label: "Datenschutz & DSGVO", icon: "shield_locked" },
    { value: "marketing-seo", label: "Marketing & Werbung", icon: "campaign" },
    { value: "corporate", label: "Unternehmensstruktur", icon: "business_center" },
    { value: "employment", label: "Arbeitsrecht & HR", icon: "group" },
    { value: "contracts", label: "Vertragsrecht & AGB", icon: "description" },
    { value: "customs", label: "Zoll & Import/Export", icon: "flight_takeoff" },
];

const MATURITY_LEVELS = [
    { value: "none", label: "Noch nichts", description: "Keine systematische Compliance vorhanden. Wir starten bei Null.", icon: "radio_button_unchecked" },
    { value: "basic", label: "Basics vorhanden", description: "Impressum, Datenschutzerklärung, einfaches Cookie-Banner.", icon: "pending" },
    { value: "structured", label: "Strukturiert & dokumentiert", description: "Interne Prozesse, SOP-Dokumentation, teilweise spezialisierte Tools.", icon: "task_alt" },
    { value: "advanced", label: "Fortgeschritten", description: "Automatisiertes Monitoring, DPO bestellt, ISO/SOC2 in Vorbereitung.", icon: "verified" },
];

const SUPPORT_PREFERENCES = [
    { value: "expert_matching", label: "Experte vermitteln", description: "Ich will mit einem spezialisierten Anwalt oder Berater verbunden werden.", icon: "person_search" },
    { value: "self_check", label: "Selbst prüfen mit Checkliste", description: "Gibt mir eine strukturierte To-Do-Liste, die ich selbst abarbeiten kann.", icon: "checklist" },
    { value: "full_service", label: "Vollständige Übernahme", description: "Komplette Compliance-Begleitung durch einen Managed-Service.", icon: "support_agent" },
    { value: "monitoring", label: "Laufendes Monitoring", description: "Regelmäßige Berichte und automatische Alerts bei Änderungen.", icon: "monitoring" },
];

export function FullSupportWizard() {
    const { dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [teamSize, setTeamSize] = useState("");
    const [maturity, setMaturity] = useState("");
    const [priorityAreas, setPriorityAreas] = useState<string[]>([]);
    const [supportType, setSupportType] = useState("");

    const isLowMaturity = maturity === "none" || maturity === "basic";
    const highPriority = priorityAreas.length >= 4;

    const steps = [
        {
            label: "Team & Größe",
            isValid: !!teamSize,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie groß ist dein Unternehmen?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Größe bestimmt, welche Compliance-Pflichten automatisch entstehen (z.B. Datenschutzbeauftragter ab 20 Personen, LkSG ab 1.000 Mitarbeitern).
                        </p>
                    </div>
                    <RangeSelector
                        bands={TEAM_SIZES}
                        value={teamSize}
                        onChange={v => {
                            setTeamSize(v);
                            dispatch({ type: "SET_REVENUE_BAND", payload: v as any });
                        }}
                    />
                    {teamSize === "medium" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">group</span>
                            Ab 50+ Mitarbeitern greifen das LkSG (Lieferkettensorgfalt), die Pflicht zur betrieblichen Altersvorsorge und ggf. Betriebsräte. Wir erstellen dir eine vollständige Compliance-Roadmap.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Compliance-Reife",
            isValid: !!maturity,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie ist deine aktuelle Compliance-Situation?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Eine ehrliche Einschätzung hilft uns, die richtigen Prioritäten und den realistischen Aufwand zu bestimmen.
                        </p>
                    </div>
                    <SingleSelectCardGroup options={MATURITY_LEVELS} value={maturity} onChange={setMaturity} />
                    {maturity === "none" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                            Kein Problem — wir starten gemeinsam mit den wichtigsten Maßnahmen und bauen Compliance schrittweise auf. Priorität haben Datenschutz, Impressum und USt.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Prioritätsbereiche",
            isValid: priorityAreas.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Welche Bereiche sind für dich am wichtigsten?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Wähle alle relevanten Bereiche. Wir priorisieren nach Risiko und Dringlichkeit.
                        </p>
                    </div>
                    <MultiSelectChips
                        options={PRIORITY_AREAS}
                        value={priorityAreas}
                        onChange={v => {
                            setPriorityAreas(v);
                            dispatch({ type: "SET_RISK_SIGNALS", payload: v });
                        }}
                    />
                    {highPriority && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">tips_and_updates</span>
                            Bei vielen Bereichen empfehlen wir eine Compliance-Roadmap: priorisierte To-Do-Liste mit klaren Meilensteinen und verantwortlichen Experten für jeden Bereich.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Art der Unterstützung",
            isValid: !!supportType,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie möchtest du unterstützt werden?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Von der schnellen Checkliste bis hin zum vollständigen Managed Service — wir passen unsere Empfehlungen an deinen Bedarf an.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={SUPPORT_PREFERENCES}
                        value={supportType}
                        onChange={v => {
                            setSupportType(v);
                            dispatch({ type: "SET_INTENT", payload: v === "self_check" ? "self-check" : v === "expert_matching" ? "expert" : "full-service" });
                        }}
                    />
                    {isLowMaturity && supportType === "self_check" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                            Bei geringer Compliance-Reife empfehlen wir mind. eine Erstberatung mit einem Experten — Checklisten helfen erst, wenn man weiß, was man überprüfen muss.
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
            categoryRoute="/wizard/full-support"
            onNext={() => setStep(s => s + 1)}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
