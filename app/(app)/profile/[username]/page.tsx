import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/config";
import { TataKenny } from "@/components/TataKenny";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BetRow {
  id: number;
  amount: number;
  status: string;
  payout_amount: number;
  placed_at: string;
  markets: { title: string; id: string } | null;
  market_options: { label: string } | null;
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 text-center ${gold ? "border-or bg-or-pale" : "border-gris-fin bg-blanc"}`}>
      <div className={`text-xl font-extrabold ${gold ? "text-or-text" : "text-foret"}`}>{value}</div>
      <div className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-gris">{label}</div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!data) notFound();
  const p = data as Profile;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isMe = user?.id === p.id;

  // Positions : uniquement sur son propre profil (RLS : chacun voit ses paris).
  let bets: BetRow[] = [];
  if (isMe) {
    const { data: b } = await supabase
      .from("bets")
      .select("id, amount, status, payout_amount, placed_at, markets(title, id), market_options(label)")
      .eq("user_id", p.id)
      .order("placed_at", { ascending: false })
      .limit(50);
    bets = (b ?? []) as unknown as BetRow[];
  }

  const active = bets.filter((b) => b.status === "active");
  const settled = bets.filter((b) => b.status !== "active");
  const winRate = p.bets_total > 0 ? Math.round((p.bets_won / p.bets_total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-lg border border-gris-fin bg-foret p-6 text-creme">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-foret bg-foret-mid">
            <TataKenny size={52} halo={false} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{p.display_name ?? p.username}</h1>
            <p className="text-sm text-creme/60">
              @{p.username} · <span className="text-or">🏆 {p.division}</span>
            </p>
          </div>
        </div>
        {p.bio && <p className="mt-3 text-sm font-light text-creme/70">{p.bio}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solde" value={formatCurrency(p.balance)} gold />
        <Stat label="Paris" value={String(p.bets_total)} />
        <Stat label="Réussite" value={`${winRate}%`} />
        <Stat label="Profit net" value={formatCurrency(p.net_profit)} />
      </div>

      {isMe && (
        <>
          {/* Positions en cours */}
          <section>
            <div className="eyebrow mb-3 text-foret-light">Paris en cours</div>
            {active.length === 0 ? (
              <p className="rounded-lg border border-gris-fin bg-creme p-5 text-center text-sm text-gris">
                Aucun pari en cours. <Link href="/feed" className="font-semibold text-foret underline">Va parier →</Link>
              </p>
            ) : (
              <div className="grid gap-2">
                {active.map((b) => (
                  <Link
                    key={b.id}
                    href={b.markets ? `/m/${b.markets.id}` : "#"}
                    className="flex items-center justify-between rounded-lg border border-gris-fin bg-blanc px-4 py-3 transition hover:border-foret-light"
                  >
                    <div>
                      <div className="font-semibold text-charbon">{b.markets?.title ?? "Marché"}</div>
                      <div className="text-xs text-gris">Sur : {b.market_options?.label ?? "?"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-foret">{formatCurrency(b.amount)}</div>
                      <div className="text-[0.6rem] uppercase tracking-[0.1em] text-foret-light">en cours</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Historique */}
          {settled.length > 0 && (
            <section>
              <div className="eyebrow mb-3 text-foret-light">Historique</div>
              <div className="overflow-hidden rounded-lg border border-gris-fin bg-blanc">
                {settled.map((b) => {
                  const won = b.status === "won";
                  const refunded = b.status === "refunded";
                  return (
                    <div key={b.id} className="flex items-center justify-between border-b border-gris-fin px-4 py-3 last:border-b-0">
                      <div>
                        <div className="text-sm font-semibold text-charbon">{b.markets?.title ?? "Marché"}</div>
                        <div className="text-xs text-gris">
                          {formatCurrency(b.amount)} sur {b.market_options?.label ?? "?"}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          won ? "bg-success/15 text-success" : refunded ? "bg-gris-fin text-gris" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {won ? `+${formatCurrency(b.payout_amount)}` : refunded ? "remboursé" : "perdu"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-center text-xs text-gris">
        Série : {p.streak_count} jours · Membre depuis {new Date(p.created_at).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}
