import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { RangeSelector } from "../../../components/wizard/questions/RangeSelector";

const TEAM_SIZES = [
    { value: "solo", label: "Solo / 1 person", sublabel: "Solopreneur / Freelancer" },
    { value: "micro", label: "2 – 10 people", sublabel: "Micro-team / Startup" },
    { value: "small", label: "11 – 50 people", sublabel: "SME / Scale-up" },
    { value: "medium", label: "50+ people", sublabel: "Mid-market / Enterprise" },
];

const PRIORITY_AREAS = [
    { value: "tax-vat", label: "Tax & VAT", icon: "account_balance" },
    { value: "epr", label: "EPR / Product obligations", icon: "inventory_2" },
    { value: "data-privacy", label: "Data protection & GDPR", icon: "shield_locked" },
    { value: "marketing-seo", label: "Marketing & Advertising", icon: "campaign" },
    { value: "corporate", label: "Corporate structure", icon: "business_center" },
    { value: "employment", label: "Employment law & HR", icon: "group" },
    { value: "contracts", label: "Contract law & T&Cs", icon: "description" },
    { value: "customs", label: "Customs & import/export", icon: "flight_takeoff" },
];

const MATURITY_LEVELS = [
    { value: "none", label: "Nothing in place", description: "No systematic compliance yet. We start from scratch together.", icon: "radio_button_unchecked" },
    { value: "basic", label: "Basics covered", description: "Imprint, privacy policy, simple cookie banner.", icon: "pending" },
    { value: "structured", label: "Structured & documented", description: "Internal processes, SOP documentation, some specialized tools.", icon: "task_alt" },
    { value: "advanced", label: "Advanced", description: "Automated monitoring, DPO appointed, ISO/SOC2 in progress.", icon: "verified" },
];

const SUPPORT_PREFERENCES = [
    { value: "expert_matching", label: "Match me with an expert", description: "I want to be connected with a specialized attorney or advisor.", icon: "person_search" },
    { value: "self_check", label: "Self-check with a checklist", description: "Give me a structured to-do list I can work through myself.", icon: "checklist" },
    { value: "full_service", label: "Full managed service", description: "Complete compliance support handled by a managed service.", icon: "support_agent" },
    { value: "monitoring", label: "Ongoing monitoring", description: "Regular reports and automatic alerts when regulations change.", icon: "monitoring" },
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
            label: "Team Size",
            isValid: !!teamSize,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">How large is your company?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Size determines which compliance obligations automatically apply (e.g. Data Protection Officer required at 20+ people, Supply Chain Act at 1,000+ employees).
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
                            With 50+ employees, the Supply Chain Due Diligence Act (LkSG), company pension obligations, and potentially works councils apply. We'll create a complete compliance roadmap for you.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Compliance Maturity",
            isValid: !!maturity,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">What is your current compliance situation?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            An honest assessment helps us set the right priorities and determine realistic effort.
                        </p>
                    </div>
                    <SingleSelectCardGroup options={MATURITY_LEVELS} value={maturity} onChange={setMaturity} />
                    {maturity === "none" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                            No problem — we'll start with the most important measures together and build compliance step by step. Top priorities: data protection, imprint, and VAT.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Priority Areas",
            isValid: priorityAreas.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Which areas matter most to you?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Select all relevant areas. We'll prioritize by risk and urgency.
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
                            With many areas to cover, we recommend a Compliance Roadmap: a prioritized to-do list with clear milestones and responsible experts for each domain.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Support Type",
            isValid: !!supportType,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">How would you like to be supported?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            From a quick checklist to a fully managed service — we tailor our recommendations to your needs.
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
                            With low compliance maturity, we recommend at least one expert consultation — checklists only help once you know what to check.
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
