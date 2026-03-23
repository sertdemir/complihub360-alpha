import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // For now, mock the search results
    const mockProviders = [
        { name: "Acme Compliance", initial: "A", type: "Full Service", match: 98, desc: "Global firm specializing in everything compliance.", primary: true },
        { name: "Global Tax Partners", initial: "G", type: "Tax Specialist", match: 91, desc: "EU Tax experts with wide coverage.", primary: false }
    ];

    return new Response(JSON.stringify({ success: true, providers: mockProviders }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
