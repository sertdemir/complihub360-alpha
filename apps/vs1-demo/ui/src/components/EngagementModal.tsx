import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

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
        // Simulate Edge Function Call
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            onSubmit?.(formData);
            setTimeout(onClose, 1500);
        }, 1200);
    };

    const isStep1Valid = formData.email.trim() !== "" && formData.message.trim() !== "" && formData.consent;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="flex flex-col w-full max-w-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex flex-col">
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">
                            Request Consultation
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            with <span className="font-semibold text-slate-700 dark:text-slate-300">{providerName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
                    <motion.div 
                        className="h-full bg-[#137fec]"
                        initial={{ width: "50%" }}
                        animate={{ width: step === 1 ? "50%" : "100%" }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 relative overflow-hidden min-h-[360px]">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-5 h-full"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="you@company.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Your Message <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="Describe your current compliance challenge..."
                                        className="w-full flex-1 min-h-[120px] resize-y px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all"
                                    />
                                </div>

                                <label className="flex items-start gap-3 mt-2 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex justify-center items-center shrink-0 mt-0.5 transition-colors ${formData.consent ? 'bg-[#137fec] border-[#137fec]' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`}>
                                        {formData.consent && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={formData.consent} onChange={e => setFormData({ ...formData, consent: e.target.checked })} />
                                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        I agree to share these details with {providerName}. My contact info is protected by the Privacy AI Gate until I reveal it.
                                    </span>
                                </label>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-5 h-full"
                            >
                                <div className="p-4 rounded-xl border border-[#137fec]/20 bg-[#137fec]/5 mb-2">
                                    <p className="text-sm text-[#137fec] font-medium m-0 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                        These optional details help providers tailor their proposal.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Timeline
                                    </label>
                                    <select
                                        value={formData.timeline}
                                        onChange={e => setFormData({ ...formData, timeline: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select a timeline...</option>
                                        <option value="immediate">Immediate (Next 7 days)</option>
                                        <option value="month">Within 1 Month</option>
                                        <option value="quarter">Within 3 Months</option>
                                        <option value="exploring">Just exploring</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Estimated Budget
                                    </label>
                                    <select
                                        value={formData.budget}
                                        onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select a budget range...</option>
                                        <option value="under5k">Under €5,000</option>
                                        <option value="5k-15k">€5,000 - €15,000</option>
                                        <option value="15k-50k">€15,000 - €50,000</option>
                                        <option value="50k+">€50,000+</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Company Size
                                    </label>
                                    <select
                                        value={formData.companySize}
                                        onChange={e => setFormData({ ...formData, companySize: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all appearance-none"
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
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    {step === 1 ? (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Back
                        </button>
                    )}

                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            disabled={!isStep1Valid}
                            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            Next Step
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitted || loading}
                            className={`px-6 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2 ${submitted
                                ? "bg-green-600"
                                : "bg-[#137fec] hover:bg-[#137fec]/90"
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting
                                </span>
                            ) : submitted ? (
                                <>
                                    Sent Successfully
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                </>
                            ) : (
                                <>
                                    Submit Request
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
