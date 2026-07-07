import { createClient } from "@/lib/supabase/server";
import { DisputeControls } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

interface DisputeRow {
  id: number;
  reason: string;
  source_url: string | null;
  status: string;
  created_at: string;
  markets: { title: string } | null;
  profiles: { username: string } | null;
}

export default async function AdminDisputes() {
  const db = await createClient();
  const { data } = await db
    .from("disputes")
    .select("id, reason, source_url, status, created_at, markets(title), profiles(username)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as DisputeRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-foret">Litiges</h1>
        <p className="text-sm text-gris">
          Contestations de résolution. Accepter = annuler le marché et rembourser. Rejeter = dégeler le marché.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-gris-fin bg-creme p-6 text-center text-gris">Aucun litige ouvert. 🎉</p>
      ) : (
        rows.map((d) => (
          <div key={d.id} className="rounded-lg border border-gris-fin bg-blanc p-4">
            <h3 className="font-extrabold text-charbon">{d.markets?.title ?? "Marché inconnu"}</h3>
            <p className="text-xs text-gris">
              par @{d.profiles?.username ?? "?"} · {new Date(d.created_at).toLocaleString("fr-FR")}
            </p>
            <p className="mt-2 text-sm">« {d.reason} »</p>
            {d.source_url && (
              <a href={d.source_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-foret-light underline">
                {d.source_url}
              </a>
            )}
            <div className="mt-3">
              <DisputeControls disputeId={d.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
