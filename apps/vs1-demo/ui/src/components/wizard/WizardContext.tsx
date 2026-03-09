import { createContext, useContext, useReducer, ReactNode } from "react";

export type WizardCategory =
    | "tax-vat"
    | "epr"
    | "data-privacy"
    | "marketing-seo"
    | "corporate"
    | "full-support"
    | "";

export type BusinessType =
    | "ecommerce"
    | "marketplace"
    | "saas"
    | "agency"
    | "other"
    | "";

export type RevenueBand =
    | "lt-10k"
    | "10k-100k"
    | "100k-1m"
    | "gt-1m"
    | "";

export type Intent = "self-check" | "expert" | "full-service" | "";
export type Urgency = "today" | "week" | "month" | "researching" | "";

export interface SearchProfile {
    country: string;
    markets: string[];
    category: WizardCategory;
    businessType: BusinessType;
    businessTypeNote: string;
    marketScope: "local" | "eu" | "global" | "";
    riskSignals: string[];
    revenueBand: RevenueBand;
    intent: Intent;
    urgency: Urgency;
    note: string;
}

const DEFAULT_PROFILE: SearchProfile = {
    country: "",
    markets: [],
    category: "",
    businessType: "",
    businessTypeNote: "",
    marketScope: "",
    riskSignals: [],
    revenueBand: "",
    intent: "",
    urgency: "",
    note: "",
};

type WizardAction =
    | { type: "SET_COUNTRY"; payload: string }
    | { type: "SET_MARKETS"; payload: string[] }
    | { type: "SET_CATEGORY"; payload: WizardCategory }
    | { type: "SET_BUSINESS_TYPE"; payload: BusinessType }
    | { type: "SET_BUSINESS_TYPE_NOTE"; payload: string }
    | { type: "SET_MARKET_SCOPE"; payload: "local" | "eu" | "global" }
    | { type: "SET_RISK_SIGNALS"; payload: string[] }
    | { type: "SET_REVENUE_BAND"; payload: RevenueBand }
    | { type: "SET_INTENT"; payload: Intent }
    | { type: "SET_URGENCY"; payload: Urgency }
    | { type: "SET_NOTE"; payload: string }
    | { type: "RESET" };

function wizardReducer(state: SearchProfile, action: WizardAction): SearchProfile {
    switch (action.type) {
        case "SET_COUNTRY": return { ...state, country: action.payload };
        case "SET_MARKETS": return { ...state, markets: action.payload };
        case "SET_CATEGORY": return { ...state, category: action.payload, riskSignals: [] };
        case "SET_BUSINESS_TYPE": return { ...state, businessType: action.payload };
        case "SET_BUSINESS_TYPE_NOTE": return { ...state, businessTypeNote: action.payload };
        case "SET_MARKET_SCOPE": return { ...state, marketScope: action.payload };
        case "SET_RISK_SIGNALS": return { ...state, riskSignals: action.payload };
        case "SET_REVENUE_BAND": return { ...state, revenueBand: action.payload };
        case "SET_INTENT": return { ...state, intent: action.payload };
        case "SET_URGENCY": return { ...state, urgency: action.payload };
        case "SET_NOTE": return { ...state, note: action.payload };
        case "RESET": return DEFAULT_PROFILE;
        default: return state;
    }
}

interface WizardContextValue {
    profile: SearchProfile;
    dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
    const [profile, dispatch] = useReducer(wizardReducer, DEFAULT_PROFILE);
    return (
        <WizardContext.Provider value={{ profile, dispatch }}>
            {children}
        </WizardContext.Provider>
    );
}

export function useWizard(): WizardContextValue {
    const ctx = useContext(WizardContext);
    if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
    return ctx;
}
