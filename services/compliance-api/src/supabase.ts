import { createClient } from '@supabase/supabase-js';

// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
// This service uses the service role key to insert events and engagements securely
// bypassing Row Level Security (RLS) policies for administrative writes.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables! Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
