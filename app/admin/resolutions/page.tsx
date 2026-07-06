import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();
  const { data } = await admin
    .from("market_resolutions")
    .select("id, proposed_option, source_url, justification, created_at, markets(id, title, total_pool, market_options(id, label, sort_order))")
    .eq("status", "proposed")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Resolutions a valider</h1>
        <p className="text-sm text-muted">
          Propositions de Madame Irma. Verifie la source, puis valide l&apos;issue (paiement
          parimutuel) ou corrige/annule. Rien n&apos;est paye sans ton accord.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Aucune resolution en attente. 🔮
        </p>
      ) : (
        rows.map((r) => {
          if (!r.markets) return null;
          const options = [...r.markets.market_options].sort((a, b) => a.sort_order - b.sort_order);
          const proposedLabel = options.find((o) => o.id === r.proposed_option)?.label;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{r.markets.title}</h3>
                  <p className="text-sm text-muted">
                    Pot : {formatCurrency(r.markets.total_pool)} · Irma propose :{" "}
                    <b className="text-brand">{proposedLabel ?? "aucune issue fiable"}</b>
                  </p>
                </div>
              </div>
              {r.justification && <p className="mt-2 text-sm italic text-muted">« {r.justification} »</p>}
              {r.source_url && (
                <a href={r.source_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-brand-2 underline">
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
