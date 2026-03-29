// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("DEBUG - Available process.env keys:", Object.keys(process.env).filter(k => k.startsWith('SUPABASE') || k === 'PORT' || k === 'NODE_ENV').join(', '));
    console.error("DEBUG - supabaseUrl exists?", !!supabaseUrl, "supabaseKey exists?", !!supabaseKey);
    throw new Error("Missing Supabase environment variables!");
}

const restUrl = `${supabaseUrl}/rest/v1`;

const defaultHeaders = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

export const supabaseApi = {
    async insert(table: string, data: any) {
        const res = await fetch(`${restUrl}/${table}`, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Supabase insert failed: ${await res.text()}`);
        return res.json();
    },

    async update(table: string, match: any, data: any) {
        // Construct query string for matching
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(match)) {
            queryParams.append(key, `eq.${value}`);
        }
        const res = await fetch(`${restUrl}/${table}?${queryParams.toString()}`, {
            method: 'PATCH',
            headers: defaultHeaders,
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Supabase update failed: ${await res.text()}`);
        return res.json();
    },

    async select(table: string, match: any) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(match)) {
            queryParams.append(key, `eq.${value}`);
        }
        const res = await fetch(`${restUrl}/${table}?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) throw new Error(`Supabase select failed: ${await res.text()}`);
        return res.json();
    },

    async rpc(functionName: string, params: any) {
        const res = await fetch(`${restUrl}/rpc/${functionName}`, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error(`Supabase RPC failed: ${await res.text()}`);
        return res.json();
    }
};
