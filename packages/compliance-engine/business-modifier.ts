import { ComplianceDomain } from './domain-schema.js';

export enum IndustryType {
    GENERIC_ECOMMERCE = 'GENERIC_ECOMMERCE',
    HEALTH = 'HEALTH',
    FINANCE = 'FINANCE',
    SAAS = 'SAAS',
    LEGAL = 'LEGAL'
}

export enum BusinessModel {
    DTC = 'DTC',
    MARKETPLACE_SELLER = 'MARKETPLACE_SELLER',
    SAAS_SUBSCRIPTION = 'SAAS_SUBSCRIPTION',
    AGENCY = 'AGENCY'
}

export function calculateBusinessModifier(
    domain: ComplianceDomain,
    industry?: IndustryType,
    model?: BusinessModel
): number {
    let delta = 0;

    // Industry modifiers
    if (industry === IndustryType.HEALTH) {
        if (domain === ComplianceDomain.MARKETING) delta += 3;
        if (domain === ComplianceDomain.DATA) delta += 2;
        if (domain === ComplianceDomain.PRODUCT) delta += 2;
    }

    if (industry === IndustryType.FINANCE) {
        if (domain === ComplianceDomain.ONGOING_MONITORING) delta += 4;
        if (domain === ComplianceDomain.DATA) delta += 2;
        if (domain === ComplianceDomain.CORPORATE) delta += 2;
    }

    if (industry === IndustryType.SAAS) {
        if (domain === ComplianceDomain.DATA) delta += 2;
        if (domain === ComplianceDomain.PRODUCT) delta -= 2;
    }

    if (industry === IndustryType.GENERIC_ECOMMERCE) {
        if (domain === ComplianceDomain.PRODUCT) delta += 2;
        if (domain === ComplianceDomain.TAX) delta += 1;
    }

    // Business Model modifiers
    if (model === BusinessModel.MARKETPLACE_SELLER) {
        if (domain === ComplianceDomain.TAX) delta += 2;
        if (domain === ComplianceDomain.PRODUCT) delta += 1;
    }

    if (model === BusinessModel.SAAS_SUBSCRIPTION) {
        if (domain === ComplianceDomain.DATA) delta += 1;
    }

    return delta;
}

/** Wizard-Geschaeftsart → Geschaeftsmodell der Engine. Der Wizard schickt
 *  `businessType` (ecommerce, marketplace, …), die Engine filtert ueber
 *  `businessModel` — bis 25.10.2026 kam deshalb nie ein Modell an, der Filter
 *  war aus, und ein D2C-Shop bekam "Data Localization" (nur SaaS).
 *  `other` (auch B2B und Hybrid) bleibt bewusst ohne Modell: lieber
 *  ungefiltert als in die falsche Schublade. Ein ausdruecklich gesetztes
 *  `businessModel` geht vor. */
const MODEL_BY_BUSINESS_TYPE: Record<string, BusinessModel> = {
    ecommerce: BusinessModel.DTC,
    marketplace: BusinessModel.MARKETPLACE_SELLER,
    saas: BusinessModel.SAAS_SUBSCRIPTION,
    agency: BusinessModel.AGENCY,
};

export function businessModelFromAnswers(answers: { businessModel?: unknown; businessType?: unknown } | null | undefined): BusinessModel | undefined {
    const explicit = answers?.businessModel;
    if (typeof explicit === 'string' && (Object.values(BusinessModel) as string[]).includes(explicit)) return explicit as BusinessModel;
    const type = answers?.businessType;
    return typeof type === 'string' ? MODEL_BY_BUSINESS_TYPE[type] : undefined;
}
