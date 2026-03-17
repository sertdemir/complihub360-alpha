export interface StoreRawPayload {
    documentId: string;
    blob: Buffer | string;
    metadata: {
        country: string;
        engagementId: string;
    };
}

/**
 * Interface for Raw Document Vault
 * Only accessed by Upload Gate and Redaction pipeline.
 */
export interface IRawVault {
    saveRawDocument(payload: StoreRawPayload): Promise<{ storageRef: string }>;
    getRawDocument(storageRef: string): Promise<Buffer | string>;
    deleteRawDocument(storageRef: string): Promise<void>;
}

// Stub Implementation
export class RawVault implements IRawVault {
    async saveRawDocument(payload: StoreRawPayload): Promise<{ storageRef: string }> {
        return { storageRef: `raw://${payload.documentId}` };
    }
    async getRawDocument(storageRef: string): Promise<Buffer | string> {
        return "MOCK_RAW_DATA";
    }
    async deleteRawDocument(storageRef: string): Promise<void> {
        // Deleted
    }
}
