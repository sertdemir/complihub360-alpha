import { structuredLog } from "@complihub360/types";

// ─── VIES · EU VAT number validation ─────────────────────────────────────────
// The Commission's VIES REST service is the authoritative check for EU VAT
// IDs. We use it at provider intake for two reasons:
//   1. Billing (VAT decision brief): the reverse-charge treatment of an invoice
//      hinges on the customer being a business — the VAT ID is that evidence.
//   2. Vetting: a valid VAT ID is a cheap first signal that a provider is a
//      real, registered company.
// The result is stored WITH a timestamp, so we can show when it was last
// confirmed instead of pretending it is live.
//
// Deliberately dependency-free (fetch only) and fail-soft: VIES has regular
// maintenance windows and per-member-state outages, so an unreachable service
// must never block an intake — it yields 'unavailable', not 'invalid'.

const VIES_BASE = process.env.VIES_BASE_URL
    || 'https://ec.europa.eu/taxation_customs/vies/rest-api';

/** EU member states VIES answers for (GB left out — post-Brexit, HMRC has its own service). */
const VIES_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR',
    'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

export type VatCheckStatus = 'valid' | 'invalid' | 'unsupported' | 'unavailable';

export interface VatCheckResult {
    status: VatCheckStatus;
    /** Normalised input, e.g. 'DE811193231'. */
    vatId: string;
    countryCode: string;
    /** Company name as returned by the member state, when disclosed. */
    name?: string | null;
    checkedAt: string;
}

/** 'de 811193231' / 'DE-811193231' → 'DE811193231'. Greece files under EL. */
export function normaliseVatId(raw: string): string {
    const up = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return up.startsWith('GR') ? 'EL' + up.slice(2) : up;
}

export async function checkVatId(raw: string): Promise<VatCheckResult> {
    const vatId = normaliseVatId(raw);
    const checkedAt = new Date().toISOString();
    const countryCode = vatId.slice(0, 2);
    const number = vatId.slice(2);

    if (!/^[A-Z]{2}[A-Z0-9]{2,}$/.test(vatId)) {
        return { status: 'invalid', vatId, countryCode, checkedAt };
    }
    // Non-EU providers (UK, TR, US …) are legitimate — VIES simply cannot
    // speak for them, so we record 'unsupported' instead of a false negative.
    if (!VIES_COUNTRIES.has(countryCode)) {
        return { status: 'unsupported', vatId, countryCode, checkedAt };
    }

    try {
        const res = await fetch(`${VIES_BASE}/ms/${countryCode}/vat/${number}`, {
            signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) return { status: 'unavailable', vatId, countryCode, checkedAt };
        const body = await res.json() as { isValid?: boolean; name?: string };
        // VIES returns '---' when the member state withholds the name.
        const name = body.name && body.name !== '---' ? body.name : null;
        return { status: body.isValid ? 'valid' : 'invalid', vatId, countryCode, name, checkedAt };
    } catch (err) {
        structuredLog('warn', 'VIES check unavailable', {
            correlationId: 'vies', route: 'vies/check', severity: 'warning', errorCode: 'ERR_VIES',
        });
        return { status: 'unavailable', vatId, countryCode, checkedAt };
    }
}
