import { SearchProfile } from "../components/wizard/WizardContext";

export interface Finding {
    n: number;
    title: string;
    text: string;
    ref: string;
}

export interface LawInfo {
    title: string;
    description: string;
    level: "National" | "EU" | "International";
    link?: string;
}

export interface ArticleInfo {
    title: string;
    excerpt: string;
    readTime: string;
}

export interface TipInfo {
    title: string;
    description: string;
    type: "action" | "warning" | "info";
}

export interface ProviderInfo {
    initial: string;
    name: string;
    type: string;
    match: number;
    desc: string;
    primary: boolean;
    expertise: string[];
}

export interface SearchResults {
    queryText: string;
    riskLevel: "Low" | "Medium" | "High";
    findings: Finding[];
    actionRecommendation: string;
    laws: LawInfo[];
    articles: ArticleInfo[];
    tips: TipInfo[];
    providers: ProviderInfo[];
}

/**
 * Mock data generation based on SearchProfile. 
 * Formatted as an async function to easily swap with a real backend later.
 */
export async function getSearchResults(profile: SearchProfile | null): Promise<SearchResults> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Default Fallback (if no profile passed)
    if (!profile || !profile.categories || profile.categories.length === 0) {
        return generateGeneralResults();
    }

    const primaryCategory = profile.categories[0];
    
    // Switch based on main category selected in wizard
    switch (primaryCategory) {
        case "tax-vat":
            return generateTaxVatResults(profile);
        case "data-privacy":
            return generateDataPrivacyResults(profile);
        default:
            return generateGeneralResults(profile);
    }
}

function generateDataPrivacyResults(profile: SearchProfile): SearchResults {
    const isHighRisk = profile.riskSignals.includes("sensitive_data") || profile.riskSignals.includes("health_data");
    const riskLevel = isHighRisk ? "High" : "Medium";

    return {
        queryText: "GDPR & Data Privacy compliance requirements",
        riskLevel,
        findings: [
            {
                n: 1,
                title: "Storage Limitation Principle",
                text: "Personal data must not be kept longer than necessary for the purposes for which it is processed. You must define clear retention periods.",
                ref: "[Article 5(1)(e) GDPR]",
            },
            {
                n: 2,
                title: "Right to Erasure (Right to be Forgotten)",
                text: "Users can request data deletion, but you must balance this against legal obligations to retain transaction histories.",
                ref: "[Article 17 GDPR]",
            },
            {
                n: 3,
                title: "Consent Management",
                text: "Explicit consent is required for non-essential cookies and tracking mechanisms across all your active markets.",
                ref: "[ePrivacy Directive]",
            }
        ],
        actionRecommendation: "Review and update your Data Retention Policy document to explicitly map specific data categories to their legal retention requirements.",
        laws: [
            { title: "General Data Protection Regulation (GDPR)", description: "The core EU framework for data privacy and security.", level: "EU" },
            { title: "ePrivacy Directive", description: "Regulates cookies, trackers, and electronic communications.", level: "EU" }
        ],
        articles: [
            { title: "How to conduct a Data Protection Impact Assessment (DPIA)", excerpt: "A step-by-step guide to evaluating risks when processing sensitive user data.", readTime: "5 min read" },
            { title: "GDPR consent requirements explained", excerpt: "Learn the difference between active consent and legitimate interest.", readTime: "4 min read" }
        ],
        tips: [
            { title: "Implement a Cookie Banner", description: "Ensure your website uses a compliant cookie banner that blocks scripts before consent is given.", type: "action" },
            { title: "Appoint a Data Protection Officer (DPO)", description: "Since you handle sensitive data, appointing a DPO might be legally required.", type: "warning" }
        ],
        providers: getFilteredProviders(["Privacy", "GDPR", "Legal"], profile)
    };
}

function generateTaxVatResults(profile: SearchProfile): SearchResults {
    const includesEU = profile.markets.some(m => m !== "GB" && m !== "UK");
    const isHighRevenue = profile.revenueBand === "gt-1m" || profile.revenueBand === "100k-1m";
    const riskLevel = (includesEU && isHighRevenue) ? "High" : "Medium";

    return {
        queryText: "Cross-border VAT & OSS registration requirements",
        riskLevel,
        findings: [
            {
                n: 1,
                title: "EU OSS Scheme Eligibility",
                text: "Since you sell to EU customers, you can use the One Stop Shop (OSS) to report all EU cross-border sales in a single return.",
                ref: "[EU VAT Directive]",
            },
            {
                n: 2,
                title: "Local VAT Registration",
                text: "If you store goods in a warehouse in an EU country, you must register for local VAT in that specific country immediately.",
                ref: "[Local Tax Laws]",
            },
            {
                n: 3,
                title: "B2B Reverse Charge",
                text: "For B2B sales within the EU, the reverse charge mechanism often applies, shifting the VAT liability to the buyer.",
                ref: "[Article 196 VAT Directive]",
            }
        ],
        actionRecommendation: "Register for the EU OSS Scheme in your home country to simplify your VAT reporting across all EU member states.",
        laws: [
            { title: "EU VAT Directive 2006/112/EC", description: "The main directive establishing the common system of value added tax in the EU.", level: "EU" },
            { title: "E-commerce VAT Package", description: "Rules introducing the OSS and eliminating the distant sales thresholds.", level: "EU" }
        ],
        articles: [
            { title: "Understanding the One Stop Shop (OSS)", excerpt: "How to register and file your quarterly OSS returns.", readTime: "6 min read" },
            { title: "FBA and VAT: What Amazon sellers need to know", excerpt: "How using Amazon's fulfillment centers triggers local VAT obligations.", readTime: "8 min read" }
        ],
        tips: [
            { title: "Audit your invoices", description: "Ensure your invoices contain all legally required fields for cross-border transactions.", type: "action" },
            { title: "Monitor local thresholds", description: "Even with OSS, storing goods locally changes your obligations.", type: "warning" }
        ],
        providers: getFilteredProviders(["Tax", "VAT", "Finance"], profile)
    };
}

function generateGeneralResults(profile?: SearchProfile | null): SearchResults {
    const riskLevel = profile?.intent === "full-service" ? "Medium" : "Low";
    
    return {
        queryText: profile?.note ? `Compliance requirements for: ${profile.note}` : "General Business Compliance Overview",
        riskLevel,
        findings: [
            {
                n: 1,
                title: "General Corporate Compliance",
                text: "Ensure all standard corporate filings and registrations are up-to-date in your primary jurisdiction.",
                ref: "[Corporate Law]",
            },
            {
                n: 2,
                title: "Basic Privacy Notice",
                text: "A privacy policy is necessary regardless of your specific industry if you collect any user data.",
                ref: "[Consumer Protection]",
            }
        ],
        actionRecommendation: "Complete a full targeted wizard for specific compliance areas (like Tax or Data Privacy) to get tailored results.",
        laws: [
            { title: "Consumer Rights Directive", description: "Basic protections for consumers buying goods and services.", level: "EU" }
        ],
        articles: [
            { title: "Starting a business in Europe", excerpt: "The ultimate compliance checklist for new founders.", readTime: "10 min read" }
        ],
        tips: [
            { title: "Consult a local advisor", description: "Always have a local tax advisor review your corporate setup.", type: "info" }
        ],
        providers: getFilteredProviders([], profile)
    };
}

// -------------------------------------------------------------
// Provider Mock Data & Filtering
// -------------------------------------------------------------
const MOCK_PROVIDERS: ProviderInfo[] = [
    {
        initial: "S",
        name: "SecureComply Inc.",
        type: "Fintech Data Specialists",
        match: 98,
        desc: "Specialized legal consulting firm with deep expertise in EU financial regulations and GDPR alignment.",
        primary: true,
        expertise: ["Privacy", "GDPR", "Fintech"]
    },
    {
        initial: "L",
        name: "LexTech Solutions",
        type: "Compliance Software",
        match: 95,
        desc: "Automated data retention mapping software tailored for banking and fintech platforms.",
        primary: true,
        expertise: ["Privacy", "Software", "Finance"]
    },
    {
        initial: "T",
        name: "TaxEurope Partners",
        type: "Tax Advisory Hub",
        match: 94,
        desc: "Cross-border VAT specialists helping e-commerce businesses navigate OSS and local registrations.",
        primary: true,
        expertise: ["Tax", "VAT", "E-commerce"]
    },
    {
        initial: "G",
        name: "Global Data Law",
        type: "Legal Advisory",
        match: 89,
        desc: "Global law firm providing comprehensive data protection officer (DPO) services and audits.",
        primary: false,
        expertise: ["Privacy", "Legal", "GDPR"]
    },
    {
        initial: "E",
        name: "EcoCompliance",
        type: "EPR Consultants",
        match: 91,
        desc: "Helping sellers conform to packaging and WEEE recycling laws across Europe.",
        primary: false,
        expertise: ["EPR", "Environment", "E-commerce"]
    }
];

function getFilteredProviders(tags: string[], profile?: SearchProfile | null): ProviderInfo[] {
    let sorted = [...MOCK_PROVIDERS];
    
    if (tags.length > 0) {
        // Boost score if provider expertise aligns with requested tags
        sorted = sorted.map(provider => {
            const matches = provider.expertise.filter(exp => tags.includes(exp)).length;
            const newMatchScore = matches > 0 ? Math.min(99, provider.match + (matches * 3)) : provider.match - 10;
            return { ...provider, match: newMatchScore };
        });
    }

    // Sort by match score descending
    sorted.sort((a, b) => b.match - a.match);

    // Return top 3
    return sorted.slice(0, 3);
}
