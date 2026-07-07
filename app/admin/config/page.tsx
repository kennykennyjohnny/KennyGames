import { createClient } from "@/lib/supabase/server";
import { ConfigEditor } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

const KNOWN: { key: string; def: unknown; help: string }[] = [
  { key: "rake_bps", def: 400, help: "Rake maison en basis points (400 = 4%) — régulateur anti-inflation" },
  { key: "initial_grant", def: 1000, help: "Dotation initiale à l'inscription" },
  { key: "daily_chest_amount", def: 100, help: "Coffre journalier / base du streak" },
  { key: "market_creation_cost", def: 50, help: "Coût de création d'un marché (sink anti-spam)" },
  { key: "ai_auto_resolve", def: false, help: "Si true, Tata Kenny résout automatiquement (sinon : tu valides)" },
  { key: "currency_name", def: "Pépites", help: "Nom d'affichage de la monnaie" },
  { key: "app_name", def: "KennyGames", help: "Nom d'affichage de l'app" },
];

export default async function AdminConfig() {
  const db = await createClient();
  const { data } = await db.from("config").select("key, value");
  const existing = new Map((data ?? []).map((r) => [r.key, r.value]));
  const entries = KNOWN.map((k) => ({ key: k.key, value: existing.has(k.key) ? existing.get(k.key) : k.def }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-foret">Config économie</h1>
        <p className="text-sm text-gris">
          Modifiable en direct, sans redéploiement. La table <code>config</code> est la source de vérité pour les
          calculs serveur (le rake, notamment).
        </p>
      </div>

      <div className="rounded-lg border border-gris-fin bg-blanc p-4">
        <ConfigEditor entries={entries} />
      </div>

      <ul className="space-y-1 text-xs text-gris">
        {KNOWN.map((k) => (
          <li key={k.key}>
            <b className="font-mono text-foret">{k.key}</b> — {k.help}
          </li>
        ))}
      </ul>
    </div>
  );
}
