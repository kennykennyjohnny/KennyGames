import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/config";
import { GenerateButton } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

const SYSTEM_ACCOUNT = "00000000-0000-0000-0000-0000000000aa";

type Admin = ReturnType<typeof createAdminClient>;

async function countOf(admin: Admin, table: string, col: string, val: unknown): Promise<number> {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(col, val);
  return count ?? 0;
}

function Card({ label, value, href, accent }: { label: string; value: string; href?: string; accent?: boolean }) {
  const inner = (
    <div className={`rounded-2xl border border-border p-4 ${accent ? "bg-brand-2/10" : "bg-card"}`}>
      <div className="text-2xl font-extrabold text-brand">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminOverview() {
  const admin = createAdminClient();

  const [
    users,
    drafts,
    open,
    closed,
    resolved,
    disputed,
    pendingResolutions,
    openDisputes,
    system,
    openMarkets,
  ] = await Promise.all([
    countOf(admin, "profiles", "is_system", false),
    countOf(admin, "markets", "status", "draft"),
    countOf(admin, "markets", "status", "open"),
    countOf(admin, "markets", "status", "closed"),
    countOf(admin, "markets", "status", "resolved"),
    countOf(admin, "markets", "status", "disputed"),
    countOf(admin, "market_resolutions", "status", "proposed"),
    countOf(admin, "disputes", "status", "open"),
    admin.from("profiles").select("balance").eq("id", SYSTEM_ACCOUNT).maybeSingle(),
    admin.from("markets").select("total_pool").eq("status", "open"),
  ]);

  const rake = system.data?.balance ?? 0;
  const openPool = (openMarkets.data ?? []).reduce((s, m) => s + (m.total_pool ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Vue d&apos;ensemble</h1>

      {/* File d'attente = ce qu'il faut piloter */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted">A traiter</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Resolutions a valider" value={String(pendingResolutions)} href="/admin/resolutions" accent={pendingResolutions > 0} />
          <Card label="Brouillons a publier" value={String(drafts)} href="/admin/markets" accent={drafts > 0} />
          <Card label="Litiges ouverts" value={String(openDisputes)} href="/admin/disputes" accent={openDisputes > 0} />
          <Card label="Marches en litige" value={String(disputed)} href="/admin/disputes" />
        </div>
      </section>

      {/* Sante du site */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted">Etat du site</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Joueurs" value={String(users)} />
          <Card label="Marches ouverts" value={String(open)} href="/admin/markets" />
          <Card label="Marches clos" value={String(closed)} href="/admin/markets" />
          <Card label="Marches resolus" value={String(resolved)} />
          <Card label="Pot en jeu (ouverts)" value={formatCurrency(openPool)} />
          <Card label="Rake collecte (systeme)" value={formatCurrency(rake)} />
        </div>
      </section>

      {/* Outils */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Outils Madame Irma</h2>
        <GenerateButton />
        <p className="mt-2 text-xs text-muted">
          Les marches generes arrivent en brouillon dans l&apos;onglet Marches — a toi de les publier.
        </p>
      </section>
    </div>
  );
}
