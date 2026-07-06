"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENCY_NAME, RAKE_BPS_DISPLAY, formatCurrency } from "@/lib/config";
import { indicativeOdds, type MarketOption } from "@/lib/types";

interface Props {
  marketId: string;
  initialOptions: MarketOption[];
  initialTotalPool: number;
  balance: number;
  open: boolean;
}

export function BetPanel({ marketId, initialOptions, initialTotalPool, balance, open }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [options, setOptions] = useState(initialOptions);
  const [totalPool, setTotalPool] = useState(initialTotalPool);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Realtime : le pot et les cotes bougent jusqu'a la cloture (§4.3, §7).
  useEffect(() => {
    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_options", filter: `market_id=eq.${marketId}` },
        async () => {
          const { data } = await supabase
            .from("market_options")
            .select("*")
            .eq("market_id", marketId)
            .order("sort_order");
          if (data) {
            setOptions(data as MarketOption[]);
            setTotalPool((data as MarketOption[]).reduce((s, o) => s + o.pool_amount, 0));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId, supabase]);

  async function placeBet() {
    if (!selected) return;
    if (amount <= 0 || amount > balance) {
      setMsg("Montant invalide (verifie ton solde).");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.rpc("place_bet", {
      p_market: marketId,
      p_option: selected,
      p_amount: amount,
    });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Pari place ! Bonne chance 🍀");
    router.refresh();
  }

  // Estimation indicative du gain (pools APRES ce pari, rake affichage). Jamais garanti.
  const sel = options.find((o) => o.id === selected);
  let estPayout: number | null = null;
  if (sel && amount > 0) {
    const poolWAfter = sel.pool_amount + amount;
    const totalAfter = totalPool + amount;
    const net = Math.floor(totalAfter * (1 - RAKE_BPS_DISPLAY / 10000));
    estPayout = Math.floor((amount * net) / poolWAfter);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {!open ? (
        <p className="text-center text-sm text-muted">
          Ce marche n'accepte plus de paris.
        </p>
      ) : (
        <>
          <h3 className="font-bold">Place ton pari</h3>
          <div className="mt-3 grid gap-2">
            {options.map((o) => {
              const odds = indicativeOdds(totalPool, o.pool_amount);
              const active = selected === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(o.id)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    active ? "border-brand bg-brand/5 ring-2 ring-brand" : "border-border hover:bg-brand/5"
                  }`}
                >
                  <span className="font-medium">{o.label}</span>
                  <span className="text-sm text-muted">
                    cote indic. <b className="text-brand">{odds ? `x${odds.toFixed(2)}` : "—"}</b>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
              className="w-32 rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
            <span className="text-sm text-muted">{CURRENCY_NAME}</span>
            <div className="ml-auto flex gap-1">
              {[50, 100, 250].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-brand/5"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {sel && estPayout !== null && (
            <p className="mt-2 text-xs text-muted">
              Gain indicatif si tu gagnes : ~{formatCurrency(estPayout)}{" "}
              <span className="opacity-70">(bouge jusqu'a la cloture)</span>
            </p>
          )}

          <button
            onClick={placeBet}
            disabled={loading || !selected}
            className="mt-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "Parier"}
          </button>
          {msg && <p className="mt-2 text-center text-sm text-muted">{msg}</p>}
        </>
      )}
    </div>
  );
}
