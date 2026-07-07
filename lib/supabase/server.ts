import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Client Supabase cote serveur (Server Components, Route Handlers, Server Actions).
 * Lie a la session via les cookies. Toujours anon key + session — jamais la
 * service_role ici (celle-ci est reservee aux taches serveur de confiance : voir
 * lib/supabase/admin.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appele depuis un Server Component : ignorable, le middleware
            // rafraichit la session.
          }
        },
      },
    }
  );
}
