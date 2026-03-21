import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWizard, WizardCategory } from "../../components/wizard/WizardContext";
import { WizardHeader } from "../../components/wizard/WizardHeader";
import { WizardPreGate } from "../../components/wizard/WizardPreGate";
import { WizardFooter } from "../../components/wizard/WizardFooter";
import { CountryMultiSelect } from "../../components/wizard/questions/CountryMultiSelect";
import { Typography } from "../../components/ui/Typography";

const PRIMARY_COUNTRIES = [
    { code: "DE", label: "Germany", flag: "🇩🇪" },
    { code: "EU", label: "European Union", flag: "🇪🇺" },
    { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
    { code: "US", label: "United States", flag: "🇺🇸" },
    { code: "CA", label: "Canada", flag: "🇨🇦" },
    { code: "AU", label: "Australia", flag: "🇦🇺" },
    { code: "CH", label: "Switzerland", flag: "🇨🇭" },
    { code: "AT", label: "Austria", flag: "🇦🇹" },
];

interface CategoryCard {
    id: WizardCategory;
    title: string;
    description: string;
    icon: string;
    color: string;
}

const CATEGORIES: CategoryCard[] = [
    {
        id: "tax-vat",
        title: "Tax & VAT",
        description: "Cross-border tax obligations, VAT registration, and marketplace tax rules.",
        icon: "account_balance",
        color: "blue",
    },
    {
        id: "epr",
        title: "Product & Packaging",
        description: "EPR registration, packaging obligations, and product category rules.",
        icon: "inventory_2",
        color: "orange",
    },
    {
        id: "data-privacy",
        title: "Data & Privacy",
        description: "GDPR, CCPA, tracking consent, and personal data processing.",
        icon: "shield_locked",
        color: "emerald",
    },
    {
        id: "marketing-seo",
        title: "Marketing & SEO",
        description: "Advertising standards, health claims, cookie laws, and influencer rules.",
        icon: "campaign",
        color: "purple",
    },
    {
        id: "corporate",
        title: "Corporate & Structure",
        description: "Legal entity formation, foreign registration, and business structure.",
        icon: "business_center",
        color: "yellow",
    },
    {
        id: "full-support",
        title: "Full Support",
        description: "End-to-end compliance management across all categories.",
        icon: "verified_user",
        color: "pink",
    },
];

const COLOR_MAP: Record<string, { selected: string; icon: string; badge: string }> = {
    blue: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    orange: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    emerald: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    purple: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    yellow: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
    pink: {
        selected: "border-primary-500 bg-primary-50 shadow-sm ring-1 ring-primary-500",
        icon: "text-primary-600",
        badge: "bg-primary-100/50 text-primary-700",
    },
};

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export function WizardPreGateFlow() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { profile, dispatch } = useWizard();

    const [step, setStep] = useState(() => location.pathname.includes('/category') ? 1 : 0);
    const [direction, setDirection] = useState(1);

    const preCountry = searchParams.get("country") || "";
    const preCategory = searchParams.get("category") || "";
    
    // Use local state before committing to global profile on 'Next'
    const [primaryCountry, setPrimaryCountry] = useState(profile.country || preCountry);
    const safeMarkets = profile.markets || [];
    const initialAdditional = safeMarkets.filter(m => m !== (profile.country || preCountry));
    const [additionalMarkets, setAdditionalMarkets] = useState<string[]>(initialAdditional);
    const [showAdditionalMarkets, setShowAdditionalMarkets] = useState(false);

    useEffect(() => {
        const cat = searchParams.get("category") as WizardCategory | null;
        if (cat && !profile.category) {
            dispatch({ type: "SET_CATEGORY", payload: cat });
        }
    }, [searchParams, profile.category, dispatch]);

    const handleNextCountry = () => {
        if (!primaryCountry) return;
        dispatch({ type: "SET_COUNTRY", payload: primaryCountry });
        dispatch({ type: "SET_MARKETS", payload: [primaryCountry, ...additionalMarkets] });
        
        if (preCategory) {
            dispatch({ type: "SET_CATEGORY", payload: preCategory as any });
            navigate(`/wizard/${preCategory}`);
        } else {
            setDirection(1);
            setStep(1);
            window.history.replaceState(null, "", "/wizard/category");
        }
    };

    const handleSelectCategory = (cat: WizardCategory) => {
        dispatch({ type: "SET_CATEGORY", payload: cat });
    };

    const handleNextCategory = () => {
        if (!profile.category) return;
        navigate(`/wizard/${profile.category}`);
    };

    const handleBackCategory = () => {
        setDirection(-1);
        setStep(0);
        window.history.replaceState(null, "", "/wizard");
    };

    const isCategory = step === 1;

    return (
        <div className="w-full flex flex-col items-center justify-center text-neutral-900 font-['Inter',sans-serif]">
            <main className="w-full flex flex-col items-center justify-center px-4 py-8">
                <motion.div 
                    layout
                    transition={{ layout: { duration: 0.4, ease: [0.25, 1, 0.5, 1] } }}
                    className="w-full max-w-3xl bg-white border border-white/20 rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col wizard-card cursor-auto"
                >
                    <WizardPreGate 
                        currentDot={isCategory ? 1 : 0} 
                        label={isCategory ? "Compliance Category" : "Market Scope"} 
                        countryBadge={isCategory ? (profile.country || undefined) : undefined} 
                    />

                    <div className="relative overflow-hidden w-full flex-1">
                        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                                className="w-full px-8 py-8 flex flex-col gap-6"
                            >
                                {!isCategory ? (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <Typography variant="h2">
                                                Where is your business based?
                                            </Typography>
                                            <Typography variant="body" className="text-neutral-600">
                                                Select your primary country to define your regulatory context.
                                            </Typography>
                                        </div>

                                        <div>
                                            <Typography variant="caption" weight="semibold" className="text-neutral-500 mb-4 block">
                                                PRIMARY MARKET (REQUIRED)
                                            </Typography>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {PRIMARY_COUNTRIES.map(c => {
                                                    const selected = primaryCountry === c.code;
                                                    return (
                                                        <button
                                                            key={c.code}
                                                            onClick={() => setPrimaryCountry(c.code)}
                                                            className={`flex flex-col items-center gap-3 py-4 rounded-xl border-2 transition-all duration-200 ${
                                                                selected
                                                                    ? "border-primary-600 bg-primary-50 ring-2 ring-primary-100 ring-inset"
                                                                    : "border-neutral-100 bg-neutral-50 hover:border-neutral-200 hover:bg-white"
                                                            }`}
                                                        >
                                                            <span className="text-3xl">{c.flag}</span>
                                                            <span className={`text-xs font-semibold ${selected ? "text-primary-900" : "text-neutral-500"}`}>
                                                                {c.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {primaryCountry && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="border-t border-neutral-200 pt-6 overflow-hidden flex flex-col items-start"
                                                >
                                                    <button
                                                        onClick={() => setShowAdditionalMarkets(!showAdditionalMarkets)}
                                                        className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {showAdditionalMarkets ? "remove_circle_outline" : "add_circle_outline"}
                                                        </span>
                                                        {showAdditionalMarkets ? "Hide specific markets" : "Select specific additional markets (Optional)"}
                                                    </button>
                                                    
                                                    <AnimatePresence>
                                                        {showAdditionalMarkets && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                className="overflow-hidden w-full"
                                                            >
                                                                <CountryMultiSelect
                                                                    primaryCountry={primaryCountry}
                                                                    value={additionalMarkets}
                                                                    onChange={setAdditionalMarkets}
                                                                />
                                                                {additionalMarkets.length >= 5 && (
                                                                    <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-900 text-xs">
                                                                        <span className="material-symbols-outlined text-primary-600 text-[18px]">tips_and_updates</span>
                                                                        <span>Many markets selected — consider our Full Support package for optimal coverage.</span>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-2">
                                            <Typography variant="h2">
                                                What do you need help with?
                                            </Typography>
                                            <Typography variant="body" className="text-neutral-600">
                                                Choose your primary area of concern. This determines which questions we'll ask next.
                                            </Typography>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {CATEGORIES.map(cat => {
                                                const selected = profile.category === cat.id;
                                                const colors = COLOR_MAP[cat.color];
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => handleSelectCategory(cat.id)}
                                                        className={`relative flex flex-col gap-4 p-5 rounded-xl border transition-all duration-200 text-left ${
                                                            selected
                                                                ? `${colors.selected}`
                                                                : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                                                        }`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${selected ? colors.badge : "bg-neutral-100 text-neutral-500"}`}>
                                                            <span className={`material-symbols-outlined text-2xl`}>
                                                                {cat.icon}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <Typography variant="body" weight="semibold" className={selected ? "text-primary-900" : "text-neutral-900"}>
                                                                {cat.title}
                                                            </Typography>
                                                            <Typography variant="ui-small" className="text-neutral-600 mt-1">
                                                                {cat.description}
                                                            </Typography>
                                                        </div>
                                                        {selected && (
                                                            <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-200">
                                                                <span className={`material-symbols-outlined text-xl text-primary-500`}>check_circle</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {!isCategory ? (
                        <WizardFooter
                            showBack={false}
                            onNext={handleNextCountry}
                            nextDisabled={!primaryCountry}
                            nextLabel="Set Country & Continue"
                        />
                    ) : (
                        <WizardFooter
                            onBack={handleBackCategory}
                            onNext={handleNextCategory}
                            nextDisabled={!profile.category}
                        />
                    )}
                </motion.div>
            </main>
        </div>
    );
}
