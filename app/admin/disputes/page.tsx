import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();
  const { data } = await admin
    .from("disputes")
    .select("id, reason, source_url, status, created_at, markets(title), profiles(username)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as DisputeRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Litiges</h1>
        <p className="text-sm text-muted">
          Contestations de resolution. Accepter = annuler le marche et rembourser.
          Rejeter = degeler le marche pour le resoudre normalement.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Aucun litige ouvert. 🎉
        </p>
      ) : (
        rows.map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-bold">{d.markets?.title ?? "Marche inconnu"}</h3>
            <p className="text-xs text-muted">
              par @{d.profiles?.username ?? "?"} · {new Date(d.created_at).toLocaleString("fr-FR")}
            </p>
            <p className="mt-2 text-sm">« {d.reason} »</p>
            {d.source_url && (
              <a href={d.source_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-brand-2 underline">
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
