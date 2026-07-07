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
      <div>
        <div className="eyebrow text-foret-light">Entre potes</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.025em] text-foret">Mes crews</h1>
        <p className="mt-1 text-sm text-gris">Des groupes privés avec leurs propres paris et leur classement interne.</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-gris-fin bg-creme p-6 text-center text-gris">
          Tu n&apos;es dans aucun crew. Crée-en un ou rejoins celui d&apos;un pote.
        </p>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) =>
            r.crews ? (
              <Link
                key={r.crews.id}
                href={`/crews/${r.crews.id}`}
                className="rounded-lg border border-gris-fin bg-blanc p-4 transition hover:border-foret-light"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-foret">{r.crews.name}</span>
                  <span className="text-xs text-gris">
                    {r.role} · code <b className="text-foret">{r.crews.invite_code}</b>
                  </span>
                </div>
                {r.crews.description && <p className="mt-1 text-sm text-gris">{r.crews.description}</p>}
              </Link>
            ) : null
          )}
        </div>
      )}

      <CrewActions />
    </div>
  );
}
