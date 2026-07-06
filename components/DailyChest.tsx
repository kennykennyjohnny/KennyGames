"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/config";

/** Coffre journalier (§4.6). Idempotent cote serveur (daily_claims). */
export function DailyChest() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function claim() {
    setLoading(true);
    const { data, error } = await createClient().rpc("claim_daily_chest");
    setLoading(false);
    if (error) {
      setMsg(error.message.includes("deja") ? "Deja reclame aujourd'hui 😉" : error.message);
      return;
    }
    const amount = (data as { amount?: number })?.amount ?? 0;
    setMsg(`+${formatCurrency(amount)} !`);
    router.refresh();
  }

  return (
    <div className="text-right">
      <button
        onClick={claim}
        disabled={loading}
        className="rounded-xl bg-gradient-to-r from-accent to-gold px-4 py-2 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        🎁 Coffre du jour
      </button>
      {msg && <p className="mt-1 text-xs text-muted">{msg}</p>}
    </div>
  );
}
