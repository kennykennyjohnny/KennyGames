import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import type { Profile } from "@/lib/types";

/**
 * Coquille de l'app connectee. Verifie session + profil ; sans profil, on
 * envoie sur l'onboarding (dotation initiale). La logique argent reste 100%
 * serveur/RPC : ici on ne fait que lire.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex flex-1 flex-col">
      <TopBar profile={profile as Profile} />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
