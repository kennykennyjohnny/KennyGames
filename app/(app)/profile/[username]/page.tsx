import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/config";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-lg font-extrabold text-brand">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!data) notFound();

  const p = data as Profile;
  const winRate = p.bets_total > 0 ? Math.round((p.bets_won / p.bets_total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-2xl">
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatar_url} alt={p.username} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              "🧑"
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{p.display_name ?? p.username}</h1>
            <p className="text-sm text-muted">@{p.username} · 🏆 {p.division}</p>
          </div>
        </div>
        {p.bio && <p className="mt-3 text-muted">{p.bio}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solde" value={formatCurrency(p.balance)} />
        <Stat label="Paris" value={String(p.bets_total)} />
        <Stat label="Taux de reussite" value={`${winRate}%`} />
        <Stat label="Profit net" value={formatCurrency(p.net_profit)} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
        Plus longue serie : {p.streak_count} jours · Membre depuis{" "}
        {new Date(p.created_at).toLocaleDateString("fr-FR")}
      </div>
    </div>
  );
}
