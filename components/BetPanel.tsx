"use client";

import { useEffect, useMemo, useState } from "react";
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
  const supabase = useMemo(() => createClient(), []);
  const [options, setOptions] = useState(initialOptions);
  const [totalPool, setTotalPool] = useState(initialTotalPool);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(Math.min(100, balance) || 10);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_options", filter: `market_id=eq.${marketId}` },
        async () => {
          const { data } = await supabase.from("market_options").select("*").eq("market_id", marketId).order("sort_order");
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
      setMsg("Montant invalide (vérifie ton solde).");
      return;
    }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.rpc("place_bet", { p_market: marketId, p_option: selected, p_amount: amount });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Pari placé ! Bonne chance 🍀");
    router.refresh();
  }

  const sel = options.find((o) => o.id === selected);
  let estPayout: number | null = null;
  if (sel && amount > 0) {
    const poolWAfter = sel.pool_amount + amount;
    const net = Math.floor((totalPool + amount) * (1 - RAKE_BPS_DISPLAY / 10000));
    estPayout = Math.floor((amount * net) / poolWAfter);
  }

  if (!open) {
    return (
      <div className="rounded-lg border border-gris-fin bg-creme p-4 text-center text-sm text-gris">
        Ce marché n&apos;accepte plus de paris.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gris-fin bg-blanc p-4">
      <div className="eyebrow mb-3 text-foret-light">Place ton pari</div>
      <div className="grid gap-2">
        {options.map((o) => {
          const odds = indicativeOdds(totalPool, o.pool_amount);
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`flex items-center justify-between rounded-md border px-4 py-3 text-left transition ${
                active ? "border-foret bg-foret text-creme" : "border-gris-fin hover:border-foret-light hover:bg-foret-pale/30"
              }`}
            >
              <span className="font-semibold">{o.label}</span>
              <span className={`text-sm font-extrabold ${active ? "text-or" : "text-foret"}`}>
                cote {odds ? `×${odds.toFixed(2)}` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded-md bg-foret-pale/40 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-foret">
            <span>Mise : <b className="text-base">{formatCurrency(amount)}</b></span>
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[50, 100, 250, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(Math.min(v, balance))}
                className="rounded border border-foret/20 bg-blanc px-2 py-1 text-xs font-semibold text-foret hover:bg-foret hover:text-creme"
              >
                {v}
              </button>
            ))}
            {estPayout !== null && (
              <span className="ml-auto text-xs text-gris">
                gain indicatif ~<b className="text-foret">{formatCurrency(estPayout)}</b>{" "}
                <span className="opacity-70">(bouge jusqu&apos;à la clôture)</span>
              </span>
            )}
          </div>
        </div>
      )}

      <button
        onClick={placeBet}
        disabled={loading || !selected}
        className="mt-4 w-full rounded-lg bg-or px-4 py-3 text-sm font-extrabold uppercase tracking-[0.1em] text-or-text transition hover:bg-or-hover disabled:opacity-50"
      >
        {loading ? "…" : selected ? `Parier ${formatCurrency(amount)}` : "Choisis une option"}
      </button>
      {msg && <p className="mt-2 text-center text-sm font-semibold text-foret">{msg}</p>}
      <p className="mt-2 text-center text-[0.65rem] uppercase tracking-[0.08em] text-gris">
        Cotes indicatives — parimutuel · {CURRENCY_NAME} fictifs
      </p>
    </div>
  );
}
