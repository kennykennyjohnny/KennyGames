import { createClient } from "@/lib/supabase/server";
import { MarketFeed } from "@/components/MarketFeed";
import { DailyChest } from "@/components/DailyChest";
import type { MarketWithOptions } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: markets }, { data: profile }, { data: bets }] = await Promise.all([
    supabase
      .from("markets")
      .select("*, market_options(*)")
      .eq("status", "open")
      .is("crew_id", null)
      .order("close_time", { ascending: true })
      .limit(60),
    supabase.from("profiles").select("balance").eq("id", user!.id).maybeSingle(),
    supabase
      .from("bets")
      .select("market_id, option_id, amount, status")
      .eq("user_id", user!.id)
      .eq("status", "active"),
  ]);

  const myBetsByMarket: Record<string, { option_id: string; amount: number; status: string }[]> = {};
  for (const b of bets ?? []) {
    (myBetsByMarket[b.market_id] ??= []).push({ option_id: b.option_id, amount: b.amount, status: b.status });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow text-foret-light">Paris du moment</div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.025em] text-foret">Le feed</h1>
        </div>
        <DailyChest />
      </div>

      <MarketFeed
        initialMarkets={(markets ?? []) as MarketWithOptions[]}
        balance={profile?.balance ?? 0}
        myBetsByMarket={myBetsByMarket}
      />
    </div>
  );
}
