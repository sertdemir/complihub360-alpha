import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Checkbox } from "./ui/Checkbox";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/Card";
import { Typography } from "./ui/Typography";

interface EngagementModalProps {
    providerName?: string;
    market?: string;
    category?: string;
    onClose: () => void;
    onSubmit?: (details: any) => void;
}

export function EngagementModal({
    providerName = "Acme Compliance",
    market = "DE, EU",
    category = "Tax & VAT",
    onClose,
    onSubmit,
}: EngagementModalProps) {
    const { t } = useTranslation('common');
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        email: localStorage.getItem("user_email") || "",
        message: "",
        consent: false,
        budget: "",
        timeline: "",
        companySize: ""
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleNext = () => setStep(2);
    const handleBack = () => setStep(1);

    const handleSubmit = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            onSubmit?.(formData);
            setTimeout(onClose, 1500);
        }, 1200);
    };

    const isStep1Valid = formData.email.trim() !== "" && formData.message.trim() !== "" && formData.consent;

    const selectClasses = "flex h-10 w-full rounded-md border-medium border-neutral-300 bg-white px-3 py-2 text-body placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors appearance-none";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/80 backdrop-blur-md px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
                <Card className="w-full max-w-[560px] flex flex-col">
                    {/* Header */}
                    <CardHeader className="flex-row items-center justify-between border-b border-neutral-200 pb-5">
                        <div className="flex flex-col space-y-0.5">
                            <Typography variant="h3" weight="bold">
                                Request Consultation
                            </Typography>
                            <Typography variant="ui-small" className="text-neutral-500">
                                with <span className="font-semibold text-neutral-700">{providerName}</span>
                            </Typography>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} className="!p-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </Button>
                    </CardHeader>

                    {/* Progress */}
                    <div className="w-full h-1 bg-neutral-100">
                        <motion.div
                            className="h-full bg-primary-500"
                            initial={{ width: "50%" }}
                            animate={{ width: step === 1 ? "50%" : "100%" }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* Content */}
                    <CardContent className="!p-6 min-h-[360px]">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col gap-5"
                                >
                                    {/* Email */}
                                    <div className="flex flex-col gap-1.5">
                                        <Typography variant="caption" weight="bold" className="text-neutral-500">
                                            Email Address <span className="text-error-500">*</span>
                                        </Typography>
                                        <Input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="you@company.com"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <Typography variant="caption" weight="bold" className="text-neutral-500">
                                            Your Message <span className="text-error-500">*</span>
                                        </Typography>
                                        <textarea
                                            required
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="Describe your current compliance challenge..."
                                            className="flex w-full rounded-md border-medium border-neutral-300 bg-white px-3 py-2 text-body placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors min-h-[120px] resize-y"
                                        />
                                    </div>

                                    {/* Consent */}
                                    <div className="flex items-start gap-3 mt-1">
                                        <Checkbox
                                            checked={formData.consent}
                                            onChange={e => setFormData({ ...formData, consent: e.target.checked })}
                                        />
                                        <Typography variant="ui-small" className="text-neutral-500 leading-relaxed select-none cursor-pointer" onClick={() => setFormData({ ...formData, consent: !formData.consent })}>
                                            I agree to share these details with {providerName}. My contact info is protected by the Privacy AI Gate until I reveal it.
                                        </Typography>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col gap-5"
                                >
                                    {/* Tip Banner */}
                                    <div className="p-4 rounded-lg border-medium border-primary-200 bg-primary-50">
                                        <Typography variant="ui-small" weight="medium" className="text-primary-600 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                            These optional details help providers tailor their proposal.
                                        </Typography>
                                    </div>

                                    {/* Timeline */}
                                    <div className="flex flex-col gap-1.5">
                                        <Typography variant="caption" weight="bold" className="text-neutral-500">
                                            Timeline
                                        </Typography>
                                        <select
                                            value={formData.timeline}
                                            onChange={e => setFormData({ ...formData, timeline: e.target.value })}
                                            className={selectClasses}
                                        >
                                            <option value="">Select a timeline...</option>
                                            <option value="immediate">Immediate (Next 7 days)</option>
                                            <option value="month">Within 1 Month</option>
                                            <option value="quarter">Within 3 Months</option>
                                            <option value="exploring">Just exploring</option>
                                        </select>
                                    </div>

                                    {/* Budget */}
                                    <div className="flex flex-col gap-1.5">
                                        <Typography variant="caption" weight="bold" className="text-neutral-500">
                                            Estimated Budget
                                        </Typography>
                                        <select
                                            value={formData.budget}
                                            onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                            className={selectClasses}
                                        >
                                            <option value="">Select a budget range...</option>
                                            <option value="under5k">Under €5,000</option>
                                            <option value="5k-15k">€5,000 - €15,000</option>
                                            <option value="15k-50k">€15,000 - €50,000</option>
                                            <option value="50k+">€50,000+</option>
                                        </select>
                                    </div>

                                    {/* Company Size */}
                                    <div className="flex flex-col gap-1.5">
                                        <Typography variant="caption" weight="bold" className="text-neutral-500">
                                            Company Size
                                        </Typography>
                                        <select
                                            value={formData.companySize}
                                            onChange={e => setFormData({ ...formData, companySize: e.target.value })}
                                            className={selectClasses}
                                        >
                                            <option value="">Select company size...</option>
                                            <option value="1-10">1-10 Employees</option>
                                            <option value="11-50">11-50 Employees</option>
                                            <option value="51-200">51-200 Employees</option>
                                            <option value="201+">201+ Employees</option>
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                    {/* Footer */}
                    <CardFooter className="justify-between !p-4 border-t border-neutral-200 bg-neutral-50">
                        {step === 1 ? (
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={handleBack}>
                                <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
                                Back
                            </Button>
                        )}

                        {step === 1 ? (
                            <Button variant="primary" onClick={handleNext} disabled={!isStep1Valid}>
                                Next Step
                                <span className="material-symbols-outlined text-[18px] ml-1.5">arrow_forward</span>
                            </Button>
                        ) : (
                            <Button
                                variant={submitted ? "primary" : "primary"}
                                onClick={handleSubmit}
                                disabled={submitted || loading}
                                className={submitted ? "!bg-success-500 hover:!bg-success-500" : ""}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting
                                    </span>
                                ) : submitted ? (
                                    <>
                                        Sent Successfully
                                        <span className="material-symbols-outlined text-[18px] ml-1.5">check</span>
                                    </>
                                ) : (
                                    <>
                                        Submit Request
                                        <span className="material-symbols-outlined text-[18px] ml-1.5">send</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
