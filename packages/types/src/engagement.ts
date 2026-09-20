import type { ProviderLifecycleStatus, BillingBlockReason } from './provider.js';

export interface Provider {
    provider_key: string;
    name: string;
    website_url: string;
    /** @deprecated Seit dem Anbieter-Datenmodell (20.09.2026) ersetzt durch `lifecycle_status`. Bleibt, weil das Matching noch darauf filtert. */
    partner_status: 'active' | 'inactive' | 'downgraded';
    /** Kontostatus nach Spec §3. Sagt NICHT, ob eine Leistung matchbar ist — das entscheidet `MatchableProviderService`. */
    lifecycle_status: ProviderLifecycleStatus;
    lifecycle_status_since: string;
    lifecycle_status_reason: string | null;
    reverification_due_at: string | null;
    /** Bis wann ein Anbieter mit faelliger Reverifizierung noch matchbar bleibt. null = sofort raus. */
    reverification_grace_until: string | null;
    /** Billing-Gate (Spec §21.1): sperrt die Buchung, NICHT das Matching. */
    billing_ready: boolean;
    billing_block_reasons: BillingBlockReason[];
    /** @deprecated Ersetzt durch `ProviderServiceCoverage`. */
    countries_supported: string[];
    languages: string[];
    /** @deprecated Ersetzt durch `ProviderService`. Ein Bereichs-Slug ist kein Capability Profile. */
    categories: string[];
    sla_target_confirm_hours: number;
    sla_target_reply_hours: number;
    breach_count: number;
    createdAt: string;
    updatedAt: string;
}

export interface EngagementRequest {
    id: string; // UUIDv4
    user_id: string;
    provider_key: string;
    country: string;
    category: string;
    structured_answers: Record<string, any>;
    message: string;
    status: 'created' | 'delivered' | 'viewed' | 'confirmed' | 'replied' | 'declined' | 'expired';
    sla_confirm_deadline: string;
    sla_reply_deadline: string;
    createdAt: string;
    updatedAt: string;
}
