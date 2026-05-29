/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in Server Actions and Route Handlers (never on the client).
 * The service role key must stay server-side; it is never exposed to the browser.
 *
 * NOTE: No module-level singleton — serverless functions on Vercel share module
 * state unpredictably across cold starts. Creating a new client per call is
 * negligible overhead (it is just object construction, no network I/O).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[AI Portal] Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and/or " +
      "SUPABASE_SERVICE_ROLE_KEY are not set. " +
      "Add them in your Vercel project settings → Environment Variables."
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
