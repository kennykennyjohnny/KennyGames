/**
 * Types domaine utilises par le front. Volontairement leger : quand la DB sera
 * en ligne, on generera les types complets via
 *   supabase gen types typescript --project-id <id> > lib/database.types.ts
 * et on branchera le client Supabase dessus. En attendant, ces interfaces
 * couvrent la vertical slice.
 */

export type MarketStatus =
  | "draft" | "open" | "closed" | "resolving" | "resolved" | "cancelled" | "disputed";
export type MarketType = "binary" | "multiple" | "numeric";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  balance: number;
  division: string;
  referral_code: string;
  streak_count: number;
  bets_total: number;
  bets_won: number;
  net_profit: number;
  created_at: string;
}

export interface MarketOption {
  id: string;
  market_id: string;
  label: string;
  color: string | null;
  sort_order: number;
  pool_amount: number;
  is_winner: boolean;
}

export interface Market {
  id: string;
  creator_id: string | null;
  crew_id: string | null;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  type: MarketType;
  status: MarketStatus;
  close_time: string;
  total_pool: number;
  is_ai_generated: boolean;
  resolved_option: string | null;
  image_url: string | null;
  created_at: string;
}

export interface MarketWithOptions extends Market {
  market_options: MarketOption[];
}

export interface Bet {
  id: number;
  user_id: string;
  market_id: string;
  option_id: string;
  amount: number;
  status: "active" | "won" | "lost" | "refunded" | "cashed_out";
  payout_amount: number;
  placed_at: string;
}

/** Cote indicative = pool_total / pool_option (§7). Jamais garantie. */
export function indicativeOdds(totalPool: number, optionPool: number): number | null {
  if (optionPool <= 0) return null;
  return Math.round((totalPool / optionPool) * 100) / 100;
}
