"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase cote navigateur. Utilise UNIQUEMENT l'anon key + la session
 * utilisateur (§9). La service_role ne touche jamais le front.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
