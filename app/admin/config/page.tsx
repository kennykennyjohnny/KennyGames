import { createAdminClient } from "@/lib/supabase/admin";
import { ConfigEditor } from "@/components/admin/actions";

export const dynamic = "force-dynamic";

// Cles connues avec valeur par defaut si absente en base (§6).
const KNOWN: { key: string; def: unknown; help: string }[] = [
  { key: "rake_bps", def: 400, help: "Rake maison en basis points (400 = 4%) — le regulateur anti-inflation" },
  { key: "initial_grant", def: 1000, help: "Dotation initiale a l'inscription" },
  { key: "daily_chest_amount", def: 100, help: "Coffre journalier / base du streak" },
  { key: "market_creation_cost", def: 50, help: "Cout de creation d'un marche (sink anti-spam)" },
  { key: "ai_auto_resolve", def: false, help: "Si true, Madame Irma resout automatiquement (sinon : tu valides)" },
  { key: "currency_name", def: "Pepites", help: "Nom d'affichage de la monnaie" },
  { key: "app_name", def: "KennyGames", help: "Nom d'affichage de l'app" },
];

export default async function AdminConfig() {
  const admin = createAdminClient();
  const { data } = await admin.from("config").select("key, value");
  const existing = new Map((data ?? []).map((r) => [r.key, r.value]));

  const entries = KNOWN.map((k) => ({
    key: k.key,
    value: existing.has(k.key) ? existing.get(k.key) : k.def,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Config economie</h1>
        <p className="text-sm text-muted">
          Modifiable en direct, sans redeploiement. La table <code>config</code> est la
          source de verite pour les calculs serveur (le rake, notamment).
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <ConfigEditor entries={entries} />
      </div>

      <ul className="space-y-1 text-xs text-muted">
        {KNOWN.map((k) => (
          <li key={k.key}>
            <b className="font-mono">{k.key}</b> — {k.help}
          </li>
        ))}
      </ul>
    </div>
  );
}
