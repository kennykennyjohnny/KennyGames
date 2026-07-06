import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Echange le code du lien magique contre une session, puis route l'utilisateur :
 * - profil existant -> /feed
 * - pas encore de profil -> /onboarding (choix pseudo + dotation)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        return NextResponse.redirect(`${origin}${profile ? "/feed" : "/onboarding"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
