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

  const { data: season } = await supabase.from("seasons").select("id, name, ends_at").eq("is_current", true).maybeSingle();

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
        <div className="eyebrow text-foret-light">Compétition</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.025em] text-foret">Ligues</h1>
        <p className="mt-1 text-sm text-gris">{season ? `${season.name} — classement` : "Aucune saison en cours"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DIVISIONS.map((d, i) => (
          <span
            key={d}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${
              i >= 4 ? "bg-or text-or-text" : "border border-gris-fin bg-blanc text-gris"
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-gris-fin bg-creme p-6 text-center text-gris">
          Le classement se remplit dès les premières résolutions de marchés.
        </p>
      ) : (
        <ol className="divide-y divide-gris-fin overflow-hidden rounded-lg border border-gris-fin bg-blanc">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className={`w-6 text-center font-extrabold ${i < 3 ? "text-or-text" : "text-gris"}`}>{i + 1}</span>
                {r.profiles ? (
                  <Link href={`/profile/${r.profiles.username}`} className="font-semibold text-charbon hover:text-foret">
                    {r.profiles.display_name ?? r.profiles.username}
                  </Link>
                ) : (
                  <span className="text-gris">?</span>
                )}
                <span className="text-xs text-gris">{r.division}</span>
              </span>
              <span className="font-extrabold text-foret">{r.points} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
