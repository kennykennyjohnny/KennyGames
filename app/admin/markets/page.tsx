import { createAdminClient } from "@/lib/supabase/admin";
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
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Clos (a resoudre)",
  resolving: "En resolution",
  resolved: "Resolu",
  cancelled: "Annule",
  disputed: "En litige",
};

export default async function AdminMarkets() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("markets")
    .select("id, title, category, status, total_pool, close_time, is_ai_generated, market_options(id, label, sort_order)")
    .in("status", ["draft", "open", "closed", "resolving", "disputed"])
    .order("created_at", { ascending: false })
    .limit(100);

  const markets = (data ?? []) as unknown as MarketRow[];
  const groups: Record<string, MarketRow[]> = {};
  for (const m of markets) (groups[m.status] ??= []).push(m);

  const order = ["draft", "closed", "disputed", "open", "resolving"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Marches</h1>

      {markets.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Aucun marche actif.
        </p>
      )}

      {order.filter((s) => groups[s]?.length).map((status) => (
        <section key={status}>
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted">
            {STATUS_LABEL[status]} ({groups[status].length})
          </h2>
          <div className="space-y-3">
            {groups[status].map((m) => {
              const options = [...m.market_options].sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {categoryEmoji(m.category)} {m.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {m.category} · pot {formatCurrency(m.total_pool)} · ⏳ {timeRemaining(m.close_time)}
                        {m.is_ai_generated && " · 🔮 Tata Kenny"}
                      </p>
                    </div>
                    {m.status === "draft" && <DraftActions id={m.id} />}
                  </div>

                  {/* Resolution manuelle pour les marches clos / en litige sans proposition */}
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
