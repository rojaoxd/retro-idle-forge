// Admin Supabase client dedicated to the OTServ import tooling.
// Reads OTSERV_SUPABASE_SERVICE_KEY (not the reserved SUPABASE_* prefix, so
// Lovable actually injects it into the worker on external-Supabase projects).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function getOtservAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.OTSERV_SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key ? ["OTSERV_SUPABASE_SERVICE_KEY"] : []),
    ];
    throw new Error(
      `Missing env for OTServ import: ${missing.join(", ")}. Adicione o secret em Settings.`,
    );
  }
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers ?? undefined);
        // sb_secret_* keys aren't JWTs; drop auto Authorization header.
        if (key.startsWith("sb_secret_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  return cached;
}
