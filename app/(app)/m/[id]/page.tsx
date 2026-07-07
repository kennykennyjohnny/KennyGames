import Link from "next/link";
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

  const { data: market } = await supabase.from("markets").select("*, market_options(*)").eq("id", id).maybeSingle();
  if (!market) notFound();
  const m = market as MarketWithOptions;
  const options = [...m.market_options].sort((a, b) => a.sort_order - b.sort_order);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("balance").eq("id", user!.id).maybeSingle();
  const { data: myBets } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", id)
    .eq("user_id", user!.id)
    .order("placed_at", { ascending: false });

  const isOpen = m.status === "open" && new Date(m.close_time).getTime() > Date.now();

  return (
    <div className="space-y-5">
      <Link href="/feed" className="text-xs font-bold uppercase tracking-[0.1em] text-gris hover:text-foret">
        ← Retour au feed
      </Link>

      <div className="rounded-lg border border-gris-fin bg-foret p-6 text-creme">
        <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.1em]">
          <span className="rounded-sm bg-or px-2 py-1 text-or-text">
            {categoryEmoji(m.category)} {m.category}
          </span>
          <span className="text-creme/60">⏳ {timeRemaining(m.close_time)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{m.title}</h1>
        {m.description && <p className="mt-2 font-light text-creme/70">{m.description}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-creme/60">
          <span>Pot : <b className="text-or">{formatCurrency(m.total_pool)}</b></span>
          {m.is_ai_generated && <span>🔮 par Tata Kenny</span>}
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
        <div className="rounded-lg border border-gris-fin bg-blanc p-4">
          <div className="eyebrow mb-3 text-foret-light">Mes positions</div>
          <ul className="space-y-2">
            {(myBets as Bet[]).map((b) => {
              const opt = options.find((o) => o.id === b.option_id);
              return (
                <li key={b.id} className="flex justify-between text-sm">
                  <span className="font-semibold text-charbon">
                    {opt?.label ?? "?"} — {formatCurrency(b.amount)}
                  </span>
                  <span className="font-semibold text-gris">
                    {b.status === "active"
                      ? "en cours"
                      : b.status === "won"
                        ? `gagné +${formatCurrency(b.payout_amount)}`
                        : b.status === "refunded"
                          ? "remboursé"
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
