import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BetPanel } from "@/components/BetPanel";
import { formatCurrency } from "@/lib/config";
import { timeRemaining, categoryEmoji } from "@/lib/format";
import type { MarketWithOptions, MarketOption, Bet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: market } = await supabase
    .from("markets")
    .select("*, market_options(*)")
    .eq("id", id)
    .maybeSingle();
  if (!market) notFound();

  const m = market as MarketWithOptions;
  const options = [...m.market_options].sort((a, b) => a.sort_order - b.sort_order);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user!.id)
    .maybeSingle();

  // Mes positions sur ce marche (§4.3)
  const { data: myBets } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", id)
    .eq("user_id", user!.id)
    .order("placed_at", { ascending: false });

  const isOpen = m.status === "open" && new Date(m.close_time).getTime() > Date.now();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand">
            {categoryEmoji(m.category)} {m.category}
          </span>
          <span className="text-muted">⏳ {timeRemaining(m.close_time)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight">{m.title}</h1>
        {m.description && <p className="mt-2 text-muted">{m.description}</p>}
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>Pot total : {formatCurrency(m.total_pool)}</span>
          {m.is_ai_generated && <span>🔮 par Madame Irma</span>}
          <span>Statut : {m.status}</span>
        </div>
      </div>

      <BetPanel
        marketId={m.id}
        initialOptions={options as MarketOption[]}
        initialTotalPool={m.total_pool}
        balance={profile?.balance ?? 0}
        open={isOpen}
      />

      {myBets && myBets.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold">Mes positions</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {(myBets as Bet[]).map((b) => {
              const opt = options.find((o) => o.id === b.option_id);
              return (
                <li key={b.id} className="flex justify-between">
                  <span>
                    {opt?.label ?? "?"} — {formatCurrency(b.amount)}
                  </span>
                  <span className="text-muted">
                    {b.status === "active"
                      ? "en cours"
                      : b.status === "won"
                        ? `gagne +${formatCurrency(b.payout_amount)}`
                        : b.status === "refunded"
                          ? "rembourse"
                          : "perdu"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
