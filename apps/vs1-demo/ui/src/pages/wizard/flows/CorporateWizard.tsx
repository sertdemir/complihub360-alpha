import { useState } from "react";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { CountryMultiSelect } from "../../../components/wizard/questions/CountryMultiSelect";

const ENTITY_TYPES = [
    { value: "no_entity", label: "Kein Unternehmen / Einzelperson", description: "Du operierst als Privatperson oder Freiberufler.", icon: "person" },
    { value: "kleingewerbe", label: "Kleingewerbe / Nebengewerbe", description: "Gewerbeanmeldung mit § 19 UStG-Option (Kleinunternehmer).", icon: "emoji_objects" },
    { value: "einzelunternehmen", label: "Einzelunternehmen / e.K.", description: "Vollhaftung, im Handelsregister eingetragen oder nicht.", icon: "person_play" },
    { value: "limited", label: "GmbH / Ltd. / SARL", description: "Kapitalgesellschaft mit beschränkter Haftung.", icon: "business" },
    { value: "ug", label: "UG (haftungsbeschränkt)", description: "Günstige Gründungsform mit 1€ Mindestkapital.", icon: "savings" },
    { value: "foreign_company", label: "Ausländische Gesellschaft", description: "Du bist im Ausland registriert und in DE tätig.", icon: "public" },
];

const EXPANSION_GOALS = [
    { value: "new_eu_office", label: "Niederlassung in EU eröffnen", icon: "location_city" },
    { value: "holding", label: "Holdingstruktur aufbauen", icon: "account_tree" },
    { value: "banking_eu", label: "EU-Bankkonto / IBAN eröffnen", icon: "account_balance" },
    { value: "trademark_eu", label: "EU-Marke anmelden", icon: "verified" },
    { value: "employee_eu", label: "EU-Mitarbeiter einstellen", icon: "group_add" },
    { value: "vat_registration", label: "USt-Registrierung", icon: "receipt_long" },
    { value: "company_sale", label: "Unternehmensverkauf / M&A", icon: "handshake" },
    { value: "nothing_yet", label: "Noch keine konkreten Pläne", icon: "schedule" },
];

const URGENCY = [
    { value: "immediate", label: "Sofort — ich stehe vor einem konkreten Problem", description: "Fristen, Behördenanfrage, Behebung.", icon: "emergency" },
    { value: "3_months", label: "Innerhalb von 3 Monaten", description: "Geplanter Schritt, Gründung oder Expansion steht bevor.", icon: "event" },
    { value: "6_months", label: "In 6+ Monaten", description: "Strategische Planung, kein akuter Druck.", icon: "calendar_month" },
    { value: "exploring", label: "Nur informieren", description: "Ich sammle Informationen, kein konkreter Termin.", icon: "explore" },
];

export function CorporateWizard() {
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [entityType, setEntityType] = useState("");
    const [expandsTo, setExpandsTo] = useState<string[]>([]);
    const [expansionGoals, setExpansionGoals] = useState<string[]>([]);
    const [urgency, setUrgency] = useState("");
    const [hasLegalIssue, setHasLegalIssue] = useState<"yes" | "no" | "">("");

    const noEntity = entityType === "no_entity" || entityType === "kleingewerbe";
    const foreignEntity = entityType === "foreign_company";

    const steps = [
        {
            label: "Aktuelle Struktur",
            isValid: !!entityType,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie ist dein Unternehmen aktuell aufgestellt?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Die Rechtsform bestimmt Haftung, Steuerstruktur und Expansionsmöglichkeiten. Wir helfen dir, die optimale Struktur zu finden.
                        </p>
                    </div>
                    <SingleSelectCardGroup options={ENTITY_TYPES} value={entityType} onChange={setEntityType} />
                    {noEntity && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">tips_and_updates</span>
                            Für Skalierung empfehlen wir eine GmbH oder UG: Haftungsbeschränkung, professionelles Auftreten, Beteiligungsmöglichkeiten und steuerliche Optimierung.
                        </div>
                    )}
                    {foreignEntity && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">flag</span>
                            Ausländische Gesellschaften brauchen ab bestimmten Tätigkeiten in DE eine Niederlassung, Steuernummer und ggf. Gewerberegistrierung. Wir klären deinen genauen Status.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Expansionspläne",
            isValid: expansionGoals.length > 0,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Was möchtest du aufbauen oder klären?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Damit wir die richtigen Experten für dich finden. Mehrfachauswahl möglich.
                        </p>
                    </div>
                    <MultiSelectChips
                        options={EXPANSION_GOALS}
                        value={expansionGoals}
                        onChange={v => {
                            setExpansionGoals(v);
                            dispatch({ type: "SET_RISK_SIGNALS", payload: v });
                        }}
                    />
                    {expansionGoals.includes("holding") && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">account_tree</span>
                            Holdingstrukturen ermöglichen erhebliche Steuervorteile bei Dividendenausschüttungen (§ 8b KStG: 95% steuerfrei). Wir zeigen dir passende Strukturen.
                        </div>
                    )}
                    {expansionGoals.includes("new_eu_office") && (
                        <div className="mt-2">
                            <p className="text-xs text-slate-400 mb-3">In welche EU-Länder möchtest du expandieren?</p>
                            <CountryMultiSelect
                                primaryCountry={profile.country}
                                value={expandsTo}
                                onChange={v => {
                                    setExpandsTo(v);
                                    dispatch({ type: "SET_MARKETS", payload: [profile.country, ...v] });
                                }}
                            />
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Akutes Problem?",
            isValid: !!hasLegalIssue,
            content: (
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Gibt es ein akutes rechtliches Problem?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Abmahnungen, Behördenanfragen, Steuerprüfungen oder Vertragsstreitigkeiten erfordern sofortige Bearbeitung.
                        </p>
                    </div>
                    <YesNoToggle value={hasLegalIssue} onChange={setHasLegalIssue} />
                    {hasLegalIssue === "yes" && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">emergency</span>
                            <strong>Wir priorisieren dein Anliegen.</strong> Bitte beschreibe im nächsten Schritt kurz die Situation. Unser Team vermittelt innerhalb von 24h einen passenden Anwalt oder Steuerberater.
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: "Zeitrahmen",
            isValid: !!urgency,
            content: (
                <div className="flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Wie dringend ist dein Handlungsbedarf?</h1>
                        <p className="text-slate-400 text-sm mt-2">
                            Damit wir die richtigen Ressourcen und Reaktionszeiten für dich einplanen können.
                        </p>
                    </div>
                    <SingleSelectCardGroup
                        options={URGENCY}
                        value={urgency}
                        onChange={u => {
                            setUrgency(u);
                            dispatch({ type: "SET_URGENCY", payload: u as any });
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <WizardFlowShell
            steps={steps}
            currentStep={step}
            categoryRoute="/wizard/corporate"
            onNext={() => setStep(s => s + 1)}
            onBack={() => setStep(s => s - 1)}
            onSkip={() => setStep(s => s + 1)}
        />
    );
}
