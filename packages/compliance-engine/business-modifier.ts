import { ComplianceDomain } from './domain-schema';

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
