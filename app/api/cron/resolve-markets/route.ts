import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { resolveMarketAI } from "@/lib/madame-irma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Resout les marches IA arrives a terme (§8) : Madame Irma cherche le resultat,
 * cite sa source, et le systeme execute le payout parimutuel via resolve_market.
 * winner=null (pas de source fiable) => on laisse une proposition pour l'admin.
 * Fenetre de contestation respectee : on ne resout qu'apres dispute_deadline.
 */
async function handler(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // Marches IA fermes, hors dispute, fenetre de contestation ecoulee
  const { data: markets, error } = await supabase
    .from("markets")
    .select("id, title, description, market_options(id, label)")
    .eq("resolution_mode", "ai")
    .eq("status", "closed")
    .or(`dispute_deadline.is.null,dispute_deadline.lte.${nowIso}`)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ market: string; resolved: boolean; winner: string | null }> = [];

  for (const m of markets ?? []) {
    const options = (m.market_options as { id: string; label: string }[]) ?? [];
    if (options.length === 0) continue;

    const proposal = await resolveMarketAI({
      title: m.title,
      description: m.description,
      options,
    });

    if (proposal.winner_option_id) {
      // L'IA a une issue + source => on execute le payout via la RPC (service_role).
      const { error: rpcErr } = await supabase.rpc("resolve_market", {
        p_market: m.id,
        p_winning_option: proposal.winner_option_id,
        p_source: proposal.source_url,
        p_justification: proposal.justification,
        p_by: null,
      });
      results.push({ market: m.id, resolved: !rpcErr, winner: proposal.winner_option_id });
    } else {
      // Pas d'issue fiable => proposition en attente de revue admin.
      await supabase.from("market_resolutions").insert({
        market_id: m.id,
        proposed_option: null,
        method: "ai",
        status: "proposed",
        source_url: proposal.source_url,
        justification: proposal.justification,
      });
      results.push({ market: m.id, resolved: false, winner: null });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export { handler as GET, handler as POST };
