/**
 * Config produit centralisee.
 *
 * Regle (§16) : le nom de l'app et de la monnaie ne sont JAMAIS ecrits en dur
 * ailleurs qu'ici. "KennyGames" / "Pepites" sont des placeholders : le vrai nom
 * sortira du mockup. On change la valeur ici (ou via env), pas dans 50 fichiers.
 *
 * Attention : les constantes economiques ci-dessous (rake, dotation...) servent
 * a l'AFFICHAGE et aux valeurs par defaut cote client. La SOURCE DE VERITE pour
 * les calculs d'argent est la table `config` en base, lue par les RPC serveur
 * (§6, §9). Ne jamais calculer un payout cote client a partir de ces valeurs.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "KennyGames";
export const CURRENCY_NAME = process.env.NEXT_PUBLIC_CURRENCY_NAME ?? "Pépites";
/** Mascotte / voyante maison (§2). Décidée : "Tata Kenny". */
export const MASCOT_NAME = process.env.NEXT_PUBLIC_MASCOT_NAME ?? "Tata Kenny";

/** Basis points (1% = 100 bps). Affichage uniquement — le serveur relit la DB. */
export const RAKE_BPS_DISPLAY = Number(process.env.RAKE_BPS ?? "400");

export const INITIAL_GRANT = Number(process.env.INITIAL_GRANT ?? "1000");
export const DAILY_CHEST_AMOUNT = Number(process.env.DAILY_CHEST_AMOUNT ?? "100");
export const MARKET_CREATION_COST = Number(process.env.MARKET_CREATION_COST ?? "50");

/** Categories de marches du MVP (§1). */
export const MARKET_CATEGORIES = [
  "Telerealite",
  "Politique",
  "Musique",
  "Sport",
  "Buzz / Internet",
  "Actu",
  "Entre potes",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

/** Divisions de ligue, du plus bas au plus haut (§3). */
export const DIVISIONS = [
  "Bronze",
  "Argent",
  "Or",
  "Platine",
  "Diamant",
  "Maitres",
] as const;

/** Formate un montant de jetons pour l'affichage : "1 200 Pepites". */
export function formatCurrency(amount: number | bigint): string {
  const n = typeof amount === "bigint" ? amount : Math.trunc(amount);
  const grouped = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} ${CURRENCY_NAME}`;
}
