import Link from "next/link";
import type { MarketWithOptions } from "@/lib/types";
import { indicativeOdds } from "@/lib/types";
import { formatCurrency, MASCOT_NAME } from "@/lib/config";
import { timeRemaining, categoryEmoji } from "@/lib/format";

export function MarketCard({ market }: { market: MarketWithOptions }) {
  const options = [...market.market_options].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Link
      href={`/m/${market.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand">
          {categoryEmoji(market.category)} {market.category}
        </span>
        <span className="text-muted">⏳ {timeRemaining(market.close_time)}</span>
      </div>

      <h3 className="mt-2 font-bold leading-snug">{market.title}</h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const odds = indicativeOdds(market.total_pool, o.pool_amount);
          return (
            <span
              key={o.id}
              className="rounded-lg border border-border px-2 py-1 text-sm"
              style={o.color ? { borderColor: o.color } : undefined}
            >
              {o.label}{" "}
              <b className="text-brand">{odds ? `x${odds.toFixed(2)}` : "—"}</b>
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Pot : {formatCurrency(market.total_pool)}</span>
        {market.is_ai_generated && <span>🔮 {MASCOT_NAME}</span>}
      </div>
    </Link>
  );
}
