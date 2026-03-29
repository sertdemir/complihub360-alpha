import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (!id || !token) {
    return new Response("Missing parameters", { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('engagement_requests')
    .update({ status: 'replied' })
    .eq('id', id);

  if (error) {
    return new Response("Database error", { status: 500 });
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>More Info Requested</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
          h1 { color: #0284c7; margin-top: 0; }
          p { color: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Marked as Replied</h1>
          <p>The system has logged your request for more information. The client will be prompted to provide additional details.</p>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
    status: 200,
  });
});
