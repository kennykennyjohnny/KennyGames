import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client ADMIN (service_role) — SERVEUR UNIQUEMENT (§2, §9).
 * `import "server-only"` fait echouer le build si ce module fuit dans un bundle
 * client. A n'utiliser que dans les taches de confiance : cron de resolution,
 * Madame Irma, webhooks Stripe. Contourne la RLS : manipuler avec precaution.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant (serveur only)");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
