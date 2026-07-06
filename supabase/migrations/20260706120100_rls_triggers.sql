-- =========================================================
-- KENNYGAMES — Integrite du solde, grants, RLS (§9, §14)
--
-- Principe (regle d'or) : le client LIT ce qui le concerne, mais n'ECRIT
-- JAMAIS l'argent. On l'applique a DEUX niveaux, defense en profondeur :
--   1) Privileges colonne/table  : le client n'a aucun GRANT d'ecriture sur
--      les tables d'argent, et ne peut modifier sur `profiles` que des
--      colonnes cosmetiques. `balance`/`role`/`is_system` sont physiquement
--      non-ecrivables => "permission denied for column".
--   2) RLS                       : filtre les LIGNES lisibles.
-- Les fonctions SECURITY DEFINER (owner = postgres) contournent les deux et
-- sont donc l'unique chemin d'ecriture de l'argent.
-- =========================================================

-- ---------------------------------------------------------
-- Le solde EST le ledger : trigger qui propage balance_after -> profiles.balance
-- (source de verite = table transactions, §6). Aucun autre chemin ne doit
-- toucher profiles.balance.
-- ---------------------------------------------------------
create or replace function apply_balance_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
     set balance = new.balance_after
   where id = new.user_id;
  return new;
end;
$$;

create trigger trg_apply_balance_after
  after insert on transactions
  for each row execute function apply_balance_after();

-- Le ledger est immuable : pas d'UPDATE / DELETE, meme cote serveur applicatif.
create or replace function forbid_tx_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'transactions est un grand livre immuable (append-only)';
end;
$$;

create trigger trg_forbid_tx_update
  before update or delete on transactions
  for each row execute function forbid_tx_mutation();

-- ---------------------------------------------------------
-- Helper : l'appelant est-il admin/moderateur ? (SECURITY DEFINER pour ne pas
-- dependre de la RLS de profiles et eviter la recursion dans les policies)
-- ---------------------------------------------------------
create or replace function is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
     where id = uid and role in ('admin','moderator')
  );
$$;

-- =========================================================
-- GRANTS — on part d'une table verrouillee puis on ouvre au strict minimum.
-- =========================================================

-- ---- PROFILES : lecture publique, ecriture limitee aux colonnes cosmetiques
revoke all on profiles from anon, authenticated;
grant select on profiles to anon, authenticated;
grant update (display_name, avatar_url, bio) on profiles to authenticated;
-- (balance, role, is_system, username, referral_code... : jamais ecrivables client)

-- ---- ARGENT : lecture seule cote client, aucune ecriture directe
revoke all on transactions      from anon, authenticated;
revoke all on bets              from anon, authenticated;
revoke all on market_options    from anon, authenticated;
revoke all on markets           from anon, authenticated;
revoke all on market_resolutions from anon, authenticated;
revoke all on league_standings  from anon, authenticated;
revoke all on user_quests       from anon, authenticated;
revoke all on daily_claims      from anon, authenticated;
revoke all on user_badges       from anon, authenticated;
revoke all on purchases         from anon, authenticated;
revoke all on disputes          from anon, authenticated;
revoke all on notifications     from anon, authenticated;

grant select on transactions       to authenticated;
grant select on bets               to authenticated;
grant select on market_options     to anon, authenticated;
grant select on markets            to anon, authenticated;
grant select on market_resolutions to anon, authenticated;
grant select on league_standings   to anon, authenticated;
grant select on user_quests        to authenticated;
grant select on daily_claims       to authenticated;
grant select on user_badges        to anon, authenticated;
grant select on purchases          to authenticated;
grant select on disputes           to authenticated;
grant select on notifications      to authenticated;

-- ---- Referentiels publics (lecture libre, ecriture serveur/admin)
revoke all on config   from anon, authenticated;
revoke all on quests   from anon, authenticated;
revoke all on badges   from anon, authenticated;
revoke all on seasons  from anon, authenticated;
grant select on config  to anon, authenticated;
grant select on quests  to anon, authenticated;
grant select on badges  to anon, authenticated;
grant select on seasons to anon, authenticated;

-- ---- SOCIAL : ecriture directe toleree (pas d'argent), gardee par RLS
revoke all on follows      from anon, authenticated;
revoke all on comments     from anon, authenticated;
revoke all on reactions    from anon, authenticated;
revoke all on crews        from anon, authenticated;
revoke all on crew_members from anon, authenticated;
grant select, insert, delete on follows   to authenticated;
grant select, insert, delete on reactions to authenticated;
grant select, insert on comments          to authenticated;
grant select on crews        to anon, authenticated;
grant select on crew_members to authenticated;
-- crews / crew_members : creation et adhesion via RPC (generation invite_code)

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles           enable row level security;
alter table transactions       enable row level security;
alter table bets               enable row level security;
alter table markets            enable row level security;
alter table market_options     enable row level security;
alter table market_resolutions enable row level security;
alter table disputes           enable row level security;
alter table follows            enable row level security;
alter table crews              enable row level security;
alter table crew_members       enable row level security;
alter table comments           enable row level security;
alter table reactions          enable row level security;
alter table user_quests        enable row level security;
alter table daily_claims       enable row level security;
alter table user_badges        enable row level security;
alter table league_standings   enable row level security;
alter table notifications      enable row level security;
alter table purchases          enable row level security;
alter table config             enable row level security;
alter table quests             enable row level security;
alter table badges             enable row level security;
alter table seasons            enable row level security;

-- ---- PROFILES : profils publics en lecture ; MAJ de sa propre ligne seulement
create policy "profiles public read" on profiles
  for select using (true);
create policy "update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- LEDGER & BETS : chacun voit uniquement ce qui le concerne
create policy "read own tx" on transactions
  for select using (auth.uid() = user_id);
create policy "read own bets" on bets
  for select using (auth.uid() = user_id);

-- ---- MARKETS : publics lisibles par tous ; marches de crew reserves aux membres
create policy "markets visible" on markets
  for select using (
    crew_id is null
    or exists (
      select 1 from crew_members cm
       where cm.crew_id = markets.crew_id and cm.user_id = auth.uid()
    )
  );

-- Options / resolutions visibles ssi le marche parent l'est
create policy "options visible" on market_options
  for select using (
    exists (
      select 1 from markets m
       where m.id = market_options.market_id
         and (m.crew_id is null or exists (
           select 1 from crew_members cm
            where cm.crew_id = m.crew_id and cm.user_id = auth.uid()))
    )
  );
create policy "resolutions visible" on market_resolutions
  for select using (
    exists (
      select 1 from markets m
       where m.id = market_resolutions.market_id
         and (m.crew_id is null or exists (
           select 1 from crew_members cm
            where cm.crew_id = m.crew_id and cm.user_id = auth.uid()))
    )
  );

-- ---- DISPUTES : l'auteur ou le staff
create policy "disputes visible" on disputes
  for select using (auth.uid() = user_id or is_staff(auth.uid()));

-- ---- SOCIAL
create policy "follows public read" on follows
  for select using (true);
create policy "insert own follow" on follows
  for insert with check (auth.uid() = follower_id);
create policy "delete own follow" on follows
  for delete using (auth.uid() = follower_id);

create policy "comments visible" on comments
  for select using (
    exists (
      select 1 from markets m
       where m.id = comments.market_id
         and (m.crew_id is null or exists (
           select 1 from crew_members cm
            where cm.crew_id = m.crew_id and cm.user_id = auth.uid()))
    )
  );
create policy "insert own comment" on comments
  for insert with check (auth.uid() = user_id);

create policy "reactions public read" on reactions
  for select using (true);
create policy "insert own reaction" on reactions
  for insert with check (auth.uid() = user_id);
create policy "delete own reaction" on reactions
  for delete using (auth.uid() = user_id);

-- ---- CREWS : membres voient leur crew ; adhesion/creation via RPC
create policy "crews visible to members" on crews
  for select using (
    exists (
      select 1 from crew_members cm
       where cm.crew_id = crews.id and cm.user_id = auth.uid()
    )
  );
create policy "crew members visible to members" on crew_members
  for select using (
    exists (
      select 1 from crew_members me
       where me.crew_id = crew_members.crew_id and me.user_id = auth.uid()
    )
  );

-- ---- RETENTION / NOTIFS / ACHATS : chacun ses lignes
create policy "read own quests" on user_quests
  for select using (auth.uid() = user_id);
create policy "read own claims" on daily_claims
  for select using (auth.uid() = user_id);
create policy "user badges public read" on user_badges
  for select using (true);
create policy "standings public read" on league_standings
  for select using (true);
create policy "read own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "read own purchases" on purchases
  for select using (auth.uid() = user_id);

-- ---- REFERENTIELS PUBLICS
create policy "config public read" on config
  for select using (true);
create policy "quests public read" on quests
  for select using (is_active);
create policy "badges public read" on badges
  for select using (true);
create policy "seasons public read" on seasons
  for select using (true);
