import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "moderator";

export interface StaffContext {
  userId: string;
  username: string;
  role: StaffRole;
}

/**
 * Verifie que l'appelant est staff (admin/moderateur). Renvoie le contexte ou
 * null. La verif s'appuie sur la SESSION (anon key + cookies), pas sur la
 * service_role — on ne fait confiance qu'au role stocke en base.
 *
 * Une fois staff confirme, les pages/routes admin peuvent utiliser
 * createAdminClient() (service_role) pour lire/ecrire sans les limites de RLS.
 */
export async function getStaff(): Promise<StaffContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return null;
  }
  return { userId: profile.id, username: profile.username, role: profile.role as StaffRole };
}
