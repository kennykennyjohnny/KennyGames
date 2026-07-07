-- =========================================================
-- FIX — recursion infinie RLS sur crew_members (erreur 42P17)
--
-- Les policies de crew_members / crews / markets se referencaient
-- mutuellement en interrogeant crew_members, ce qui declenche la RLS de
-- crew_members... qui interroge crew_members => boucle infinie.
--
-- Solution : router TOUT test d'appartenance a un crew via une fonction
-- SECURITY DEFINER (owner = postgres) qui contourne la RLS et casse la boucle.
-- =========================================================

create or replace function public.is_crew_member(p_crew uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from crew_members where crew_id = p_crew and user_id = p_uid
  );
$$;

-- Les policies s'evaluent avec le role appelant : il lui faut EXECUTE.
-- (La migration RPC a revoque EXECUTE a public/anon ; on re-accorde ici,
--  APRES ce revoke, aux fonctions utilisees dans les policies.)
grant execute on function public.is_crew_member(uuid, uuid) to anon, authenticated;
grant execute on function public.is_staff(uuid)             to authenticated;

-- ---- MARKETS : public, ou membre du crew (via fonction, plus de recursion)
drop policy if exists "markets visible" on markets;
create policy "markets visible" on markets for select
  using (crew_id is null or public.is_crew_member(crew_id, auth.uid()));

-- ---- MARKET_OPTIONS
drop policy if exists "options visible" on market_options;
create policy "options visible" on market_options for select
  using (exists (
    select 1 from markets m
     where m.id = market_options.market_id
       and (m.crew_id is null or public.is_crew_member(m.crew_id, auth.uid()))
  ));

-- ---- MARKET_RESOLUTIONS
drop policy if exists "resolutions visible" on market_resolutions;
create policy "resolutions visible" on market_resolutions for select
  using (exists (
    select 1 from markets m
     where m.id = market_resolutions.market_id
       and (m.crew_id is null or public.is_crew_member(m.crew_id, auth.uid()))
  ));

-- ---- COMMENTS
drop policy if exists "comments visible" on comments;
create policy "comments visible" on comments for select
  using (exists (
    select 1 from markets m
     where m.id = comments.market_id
       and (m.crew_id is null or public.is_crew_member(m.crew_id, auth.uid()))
  ));

-- ---- CREWS
drop policy if exists "crews visible to members" on crews;
create policy "crews visible to members" on crews for select
  using (public.is_crew_member(crews.id, auth.uid()));

-- ---- CREW_MEMBERS (la source de la recursion)
drop policy if exists "crew members visible to members" on crew_members;
create policy "crew members visible to members" on crew_members for select
  using (public.is_crew_member(crew_members.crew_id, auth.uid()));
