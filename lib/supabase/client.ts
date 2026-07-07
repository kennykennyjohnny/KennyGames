"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Client Supabase cote navigateur. Utilise UNIQUEMENT l'anon key + la session
 * utilisateur (§9). La service_role ne touche jamais le front.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
