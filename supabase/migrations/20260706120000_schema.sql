-- =========================================================
-- KENNYGAMES — Schema de base (§13)
-- Postgres. Tous les montants de jetons sont en bigint (JAMAIS de float, §16).
-- Enums -> tables -> index. RLS + RPC dans les migrations suivantes.
-- =========================================================

-- =========================================================
-- ENUMS
-- =========================================================
create type market_type       as enum ('binary','multiple','numeric');
create type market_status     as enum ('draft','open','closed','resolving','resolved','cancelled','disputed');
create type resolution_mode   as enum ('ai','admin','creator');
create type resolution_status as enum ('proposed','confirmed','rejected');
create type bet_status        as enum ('active','won','lost','refunded','cashed_out');
create type tx_type           as enum (
  'initial_grant','daily_chest','streak_reward','quest_reward',
  'referral_bonus','bet_placed','bet_payout','rake','refund','purchase','adjustment'
);
create type user_role         as enum ('user','moderator','admin');

-- =========================================================
-- PROFILES (extension de auth.users)
-- =========================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  balance       bigint not null default 0,          -- maintenu par trigger sur transactions
  role          user_role not null default 'user',
  is_system     boolean not null default false,     -- compte systeme (rake/dust/dotations)
  is_premium    boolean not null default false,
  referral_code text unique not null,
  referred_by   uuid references profiles(id),
  referral_rewarded boolean not null default false,  -- anti-farming (§10) : bonus debloque apres activite reelle
  division      text not null default 'Bronze',
  xp            bigint not null default 0,
  streak_count  int not null default 0,
  streak_last   date,
  -- garde-fous compte (§10) : age gate + CGU + throttle pseudo
  age_confirmed     boolean not null default false,
  terms_accepted_at timestamptz,
  username_changed_at timestamptz,
  -- stats denormalisees (recalcul par trigger a la resolution)
  bets_total    int not null default 0,
  bets_won      int not null default 0,
  net_profit    bigint not null default 0,
  created_at    timestamptz not null default now()
);

-- =========================================================
-- TRANSACTIONS (grand livre immuable — source de verite du solde, §6)
-- =========================================================
create table transactions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  type          tx_type not null,
  amount        bigint not null,          -- signe (+ credit / - debit)
  balance_after bigint not null,          -- snapshot apres application
  ref_market    uuid,                     -- FK logique vers markets
  ref_bet       bigint,                   -- FK logique vers bets
  meta          jsonb,
  created_at    timestamptz not null default now()
);

-- =========================================================
-- MARKETS
-- =========================================================
create table markets (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid references profiles(id),
  crew_id            uuid,                 -- null = public
  title              text not null,
  description        text,
  category           text not null,
  tags               text[] not null default '{}',
  type               market_type not null default 'binary',
  status             market_status not null default 'draft',
  resolution_mode    resolution_mode not null default 'admin',
  close_time         timestamptz not null,
  resolved_option    uuid,                 -- FK logique vers market_options
  total_pool         bigint not null default 0,
  is_sponsored       boolean not null default false,
  sponsor_id         uuid,
  is_ai_generated    boolean not null default false,
  counts_for_ranking boolean not null default true,  -- crew prive => false (§10.5)
  image_url          text,
  dispute_deadline   timestamptz,          -- fin de la fenetre de contestation (§8)
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);

create table market_options (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references markets(id) on delete cascade,
  label       text not null,
  color       text,
  sort_order  int not null default 0,
  pool_amount bigint not null default 0,   -- total mise sur cette option
  is_winner   boolean not null default false
);

-- =========================================================
-- BETS
-- =========================================================
create table bets (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles(id) on delete cascade,
  market_id      uuid not null references markets(id) on delete cascade,
  option_id      uuid not null references market_options(id),
  amount         bigint not null check (amount > 0),
  status         bet_status not null default 'active',
  payout_amount  bigint not null default 0,
  placed_at      timestamptz not null default now(),
  resolved_at    timestamptz
);

-- =========================================================
-- RESOLUTION & DISPUTES
-- =========================================================
create table market_resolutions (
  id              bigint generated always as identity primary key,
  market_id       uuid not null references markets(id) on delete cascade,
  proposed_option uuid references market_options(id),
  method          resolution_mode not null,
  status          resolution_status not null default 'proposed',
  source_url      text,
  justification   text,
  resolved_by     uuid references profiles(id),   -- admin/creator, ou null si IA
  created_at      timestamptz not null default now()
);

create table disputes (
  id          bigint generated always as identity primary key,
  market_id   uuid not null references markets(id) on delete cascade,
  user_id     uuid not null references profiles(id),
  reason      text not null,
  source_url  text,
  status      text not null default 'open',   -- open/accepted/rejected
  created_at  timestamptz not null default now()
);

-- =========================================================
-- SOCIAL
-- =========================================================
create table follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references profiles(id),
  invite_code text unique not null,
  created_at  timestamptz not null default now()
);

create table crew_members (
  crew_id   uuid not null references crews(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text not null default 'member',   -- owner/admin/member
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table comments (
  id         bigint generated always as identity primary key,
  market_id  uuid not null references markets(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  parent_id  bigint references comments(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create table reactions (
  id         bigint generated always as identity primary key,
  comment_id bigint references comments(id) on delete cascade,
  market_id  uuid references markets(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- RETENTION : quetes, coffre, ligues, badges, notifs
-- =========================================================
create table quests (
  id          bigint generated always as identity primary key,
  key         text unique not null,
  title       text not null,
  description text,
  reward      bigint not null default 0,
  target      int not null default 1,
  is_active   boolean not null default true
);

create table user_quests (
  user_id      uuid not null references profiles(id) on delete cascade,
  quest_id     bigint not null references quests(id) on delete cascade,
  progress     int not null default 0,
  completed_at timestamptz,
  claimed_at   timestamptz,
  period_day   date not null default current_date,  -- pour quetes quotidiennes
  primary key (user_id, quest_id, period_day)
);

create table daily_claims (
  user_id  uuid not null references profiles(id) on delete cascade,
  day      date not null default current_date,
  kind     text not null,           -- 'chest' | 'streak'
  amount   bigint not null,
  primary key (user_id, day, kind)  -- idempotence anti double-claim (§9)
);

create table seasons (
  id         bigint generated always as identity primary key,
  name       text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  is_current boolean not null default false
);

create table league_standings (
  season_id  bigint not null references seasons(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  division   text not null default 'Bronze',
  points     bigint not null default 0,
  primary key (season_id, user_id)
);

create table badges (
  id          bigint generated always as identity primary key,
  key         text unique not null,
  title       text not null,
  description text,
  icon        text
);

create table user_badges (
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_id   bigint not null references badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- MONETISATION (V2, mais tables pretes)
-- =========================================================
create table purchases (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  stripe_id     text unique,
  jetons_amount bigint not null,
  price_cents   int not null,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create table config (
  key   text primary key,
  value jsonb not null
);

-- =========================================================
-- INDEX utiles
-- =========================================================
create index markets_status_close_idx    on markets (status, close_time);
create index markets_category_idx        on markets (category);
create index markets_crew_idx            on markets (crew_id);
create index bets_user_idx               on bets (user_id);
create index bets_market_idx             on bets (market_id);
create index bets_market_option_idx      on bets (market_id, option_id);
create index transactions_user_idx       on transactions (user_id, created_at desc);
create index market_options_market_idx   on market_options (market_id);
create index comments_market_idx         on comments (market_id);
create index notifications_user_read_idx on notifications (user_id, read_at);
create index crew_members_user_idx       on crew_members (user_id);
