# KENNYGAMES (nom provisoire)

> Parie sur tout. Sauf ton fric.

Jeu de prédiction social français, **gratuit, à monnaie fictive** (parimutuel).
Next.js 16 + Supabase (Postgres/Auth/Realtime/RLS) + Tata Kenny (Claude API).

Le nom `KENNYGAMES` et la monnaie `Pépites` sont des **placeholders** : décision au
mockup. Ils vivent en config (`lib/config.ts` / env `NEXT_PUBLIC_APP_NAME`,
`NEXT_PUBLIC_CURRENCY_NAME`), jamais en dur ailleurs.

## 3 règles non négociables
1. **L'argent (fictif) ne se touche jamais côté client.** Tout mouvement passe par des
   fonctions Postgres `SECURITY DEFINER` (`place_bet`, `resolve_market`, claims…). Le
   client n'a aucun droit d'écriture sur `balance`/`transactions`/`bets`/pools (grants
   colonne + RLS). Voir `supabase/migrations/*_rls_triggers.sql` et `*_rpc.sql`.
2. **Zéro secret dans le repo.** `.gitignore` blindé ; `service_role` et
   `ANTHROPIC_API_KEY` = serveur uniquement. Copier `.env.example` → `.env.local`.
3. **Tata Kenny propose, le système exécute.** L'IA ne fait que renvoyer du JSON +
   source ; les payouts sont calculés par `resolve_market()`.

## Démarrer en local
```bash
cp .env.example .env.local      # puis remplir les valeurs Supabase/Anthropic
npm install
npm run dev                     # http://localhost:3000
```

### Base de données (Supabase)
Le schéma, la sécurité et les RPC sont dans `supabase/`. Deux façons de les appliquer :
- **Supabase local** (nécessite Docker) : `npx supabase start` puis `npx supabase db reset`
  (joue migrations + `seed.sql`).
- **Projet Supabase managé** : lier le projet (`npx supabase link`) puis
  `npx supabase db push`, et exécuter `seed.sql` une fois.

Après connexion, générer les types : `npx supabase gen types typescript --linked > lib/database.types.ts`.

## Économie (configurable sans redéploiement)
Table `config` = source de vérité : `rake_bps` (4 %, le régulateur anti-inflation),
`initial_grant`, `daily_chest_amount`, `market_creation_cost`. Modifiable en base.

## Tata Kenny (cron)
Routes serveur protégées par `CRON_SECRET`, planifiées dans `vercel.json` :
- `close-markets` (quotidien) → ferme les marchés échus + fenêtre de contestation
- `generate-markets` (quotidien) → marchés `draft` à valider par un admin
- `resolve-markets` (quotidien) → Tata Kenny **propose** les résultats (source), l'admin valide

> Vercel Hobby limite les crons à 1×/jour. Pour des passages plus fréquents : Vercel Pro,
> ou un planificateur externe (cron-job.org) appelant ces routes avec le `CRON_SECRET`.

Persona éditable dans `prompts/tata-kenny.md` (versionnée, sans toucher au code).

## Structure
```
app/            # Next App Router (feed, m/[id], onboarding, crews, leagues, profile, api/cron)
components/      # BetPanel (realtime), MarketCard, TopBar, DailyChest, CrewActions
lib/            # config, supabase (client/server/admin), madame-irma, types, format
supabase/       # migrations (schema, rls+triggers, rpc) + seed
```

Jetons = `bigint` (jamais de float). Le solde est dérivé d'un **ledger immuable**
(`transactions`) par trigger — on n'écrit jamais un solde à la main.
