import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CrewActions } from "@/components/CrewActions";

export const dynamic = "force-dynamic";

interface CrewRow {
  role: string;
  crews: { id: string; name: string; invite_code: string; description: string | null } | null;
}

export default async function CrewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("crew_members")
    .select("role, crews(id, name, invite_code, description)")
    .eq("user_id", user!.id);

  const rows = (memberships ?? []) as unknown as CrewRow[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Mes crews</h1>
      <p className="text-sm text-muted">
        Des groupes prives de potes, avec leurs marches et leur classement interne.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Tu n'es dans aucun crew. Cree-en un ou rejoins celui d'un pote.
        </p>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) =>
            r.crews ? (
              <Link
                key={r.crews.id}
                href={`/crews/${r.crews.id}`}
                className="rounded-2xl border border-border bg-card p-4 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{r.crews.name}</span>
                  <span className="text-xs text-muted">
                    {r.role} · code {r.crews.invite_code}
                  </span>
                </div>
                {r.crews.description && <p className="mt-1 text-sm text-muted">{r.crews.description}</p>}
              </Link>
            ) : null
          )}
        </div>
      )}

      <CrewActions />
    </div>
  );
}
