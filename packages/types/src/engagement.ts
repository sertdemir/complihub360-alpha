export interface Provider {
    provider_key: string;
    name: string;
    website_url: string;
    partner_status: 'active' | 'inactive' | 'downgraded';
    countries_supported: string[];
    languages: string[];
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
