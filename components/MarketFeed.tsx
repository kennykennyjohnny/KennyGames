"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CURRENCY_NAME, RAKE_BPS_DISPLAY, MARKET_CATEGORIES, formatCurrency } from "@/lib/config";
import { indicativeOdds, type MarketWithOptions, type MarketOption } from "@/lib/types";
import { timeRemaining, categoryEmoji } from "@/lib/format";

interface MyBet {
  option_id: string;
  amount: number;
  status: string;
}

interface Props {
  initialMarkets: MarketWithOptions[];
  balance: number;
  myBetsByMarket: Record<string, MyBet[]>;
}

export function MarketFeed({ initialMarkets, balance, myBetsByMarket }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [markets, setMarkets] = useState(initialMarkets);
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ marketId: string; optionId: string } | null>(null);
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Record<string, string>>({});

  // Realtime : les pools/cotes bougent en direct (§7).
  useEffect(() => {
    const channel = supabase
      .channel("feed-options")
      .on("postgres_changes", { event: "*", schema: "public", table: "market_options" }, (payload) => {
        const row = payload.new as MarketOption;
        if (!row?.id) return;
        setMarkets((prev) =>
          prev.map((m) =>
            m.id === row.market_id
              ? {
                  ...m,
                  total_pool: m.market_options.reduce((s, o) => s + (o.id === row.id ? row.pool_amount : o.pool_amount), 0),
                  market_options: m.market_options.map((o) => (o.id === row.id ? { ...o, pool_amount: row.pool_amount } : o)),
                }
              : m
          )
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const shown = cat ? markets.filter((m) => m.category === cat) : markets;

  async function placeBet(marketId: string) {
    if (!selected || selected.marketId !== marketId) return;
    if (amount <= 0 || amount > balance) {
      setMsg((m) => ({ ...m, [marketId]: "Montant invalide (vérifie ton solde)." }));
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("place_bet", {
      p_market: marketId,
      p_option: selected.optionId,
      p_amount: amount,
    });
    setBusy(false);
    if (error) {
      setMsg((m) => ({ ...m, [marketId]: error.message }));
      return;
    }
    setMsg((m) => ({ ...m, [marketId]: "Pari placé ! Bonne chance 🍀" }));
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Filtres catégories */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1">
        <FilterPill label="Tout" active={cat === null} onClick={() => setCat(null)} />
        {MARKET_CATEGORIES.map((c) => (
          <FilterPill key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-gris-fin bg-creme p-8 text-center text-gris">
          Aucun marché ouvert ici pour le moment. Tata Kenny prépare ses prédictions… 🔮
        </p>
      ) : (
        <div className="grid gap-3">
          {shown.map((m) => {
            const options = [...m.market_options].sort((a, b) => a.sort_order - b.sort_order);
            const isSel = selected?.marketId === m.id;
            const myBets = myBetsByMarket[m.id] ?? [];
            const closed = new Date(m.close_time).getTime() <= Date.now() || m.status !== "open";
            const sel = options.find((o) => o.id === selected?.optionId);

            let estPayout: number | null = null;
            if (isSel && sel && amount > 0) {
              const poolWAfter = sel.pool_amount + amount;
              const net = Math.floor((m.total_pool + amount) * (1 - RAKE_BPS_DISPLAY / 10000));
              estPayout = Math.floor((amount * net) / poolWAfter);
            }

            return (
              <article key={m.id} className="overflow-hidden rounded-lg border border-gris-fin bg-blanc">
                <div className="p-4">
                  <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.1em]">
                    <span className="rounded-sm bg-foret px-2 py-1 text-or">
                      {categoryEmoji(m.category)} {m.category}
                    </span>
                    <span className="text-gris">⏳ {timeRemaining(m.close_time)}</span>
                  </div>

                  <Link href={`/m/${m.id}`} className="mt-2.5 block">
                    <h3 className="text-lg font-extrabold leading-tight tracking-[-0.01em] text-charbon hover:text-foret">
                      {m.title}
                    </h3>
                  </Link>

                  {/* Options — cliquables pour parier inline */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {options.map((o) => {
                      const odds = indicativeOdds(m.total_pool, o.pool_amount);
                      const active = isSel && selected?.optionId === o.id;
                      const mine = myBets.find((b) => b.option_id === o.id);
                      return (
                        <button
                          key={o.id}
                          disabled={closed}
                          onClick={() => {
                            setSelected({ marketId: m.id, optionId: o.id });
                            setAmount(Math.min(100, balance) || 10);
                            setMsg((mm) => ({ ...mm, [m.id]: "" }));
                          }}
                          className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                            active
                              ? "border-foret bg-foret text-creme"
                              : "border-gris-fin bg-blanc hover:border-foret-light hover:bg-foret-pale/30"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {o.label}
                            {mine && <span className="ml-1 text-[0.6rem] opacity-70">• misé</span>}
                          </span>
                          <span className={`text-sm font-extrabold ${active ? "text-or" : "text-foret"}`}>
                            {odds ? `×${odds.toFixed(2)}` : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Panneau de pari inline (apparaît sous les options) */}
                  {isSel && !closed && (
                    <div className="mt-3 rounded-md bg-foret-pale/40 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-foret">
                        <span>
                          Mise : <b className="text-base">{formatCurrency(amount)}</b>
                        </span>
                        <span className="text-gris">Solde : {formatCurrency(balance)}</span>
                      </div>
                      <input
                        type="range"
                        className="kg-range mt-2 w-full"
                        min={10}
                        max={Math.max(10, balance)}
                        step={10}
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {[50, 100, 250, 500].map((v) => (
                          <button
                            key={v}
                            onClick={() => setAmount(Math.min(v, balance))}
                            className="rounded border border-foret/20 bg-blanc px-2 py-1 text-xs font-semibold text-foret hover:bg-foret hover:text-creme"
                          >
                            {v}
                          </button>
                        ))}
                        <button
                          onClick={() => setAmount(balance)}
                          className="rounded border border-foret/20 bg-blanc px-2 py-1 text-xs font-semibold text-foret hover:bg-foret hover:text-creme"
                        >
                          Max
                        </button>
                        {estPayout !== null && (
                          <span className="ml-auto text-xs text-gris">
                            gain indicatif ~<b className="text-foret">{formatCurrency(estPayout)}</b>
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => placeBet(m.id)}
                          disabled={busy}
                          className="flex-1 rounded bg-or px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] text-or-text transition hover:bg-or-hover disabled:opacity-50"
                        >
                          {busy ? "…" : `Parier ${formatCurrency(amount)}`}
                        </button>
                        <button
                          onClick={() => setSelected(null)}
                          className="rounded border border-foret/20 px-4 py-2.5 text-sm font-semibold text-gris hover:text-charbon"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Positions existantes */}
                  {myBets.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gris-fin pt-3 text-xs">
                      {myBets.map((b, i) => {
                        const opt = options.find((o) => o.id === b.option_id);
                        return (
                          <span key={i} className="rounded-full bg-foret-pale px-2.5 py-1 font-semibold text-foret">
                            🎯 {formatCurrency(b.amount)} sur {opt?.label ?? "?"}
                            {b.status === "active" ? " · en cours" : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.08em] text-gris">
                    <span>Pot : {formatCurrency(m.total_pool)}</span>
                    {m.is_ai_generated && <span>🔮 Tata Kenny</span>}
                  </div>

                  {msg[m.id] && <p className="mt-2 text-center text-sm font-semibold text-foret">{msg[m.id]}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition ${
        active ? "bg-foret text-creme" : "border border-gris-fin bg-blanc text-gris hover:border-foret-light"
      }`}
    >
      {label}
    </button>
  );
}
