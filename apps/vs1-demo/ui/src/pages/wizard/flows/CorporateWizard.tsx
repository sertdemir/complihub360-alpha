import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useWizard } from "../../../components/wizard/WizardContext";
import { WizardFlowShell } from "../../../components/wizard/WizardFlowShell";
import { SingleSelectCardGroup } from "../../../components/wizard/questions/SingleSelectCardGroup";
import { MultiSelectChips } from "../../../components/wizard/questions/MultiSelectChips";
import { YesNoToggle } from "../../../components/wizard/questions/YesNoToggle";
import { CountryMultiSelect } from "../../../components/wizard/questions/CountryMultiSelect";
import { Typography } from "../../../components/ui/Typography";

const getEntityTypes = (t: TFunction) => [
    { value: "no_entity", label: t('wizard.corporate.entities.noEntity.label', "No company / Sole individual"), description: t('wizard.corporate.entities.noEntity.desc', "You operate as a private person or freelancer."), icon: "person" },
    { value: "kleingewerbe", label: t('wizard.corporate.entities.smallTrade.label', "Small trade / Side business"), description: t('wizard.corporate.entities.smallTrade.desc', "Business registration with small business rule option (§ 19 UStG)."), icon: "emoji_objects" },
    { value: "einzelunternehmen", label: t('wizard.corporate.entities.soleTrader.label', "Sole trader / e.K."), description: t('wizard.corporate.entities.soleTrader.desc', "Full personal liability, with or without commercial register entry."), icon: "person_play" },
    { value: "limited", label: t('wizard.corporate.entities.gmbh.label', "GmbH / Ltd. / SARL"), description: t('wizard.corporate.entities.gmbh.desc', "Limited liability company with shared capital."), icon: "business" },
    { value: "ug", label: t('wizard.corporate.entities.ug.label', "UG (limited liability)"), description: t('wizard.corporate.entities.ug.desc', "Affordable incorporation with €1 minimum share capital."), icon: "savings" },
    { value: "foreign_company", label: t('wizard.corporate.entities.foreign.label', "Foreign company"), description: t('wizard.corporate.entities.foreign.desc', "You are registered abroad but operating in Germany / EU."), icon: "public" },
];

const getExpansionGoals = (t: TFunction) => [
    { value: "new_eu_office", label: t('wizard.corporate.goals.newEuOffice', "Open a branch in the EU"), icon: "location_city" },
    { value: "holding", label: t('wizard.corporate.goals.holding', "Build a holding structure"), icon: "account_tree" },
    { value: "banking_eu", label: t('wizard.corporate.goals.bankingEu', "Open EU bank account / IBAN"), icon: "account_balance" },
    { value: "trademark_eu", label: t('wizard.corporate.goals.trademarkEu', "Register EU trademark"), icon: "verified" },
    { value: "employee_eu", label: t('wizard.corporate.goals.employeeEu', "Hire EU employees"), icon: "group_add" },
    { value: "vat_registration", label: t('wizard.corporate.goals.vatRegistration', "VAT registration"), icon: "receipt_long" },
    { value: "company_sale", label: t('wizard.corporate.goals.companySale', "Company sale / M&A"), icon: "handshake" },
    { value: "nothing_yet", label: t('wizard.corporate.goals.nothingYet', "No concrete plans yet"), icon: "schedule" },
];

const getUrgency = (t: TFunction) => [
    { value: "immediate", label: t('wizard.corporate.urgency.immediate.label', "Immediately — I have a concrete issue"), description: t('wizard.corporate.urgency.immediate.desc', "Deadline, authority request, remediation needed."), icon: "emergency" },
    { value: "3_months", label: t('wizard.corporate.urgency.3months.label', "Within 3 months"), description: t('wizard.corporate.urgency.3months.desc', "A planned step, incorporation or expansion is upcoming."), icon: "event" },
    { value: "6_months", label: t('wizard.corporate.urgency.6months.label', "In 6+ months"), description: t('wizard.corporate.urgency.6months.desc', "Strategic planning, no immediate pressure."), icon: "calendar_month" },
    { value: "exploring", label: t('wizard.corporate.urgency.exploring.label', "Just researching"), description: t('wizard.corporate.urgency.exploring.desc', "I'm gathering information, no concrete timeline."), icon: "explore" },
];

export function CorporateWizard() {
    const { t } = useTranslation('common');
    const { profile, dispatch } = useWizard();
    const [step, setStep] = useState(0);
    const [entityType, setEntityType] = useState("");
    const [expandsTo, setExpandsTo] = useState<string[]>([]);
    const [expansionGoals, setExpansionGoals] = useState<string[]>([]);
    const [urgency, setUrgency] = useState("");
    const [hasLegalIssue, setHasLegalIssue] = useState<"yes" | "no" | "">("");

    const noEntity = entityType === "no_entity" || entityType === "kleingewerbe";
    const foreignEntity = entityType === "foreign_company";

    const ENTITY_TYPES = getEntityTypes(t);
    const EXPANSION_GOALS = getExpansionGoals(t);
    const URGENCY = getUrgency(t);

    const steps = [
        {
            label: t('wizard.corporate.steps.structure.label', "Current Structure"),
            isValid: !!entityType,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.corporate.steps.structure.title', "How is your company currently structured?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.corporate.steps.structure.subtitle', "Your legal form determines liability, tax structure, and expansion options. We'll help you find the optimal structure.")}
                        </Typography>
                    </div>
                    <SingleSelectCardGroup options={ENTITY_TYPES} value={entityType} onChange={setEntityType} />
                    {noEntity && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">tips_and_updates</span>
                            <span>{t('wizard.corporate.steps.structure.noEntityNotice', "For scaling, we recommend a GmbH or UG: liability protection, professional image, equity participation options, and tax optimization opportunities.")}</span>
                        </div>
                    )}
                    {foreignEntity && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-primary-600 shrink-0">flag</span>
                            <span>{t('wizard.corporate.steps.structure.foreignNotice', "Foreign companies may need a local branch, tax number, and trade registration depending on their activities in Germany / EU. We'll clarify your exact status.")}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.corporate.steps.goals.label', "Expansion Goals"),
            isValid: expansionGoals.length > 0,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.corporate.steps.goals.title', "What do you want to build or clarify?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.corporate.steps.goals.subtitle', "Select all that apply. This helps us match you with the right experts.")}
                        </Typography>
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
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-purple-600 shrink-0">account_tree</span>
                            <span>{t('wizard.corporate.steps.goals.holdingNotice', "Holding structures unlock significant tax benefits on dividend distributions (§ 8b KStG: 95% tax-exempt). We'll show you the right structures for your situation.")}</span>
                        </div>
                    )}
                    {expansionGoals.includes("new_eu_office") && (
                        <div className="flex flex-col gap-4">
                            <Typography variant="body" className="text-neutral-600">{t('wizard.corporate.steps.goals.euOfficeQuery', "Which EU countries are you expanding into?")}</Typography>
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
            label: t('wizard.corporate.steps.acute.label', "Acute Issue?"),
            isValid: !!hasLegalIssue,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.corporate.steps.acute.title', "Is there an acute legal issue?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.corporate.steps.acute.subtitle', "Warning letters, authority requests, tax audits, or contract disputes require immediate attention.")}
                        </Typography>
                    </div>
                    <YesNoToggle value={hasLegalIssue} onChange={setHasLegalIssue} />
                    {hasLegalIssue === "yes" && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 text-xs">
                            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">emergency</span>
                            <span>{t('wizard.corporate.steps.acute.acuteNotice', "We'll prioritize your case. Please describe the situation briefly in the next step. Our team will connect you with the right attorney or advisor within 24 hours.")}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            label: t('wizard.corporate.steps.timeline.label', "Timeline"),
            isValid: !!urgency,
            content: (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Typography variant="h2">{t('wizard.corporate.steps.timeline.title', "How urgent is your need to act?")}</Typography>
                        <Typography variant="body" className="text-neutral-600">
                            {t('wizard.corporate.steps.timeline.subtitle', "This helps us allocate the right resources and response times for your situation.")}
                        </Typography>
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
