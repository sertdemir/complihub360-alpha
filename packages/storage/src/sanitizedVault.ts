export interface StoreSanitizedPayload {
    documentId: string;
    sanitizedContent: string;
    redactionReport: any;
}

/**
 * Interface for Sanitized Vault
 * Safe for AI consumption and indexing.
 */
export interface ISanitizedVault {
    saveSanitizedDocument(payload: StoreSanitizedPayload): Promise<{ sanitizedStorageRef: string }>;
    getSanitizedDocument(sanitizedStorageRef: string): Promise<string>;
    deleteSanitizedDocument(sanitizedStorageRef: string): Promise<void>;
}

// Stub Implementation
export class SanitizedVault implements ISanitizedVault {
    async saveSanitizedDocument(payload: StoreSanitizedPayload): Promise<{ sanitizedStorageRef: string }> {
        return { sanitizedStorageRef: `sanitized://${payload.documentId}` };
    }
    async getSanitizedDocument(sanitizedStorageRef: string): Promise<string> {
        return "MOCK_SANITIZED_DATA";
    }
    async deleteSanitizedDocument(sanitizedStorageRef: string): Promise<void> {
        // Deleted
    }
}
