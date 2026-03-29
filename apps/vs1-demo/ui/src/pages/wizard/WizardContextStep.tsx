import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWizard, BusinessType } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardStepper } from "../../components/wizard/WizardStepper";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { SingleSelectCardGroup } from "../../components/wizard/questions/SingleSelectCardGroup";
import { FreeText } from "../../components/wizard/questions/FreeText";
import { YesNoToggle } from "../../components/wizard/questions/YesNoToggle";
import { Typography } from "../../components/ui/Typography";

const BUSINESS_TYPES = [
    { value: "ecommerce", label: "E-Commerce Brand", description: "Sell own products via your website or marketplace.", icon: "storefront" },
    { value: "marketplace", label: "Marketplace Seller", description: "Sell via Amazon, Shopify, eBay, Etsy, etc.", icon: "shopping_bag" },
    { value: "saas", label: "SaaS / Software", description: "Digital products, subscriptions, or software services.", icon: "cloud" },
    { value: "agency", label: "Agency / Consultant", description: "Services, consulting, or creative work for clients.", icon: "groups" },
    { value: "other", label: "Other", description: "Tell us a bit more about your business.", icon: "more_horiz" },
];

export function WizardContextStep() {
    const navigate = useNavigate();
    const { profile, dispatch } = useWizard();
    const [noteOpen, setNoteOpen] = useState(profile.businessType === "other" && !!profile.businessTypeNote);

    const handleTypeChange = (val: string) => {
        dispatch({ type: "SET_BUSINESS_TYPE", payload: val as BusinessType });
        if (val === "other") setNoteOpen(true);
    };

    const handleNext = () => {
        navigate("/wizard/markets");
    };

    return (
        <div className="bg-neutral-50 min-h-screen flex flex-col text-neutral-900 font-['Inter',sans-serif]">
            <WizardHeader />
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">
                    <WizardStepper currentStep={1} totalSteps={5} stepLabel="Business Context" />
                    <div className="px-8 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <Typography variant="h2">
                                How would you describe your business?
                            </Typography>
                            <Typography variant="body" className="text-neutral-600">
                                This helps us tailor the right compliance questions for your situation.
                            </Typography>
                        </div>
                        <SingleSelectCardGroup
                            options={BUSINESS_TYPES}
                            value={profile.businessType}
                            onChange={handleTypeChange}
                        />
                        {(profile.businessType === "other" || noteOpen) && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 mb-6">
                                <FreeText
                                    label="Tell us more about your business"
                                    description="Optional — helps us suggest the most relevant providers."
                                    value={profile.businessTypeNote}
                                    onChange={v => dispatch({ type: "SET_BUSINESS_TYPE_NOTE", payload: v })}
                                    placeholder="e.g. I run a drop-shipping business across EU markets..."
                                />
                            </div>
                        )}
                        <div className="pt-6 border-t border-neutral-100">
                            <div className="flex flex-col gap-2 mb-4">
                                <Typography variant="h3" className="font-semibold text-lg">
                                    Already have a provider?
                                </Typography>
                                <Typography variant="body" className="text-sm text-neutral-600">
                                    Are you looking to switch from your current compliance service provider?
                                </Typography>
                            </div>
                            <YesNoToggle
                                value={profile.existingProvider ? "yes" : "no"}
                                onChange={(val: "yes" | "no") => dispatch({ type: "SET_EXISTING_PROVIDER", payload: val === "yes" })}
                            />
                        </div>
                    </div>
                    <WizardFooter
                        onBack={() => navigate("/wizard/category")}
                        onNext={handleNext}
                        nextDisabled={!profile.businessType}
                    />
                </div>
            </main>
        </div>
    );
}
