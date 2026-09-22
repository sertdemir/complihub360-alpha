import { structuredLog } from '@complihub360/types';

// ─── Supabase Storage ueber REST, mit der Service-Rolle ─────────────────────
//
// Kein SDK, aus demselben Grund wie bei Stripe und PostgREST (supabase.ts):
// drei Aufrufe rechtfertigen keine Abhaengigkeit. Der Bucket
// `provider-evidence` (Migration 20260924000000) ist privat und hat keine
// Storage-Policy — der Browser bekommt nie einen direkten Zugang, sondern je
// Vorgang eine signierte URL, die die API ausstellt und die ablaeuft:
//
//   Upload    signedUploadUrl()   — Supabase begrenzt das Token auf zwei Stunden
//   Download  signedDownloadUrl() — Standard zehn Minuten, fuer den Reviewer
//   Bestaetigen objectInfo()      — gibt es das Objekt wirklich, wie gross ist es
//
// Die Ownership-Pruefung passiert VOR dem Ausstellen (providerAuth.ts); hier
// wird nur noch signiert. Ein `raw://`-Ref oder ein Dokument selbst erreicht
// diesen Code nie — es fliesst Browser → Storage, an der API vorbei.

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const EVIDENCE_BUCKET = 'provider-evidence';

/** Was der Bucket annimmt — deckungsgleich mit `allowed_mime_types` in der Migration. */
export const EVIDENCE_ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export const EVIDENCE_MAX_BYTES = 20 * 1024 * 1024;

function headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...extra };
}

/** Objektpfad im Bucket: {provider_key}/{evidence_id}/{dateiname}. Der Name wird bereinigt, nicht vertraut. */
export function evidenceObjectPath(providerKey: string, evidenceId: string, originalName: string): string {
    const safe = (originalName || 'document')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'document';
    return `${providerKey}/${evidenceId}/${safe}`;
}

export interface SignedUpload {
    /** Vollstaendige URL, gegen die der Browser per PUT hochlaedt. */
    url: string;
    token: string;
    method: 'PUT';
    /** Ablauf, wie Supabase ihn festlegt (zwei Stunden). */
    expiresAt: string;
}

export async function signedUploadUrl(bucket: string, path: string): Promise<SignedUpload> {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${path}`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: '{}',
    });
    if (!res.ok) throw new Error(`Storage sign-upload failed: ${res.status} ${await res.text()}`);
    const body = await res.json() as { url?: string; token?: string };
    if (!body.url || !body.token) throw new Error('Storage sign-upload: unexpected response');
    return {
        url: `${supabaseUrl}/storage/v1${body.url}`,
        token: body.token,
        method: 'PUT',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
}

export async function signedDownloadUrl(bucket: string, path: string, expiresSec = 600): Promise<string> {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ expiresIn: expiresSec }),
    });
    if (!res.ok) throw new Error(`Storage sign-download failed: ${res.status} ${await res.text()}`);
    const body = await res.json() as { signedURL?: string };
    if (!body.signedURL) throw new Error('Storage sign-download: unexpected response');
    return `${supabaseUrl}/storage/v1${body.signedURL}`;
}

export interface StoredObjectInfo {
    size: number | null;
    mimeType: string | null;
}

/**
 * Liegt das Objekt im Bucket? null, wenn nicht. Gebraucht beim Bestaetigen
 * eines Uploads: die Zeile in provider_evidence wird erst dann zum Nachweis,
 * wenn hinter ihr wirklich eine Datei liegt.
 */
export async function objectInfo(bucket: string, path: string): Promise<StoredObjectInfo | null> {
    try {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/info/${bucket}/${path}`, { headers: headers() });
        if (res.status === 404 || res.status === 400) return null;
        if (!res.ok) throw new Error(`Storage info failed: ${res.status}`);
        const body = await res.json() as { size?: number; contentType?: string; metadata?: { size?: number; mimetype?: string } };
        const size = body.size ?? body.metadata?.size ?? null;
        const mimeType = body.contentType ?? body.metadata?.mimetype ?? null;
        return { size: typeof size === 'number' ? size : null, mimeType: typeof mimeType === 'string' ? mimeType : null };
    } catch {
        structuredLog('warn', 'Storage object info unavailable', {
            correlationId: 'storage', route: 'storage/info', severity: 'warning', errorCode: 'ERR_STORAGE',
        });
        throw new Error('Storage unavailable');
    }
}
