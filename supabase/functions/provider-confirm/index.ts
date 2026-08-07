import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// P0 #1 remediation: provider magic links are verified (SHA-256 hash lookup in
// magic_link_tokens), expiring and single-use. State changes happen only on
// POST — the GET renders an interstitial with a confirm button so e-mail
// prefetchers can never mutate state.

const ACTION = 'confirm';
const NEW_STATUS = 'confirmed';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function page(title: string, heading: string, body: string, color: string, form?: string): string {
  return `<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #1f2937; margin: 0; }
          .card { background: #0f172a; color: #e8eded; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.4); text-align: center; max-width: 420px; }
          h1 { color: ${color}; margin-top: 0; }
          p { color: #9cb8af; }
          button { background: #d4af37; color: #101411; font-weight: 600; border: 0; border-radius: 8px; padding: 0.7rem 1.4rem; font-size: 1rem; cursor: pointer; }
        </style>
      </head>
      <body><div class="card"><h1>${heading}</h1><p>${body}</p>${form ?? ''}</div></body>
    </html>`;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (!id || !token) {
    return new Response('Missing parameters', { status: 400 });
  }

  // GET never mutates: show an interstitial that POSTs the same URL.
  if (req.method === 'GET') {
    const form = `<form method="POST"><button type="submit">Confirm this request</button></form>`;
    return new Response(page('Confirm request', 'Confirm this engagement request?', 'Clicking confirm accepts the request, notifies the client and stops your SLA timer.', '#d4af37', form), {
      headers: { 'Content-Type': 'text/html' },
      status: 200,
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verify: hash lookup + engagement/action match + not expired + single-use.
  const tokenHash = await sha256Hex(token);
  const { data: rows, error: lookupError } = await supabase
    .from('magic_link_tokens')
    .select('id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .eq('engagement_id', id)
    .eq('action', ACTION)
    .limit(1);

  const tokenRow = rows?.[0];
  const invalid =
    lookupError || !tokenRow || tokenRow.used_at !== null || new Date(tokenRow.expires_at).getTime() < Date.now();
  if (invalid) {
    return new Response(page('Link invalid', 'Link invalid or expired', 'This magic link is not valid anymore. Request a fresh one from your CompliHub workspace.', '#dc2626'), {
      headers: { 'Content-Type': 'text/html' },
      status: 403,
    });
  }

  // Burn the token BEFORE mutating (single-use even if the update fails and is retried).
  const { error: burnError } = await supabase
    .from('magic_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .is('used_at', null);
  if (burnError) {
    return new Response('Database error', { status: 500 });
  }

  const { error } = await supabase
    .from('engagement_requests')
    .update({ status: NEW_STATUS, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    return new Response('Database error', { status: 500 });
  }

  await supabase.from('event_log').insert({ type: 'provider_confirmed_via_magic_link', payload: { engagementId: id } });

  return new Response(page('Confirm request', 'Confirmed!', 'You have successfully accepted the engagement request. The client will be notified and your SLA timer is stopped.', '#16a34a'), {
    headers: { 'Content-Type': 'text/html' },
    status: 200,
  });
});
