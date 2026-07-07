import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/config";
import { timeRemaining, categoryEmoji } from "@/lib/format";
import { DraftActions, ResolveControls } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

interface MarketRow {
  id: string;
  title: string;
  category: string;
  status: string;
  total_pool: number;
  close_time: string;
  is_ai_generated: boolean;
  market_options: { id: string; label: string; sort_order: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillons",
  open: "Ouverts",
  closed: "Clos (à résoudre)",
  resolving: "En résolution",
  disputed: "En litige",
};

export default async function AdminMarkets() {
  const db = await createClient();
  const { data } = await db
    .from("markets")
    .select("id, title, category, status, total_pool, close_time, is_ai_generated, market_options(id, label, sort_order)")
    .in("status", ["draft", "open", "closed", "resolving", "disputed"])
    .order("created_at", { ascending: false })
    .limit(100);

  const markets = (data ?? []) as unknown as MarketRow[];
  const groups: Record<string, MarketRow[]> = {};
  for (const m of markets) (groups[m.status] ??= []).push(m);
  const order = ["draft", "closed", "disputed", "resolving", "open"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-foret">Marchés</h1>

      {markets.length === 0 && (
        <p className="rounded-lg border border-gris-fin bg-creme p-6 text-center text-gris">Aucun marché actif.</p>
      )}

      {order
        .filter((s) => groups[s]?.length)
        .map((status) => (
          <section key={status}>
            <div className="eyebrow mb-2 text-foret-light">
              {STATUS_LABEL[status]} ({groups[status].length})
            </div>
            <div className="space-y-3">
              {groups[status].map((m) => {
                const options = [...m.market_options].sort((a, b) => a.sort_order - b.sort_order);
                return (
                  <div key={m.id} className="rounded-lg border border-gris-fin bg-blanc p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-charbon">
                          {categoryEmoji(m.category)} {m.title}
                        </h3>
                        <p className="text-xs text-gris">
                          {m.category} · pot {formatCurrency(m.total_pool)} · ⏳ {timeRemaining(m.close_time)}
                          {m.is_ai_generated && " · 🔮 Tata Kenny"}
                        </p>
                      </div>
                      {m.status === "draft" && <DraftActions id={m.id} />}
                    </div>
                    {(m.status === "closed" || m.status === "resolving" || m.status === "disputed") && (
                      <ResolveControls marketId={m.id} options={options} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
