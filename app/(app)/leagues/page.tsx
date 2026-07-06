import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DIVISIONS } from "@/lib/config";

export const dynamic = "force-dynamic";

interface StandingRow {
  points: number;
  division: string;
  profiles: { username: string; display_name: string | null } | null;
}

export default async function LeaguesPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, ends_at")
    .eq("is_current", true)
    .maybeSingle();

  let rows: StandingRow[] = [];
  if (season) {
    const { data } = await supabase
      .from("league_standings")
      .select("points, division, profiles(username, display_name)")
      .eq("season_id", season.id)
      .order("points", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as StandingRow[];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Ligues</h1>
        <p className="text-sm text-muted">
          {season ? `${season.name} — classement` : "Aucune saison en cours"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {DIVISIONS.map((d) => (
          <span key={d} className="rounded-full border border-border bg-card px-3 py-1 font-semibold">
            {d}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted">
          Le classement se remplit des les premieres resolutions de marches.
        </p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                {r.profiles ? (
                  <Link href={`/profile/${r.profiles.username}`} className="font-medium hover:text-brand">
                    {r.profiles.display_name ?? r.profiles.username}
                  </Link>
                ) : (
                  <span className="text-muted">?</span>
                )}
                <span className="text-xs text-muted">{r.division}</span>
              </span>
              <span className="font-bold text-brand">{r.points} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
