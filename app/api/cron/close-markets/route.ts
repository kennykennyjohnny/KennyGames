import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Ferme les marches ouverts dont le close_time est passe (§8 cycle de vie).
 * open -> closed, et ouvre la fenetre de contestation (dispute_deadline).
 */
async function handler(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const disputeDeadline = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("markets")
    .update({ status: "closed", dispute_deadline: disputeDeadline })
    .eq("status", "open")
    .lte("close_time", nowIso)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ closed: data?.length ?? 0 });
}

// Vercel Cron declenche en GET ; on accepte aussi POST pour les appels manuels.
export { handler as GET, handler as POST };
