export enum ComplianceDomain {
    TAX = 'TAX',
    PRODUCT = 'PRODUCT',
    MARKETING = 'MARKETING',
    DATA = 'DATA',
    CORPORATE = 'CORPORATE',
    ONGOING_MONITORING = 'ONGOING_MONITORING',
    LOGISTICS = 'LOGISTICS',
    LEGAL = 'LEGAL'
}

export type ObligationSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Deterministic riskWeight → severity band used across the payload. */
export function severityFromRiskWeight(weight: number): ObligationSeverity {
    if (weight >= 9) return 'critical';
    if (weight >= 7) return 'high';
    if (weight >= 5) return 'medium';
    return 'low';
}

export interface ComplianceSubdomainTemplate {
    id: string;
    label: string;
    description: string;
    triggerTags: string[];
    applicableBusinessModels: string[];
    riskWeight: number; // Baseline risk weight (1-10)
    /** CELEX id of the EU act this obligation rests on — verified against
     *  EUR-Lex, so the payload can carry a citable, always-current source
     *  link. Absent where the obligation is purely national (e.g. corporate
     *  income tax, commercial register). */
    celex?: string;
}

// Initial country-agnostic domain template library
export const DomainTemplateLibrary: Record<ComplianceDomain, ComplianceSubdomainTemplate[]> = {
    [ComplianceDomain.TAX]: [
        {
            id: 'tax-vat-registration',
            label: 'VAT Registration & Filing',
            description: 'Requirements for registering and filing Value Added Tax based on sales thresholds.',
            triggerTags: ['sales', 'revenue', 'ecommerce'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION'],
            riskWeight: 8,
            celex: '32006L0112',
        },
        {
            id: 'tax-corporate',
            label: 'Corporate Income Tax',
            description: 'Standard corporate tax obligations for established entities.',
            triggerTags: ['entity', 'incorporation'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 6,
        }
    ],
    [ComplianceDomain.PRODUCT]: [
        {
            id: 'prod-epr',
            label: 'Extended Producer Responsibility (EPR)',
            description: 'Packaging and product lifecycle compliance obligations.',
            triggerTags: ['physical_goods', 'packaging', 'electronics'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 7,
            celex: '32025R0040',
        },
        {
            id: 'prod-packaging-conformity',
            label: 'Packaging Conformity (PPWR)',
            description: 'EU declaration of conformity, technical documentation and substance limits for every packaging format placed on the EU market — shipping cartons, filler and tape included.',
            triggerTags: ['physical_goods', 'packaging', 'ecommerce', 'shipping'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 8,
            celex: '32025R0040',
        },
        // PPWR duties that are law today but only bite from 2030. Kept as
        // separate obligations rather than bullet points on the conformity row:
        // each has its own evidence, its own owner and its own lead time —
        // recyclate supply is a procurement problem, the empty-space cap is a
        // carton-range problem, and Annex V is a product-range problem.
        {
            id: 'prod-packaging-recycled-content',
            label: 'Recycled Content in Plastic Packaging (PPWR)',
            description: 'Minimum post-consumer recyclate per plastic packaging type: 30% for contact-sensitive PET and single-use beverage bottles, 10% for other contact-sensitive plastics, 35% for all other plastic packaging. Post-industrial recyclate does not count.',
            triggerTags: ['physical_goods', 'packaging', 'plastic'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 7,
            celex: '32025R0040',
        },
        {
            id: 'prod-packaging-recyclability',
            label: 'Design for Recycling (PPWR)',
            description: 'Packaging must reach recyclability grade A–C against the Annex II criteria; below grade C it may no longer be placed on the market. The threshold tightens to grade A or B in 2038.',
            triggerTags: ['physical_goods', 'packaging'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 7,
            celex: '32025R0040',
        },
        {
            id: 'prod-packaging-empty-space',
            label: 'Empty Space Ratio (PPWR)',
            description: 'Grouped, transport and e-commerce packaging may not exceed a 50% empty space ratio. Filler counts as empty volume — air cushions, paper, chips and foam all count against the cap, so oversized cartons cannot be padded into compliance.',
            triggerTags: ['physical_goods', 'packaging', 'ecommerce', 'shipping'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 6,
            celex: '32025R0040',
        },
        {
            id: 'prod-packaging-format-bans',
            label: 'Banned Single-Use Formats (PPWR)',
            description: 'Annex V bans specific single-use formats outright: very lightweight plastic carrier bags, plastic grouped packaging, plastic packaging for fresh produce under 1.5 kg, HORECA single portions and hotel toiletries. Member states may grant hygiene exemptions.',
            triggerTags: ['physical_goods', 'packaging', 'plastic', 'food'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 6,
            celex: '32025R0040',
        },
        {
            id: 'prod-packaging-reuse-targets',
            label: 'Reusable Transport Packaging (PPWR)',
            description: '40% of transport packaging (pallets, crates, pallet wrap, straps) must run inside a reuse system, 10% for grouped packaging. Cardboard boxes are exempt, which leaves ordinary parcel shipping outside the target — this bites on pallets and B2B transport, not on the mailer.',
            triggerTags: ['physical_goods', 'packaging', 'shipping', 'b2b'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 5,
            celex: '32025R0040',
        },
        {
            id: 'prod-safety',
            label: 'Product Safety & Labeling',
            description: 'Consumer safety standards and mandatory labeling requirements.',
            triggerTags: ['consumer_goods', 'health', 'electronics'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 9,
            celex: '32023R0988',
        }
    ],
    [ComplianceDomain.MARKETING]: [
        {
            id: 'mktg-consent',
            label: 'Marketing Consent (Opt-in)',
            description: 'Rules regarding user consent for email, SMS, and other direct marketing.',
            triggerTags: ['email', 'sms', 'newsletter'],
            applicableBusinessModels: ['DTC', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 6,
            celex: '32002L0058',
        },
        {
            id: 'mktg-health-claims',
            label: 'Health & Medical Claims',
            description: 'Strict regulations surrounding advertising claims for health products.',
            triggerTags: ['health', 'supplements', 'medical'],
            applicableBusinessModels: ['DTC'],
            riskWeight: 10,
            celex: '32006R1924',
        }
    ],
    [ComplianceDomain.DATA]: [
        {
            id: 'data-privacy',
            label: 'Data Privacy Policy',
            description: 'Required consumer notices regarding data collection and processing.',
            triggerTags: ['user_data', 'tracking'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 8,
            celex: '32016R0679',
        },
        {
            id: 'data-hosting',
            label: 'Data Localization',
            description: 'Requirements to store data within specific geographic boundaries.',
            triggerTags: ['cloud', 'infrastructure', 'sensitive_data'],
            applicableBusinessModels: ['SAAS_SUBSCRIPTION'],
            riskWeight: 7,
            celex: '32016R0679',
        }
    ],
    [ComplianceDomain.CORPORATE]: [
        {
            id: 'corp-registration',
            label: 'Commercial Register',
            description: 'Mandatory filing in the local commercial register.',
            triggerTags: ['incorporation', 'branch'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 5,
        }
    ],
    [ComplianceDomain.ONGOING_MONITORING]: [
        {
            id: 'monitor-kyb',
            label: 'Know Your Business (KYB)',
            description: 'Ongoing verification of business partners and beneficial owners.',
            triggerTags: ['b2b', 'finance', 'high_value'],
            applicableBusinessModels: ['SAAS_SUBSCRIPTION', 'AGENCY', 'MARKETPLACE_SELLER'],
            riskWeight: 8,
            celex: '32018L0843',
        }
    ],
    [ComplianceDomain.LOGISTICS]: [
        {
            id: 'log-eori',
            label: 'EORI Registration',
            description: 'Economic Operators Registration and Identification number required for customs declarations.',
            triggerTags: ['physical_goods', 'import', 'export'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 7,
            celex: '32013R0952',
        },
        {
            id: 'log-customs-classification',
            label: 'Customs Classification (HS Codes)',
            description: 'Correct tariff classification and origin declarations for imported goods.',
            triggerTags: ['physical_goods', 'import'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 6,
            celex: '32013R0952',
        },
        {
            id: 'log-intrastat',
            label: 'Intrastat Declarations',
            description: 'Statistical reporting of intra-EU goods movements above national thresholds.',
            triggerTags: ['physical_goods', 'eu_trade'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER'],
            riskWeight: 5,
            celex: '32019R2152',
        }
    ],
    [ComplianceDomain.LEGAL]: [
        {
            id: 'legal-consumer-terms',
            label: 'Consumer Terms & Cancellation Rights',
            description: 'Mandatory T&C contents, withdrawal rights and information duties for consumer sales.',
            triggerTags: ['b2c', 'ecommerce'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 6,
            celex: '32011L0083',
        },
        {
            id: 'legal-commercial-contracts',
            label: 'Commercial Contract Review',
            description: 'Supplier, distribution and platform agreements aligned with local commercial law.',
            triggerTags: ['b2b', 'contracts'],
            applicableBusinessModels: ['DTC', 'MARKETPLACE_SELLER', 'SAAS_SUBSCRIPTION', 'AGENCY'],
            riskWeight: 4,
            celex: '32008R0593',
        }
    ]
};
