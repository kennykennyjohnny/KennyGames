import { createClient } from "@/lib/supabase/server";
import { MarketCard } from "@/components/MarketCard";
import { DailyChest } from "@/components/DailyChest";
import type { MarketWithOptions } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();

  // Marches publics ouverts, tri "se cloture bientot" par defaut.
  const { data: markets } = await supabase
    .from("markets")
    .select("*, market_options(*)")
    .eq("status", "open")
    .is("crew_id", null)
    .order("close_time", { ascending: true })
    .limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Le feed</h1>
        <DailyChest />
      </div>

      {!markets || markets.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Aucun marche ouvert pour le moment. Tata Kenny prepare ses predictions...
        </p>
      ) : (
        <div className="grid gap-3">
          {(markets as MarketWithOptions[]).map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
