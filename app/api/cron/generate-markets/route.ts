import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { generateMarkets } from "@/lib/madame-irma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_ACCOUNT = "00000000-0000-0000-0000-0000000000aa";

/**
 * Batch quotidien de Madame Irma (§4.4, §11) : genere des marches en `draft`.
 * Un admin valide/publie ensuite (au moins au debut). L'IA propose, on execute.
 */
async function handler(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let generated;
  try {
    generated = await generateMarkets(5);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const supabase = createAdminClient();
  const inserted: string[] = [];

  for (const g of generated) {
    const { data: market, error } = await supabase
      .from("markets")
      .insert({
        creator_id: SYSTEM_ACCOUNT,
        title: g.title,
        description: g.description,
        category: g.category,
        type: g.type,
        status: "draft", // validation admin avant publication
        resolution_mode: "ai",
        close_time: g.close_time,
        is_ai_generated: true,
      })
      .select("id")
      .single();
    if (error || !market) continue;

    await supabase.from("market_options").insert(
      g.options.map((label, i) => ({ market_id: market.id, label, sort_order: i + 1 }))
    );
    inserted.push(market.id);
  }

  return NextResponse.json({ generated: generated.length, inserted: inserted.length, ids: inserted });
}

export { handler as GET, handler as POST };
