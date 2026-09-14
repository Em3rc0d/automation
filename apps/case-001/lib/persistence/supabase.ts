import { createClient } from "@supabase/supabase-js";

/**
 * Cloud adapter kept for the later pilot-binding phase.
 *
 * The local PoC does not use this client: it talks to PostgreSQL directly through DATABASE_URL.
 * This helper exists so the previous Supabase service-role path remains explicit and can be
 * reintroduced behind the persistence boundary when tenant Auth/RLS is designed for the final pilot.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the Supabase cloud adapter.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
