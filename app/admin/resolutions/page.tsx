import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/config";
import { ResolveControls } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  proposed_option: string | null;
  source_url: string | null;
  justification: string | null;
  created_at: string;
  markets: {
    id: string;
    title: string;
    total_pool: number;
    market_options: { id: string; label: string; sort_order: number }[];
  } | null;
}

export default async function ResolutionsQueue() {
  const db = await createClient();
  const { data } = await db
    .from("market_resolutions")
    .select("id, proposed_option, source_url, justification, created_at, markets(id, title, total_pool, market_options(id, label, sort_order))")
    .eq("status", "proposed")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-foret">Résolutions à valider</h1>
        <p className="text-sm text-gris">
          Propositions de Tata Kenny. Vérifie la source, puis valide l&apos;issue (paiement parimutuel) ou corrige/annule.
          Rien n&apos;est payé sans ton accord.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-gris-fin bg-creme p-6 text-center text-gris">Aucune résolution en attente. 🔮</p>
      ) : (
        rows.map((r) => {
          if (!r.markets) return null;
          const options = [...r.markets.market_options].sort((a, b) => a.sort_order - b.sort_order);
          const proposedLabel = options.find((o) => o.id === r.proposed_option)?.label;
          return (
            <div key={r.id} className="rounded-lg border border-gris-fin bg-blanc p-4">
              <h3 className="font-extrabold text-charbon">{r.markets.title}</h3>
              <p className="text-sm text-gris">
                Pot : {formatCurrency(r.markets.total_pool)} · Tata Kenny propose :{" "}
                <b className="text-foret">{proposedLabel ?? "aucune issue fiable"}</b>
              </p>
              {r.justification && <p className="mt-2 text-sm italic text-gris">« {r.justification} »</p>}
              {r.source_url && (
                <a href={r.source_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-foret-light underline">
                  {r.source_url}
                </a>
              )}
              <ResolveControls
                marketId={r.markets.id}
                options={options}
                resolutionId={r.id}
                proposedOptionId={r.proposed_option}
                source={r.source_url}
                justification={r.justification}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
