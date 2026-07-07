import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/config";
import { GenerateButton } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

const SYSTEM_ACCOUNT = "00000000-0000-0000-0000-0000000000aa";
type DB = Awaited<ReturnType<typeof createClient>>;

async function countOf(db: DB, table: string, col: string, val: unknown): Promise<number> {
  const { count } = await db.from(table).select("*", { count: "exact", head: true }).eq(col, val);
  return count ?? 0;
}

function Card({ label, value, href, accent }: { label: string; value: string; href?: string; accent?: boolean }) {
  const inner = (
    <div className={`rounded-lg border p-4 ${accent ? "border-or bg-or-pale" : "border-gris-fin bg-blanc"}`}>
      <div className="text-2xl font-extrabold text-foret">{value}</div>
      <div className="text-sm text-gris">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminOverview() {
  const db = await createClient();

  const [users, drafts, open, closed, resolved, disputed, pendingResolutions, openDisputes, system, openMarkets] =
    await Promise.all([
      countOf(db, "profiles", "is_system", false),
      countOf(db, "markets", "status", "draft"),
      countOf(db, "markets", "status", "open"),
      countOf(db, "markets", "status", "closed"),
      countOf(db, "markets", "status", "resolved"),
      countOf(db, "markets", "status", "disputed"),
      countOf(db, "market_resolutions", "status", "proposed"),
      countOf(db, "disputes", "status", "open"),
      db.from("profiles").select("balance").eq("id", SYSTEM_ACCOUNT).maybeSingle(),
      db.from("markets").select("total_pool").eq("status", "open"),
    ]);

  const rake = system.data?.balance ?? 0;
  const openPool = (openMarkets.data ?? []).reduce((s, m) => s + (m.total_pool ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-foret">Vue d&apos;ensemble</h1>

      <section>
        <div className="eyebrow mb-2 text-foret-light">À traiter</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Résolutions à valider" value={String(pendingResolutions)} href="/admin/resolutions" accent={pendingResolutions > 0} />
          <Card label="Brouillons à publier" value={String(drafts)} href="/admin/markets" accent={drafts > 0} />
          <Card label="Litiges ouverts" value={String(openDisputes)} href="/admin/disputes" accent={openDisputes > 0} />
          <Card label="Marchés en litige" value={String(disputed)} href="/admin/disputes" />
        </div>
      </section>

      <section>
        <div className="eyebrow mb-2 text-foret-light">État du site</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Joueurs" value={String(users)} />
          <Card label="Marchés ouverts" value={String(open)} href="/admin/markets" />
          <Card label="Marchés clos" value={String(closed)} href="/admin/markets" />
          <Card label="Marchés résolus" value={String(resolved)} />
          <Card label="Pot en jeu" value={formatCurrency(openPool)} />
          <Card label="Rake collecté" value={formatCurrency(rake)} />
        </div>
      </section>

      <section className="rounded-lg border border-gris-fin bg-blanc p-4">
        <div className="eyebrow mb-3 text-foret-light">Outils Tata Kenny</div>
        <GenerateButton />
        <p className="mt-2 text-xs text-gris">
          Les marchés générés arrivent en brouillon dans l&apos;onglet Marchés — à toi de les publier. (Nécessite ANTHROPIC_API_KEY.)
        </p>
      </section>
    </div>
  );
}
