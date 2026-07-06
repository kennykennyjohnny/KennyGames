-- =========================================================
-- KENNYGAMES — Fonctions RPC (§7, §9, §14)
--
-- TOUTE la logique argent vit ici, en SECURITY DEFINER (owner = postgres),
-- seul chemin autorise pour ecrire soldes / paris / pools / resolution.
-- Le client n'appelle QUE ces fonctions ; chacune revalide tout.
-- Jetons = bigint, arithmetique entiere partout (§16).
-- =========================================================

-- ---------------------------------------------------------
-- Helpers de config (source de verite = table config, modifiable sans deploy)
-- ---------------------------------------------------------
create or replace function _cfg_int(p_key text, p_default bigint)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::bigint from config where key = p_key), p_default);
$$;

create or replace function _system_account()
returns uuid language sql stable security definer set search_path = public as $$
  select id from profiles where is_system order by created_at limit 1;
$$;

-- Genere un code alphanumerique lisible (sans 0/O/1/I) de longueur p_len.
create or replace function _gen_code(p_len int default 8)
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..p_len loop
    out := out || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;
  return out;
end;
$$;

-- ---------------------------------------------------------
-- _apply_tx : ECRITURE UNIQUE du ledger. Verrouille le profil, calcule le
-- balance_after, insere la transaction (le trigger propage vers profiles.balance).
-- INTERNE : jamais expose au client.
-- ---------------------------------------------------------
create or replace function _apply_tx(
  p_user uuid, p_type tx_type, p_amount bigint,
  p_ref_market uuid default null, p_ref_bet bigint default null, p_meta jsonb default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
  v_tx_id   bigint;
begin
  select balance into v_balance from profiles where id = p_user for update;
  if v_balance is null then
    raise exception 'profil introuvable: %', p_user;
  end if;

  v_balance := v_balance + p_amount;
  if v_balance < 0 then
    raise exception 'solde insuffisant' using errcode = 'check_violation';
  end if;

  insert into transactions(user_id, type, amount, balance_after, ref_market, ref_bet, meta)
  values (p_user, p_type, p_amount, v_balance, p_ref_market, p_ref_bet, p_meta)
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- =========================================================
-- ONBOARDING — cree le profil + dotation initiale (§4.1)
-- =========================================================
create or replace function complete_onboarding(
  p_username text,
  p_avatar_url text default null,
  p_referral_code text default null,
  p_accept_terms boolean default false,
  p_age_confirmed boolean default false
) returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_grant bigint := _cfg_int('initial_grant', 1000);
  v_ref uuid;
  v_code text;
  v_profile profiles;
begin
  if v_uid is null then
    raise exception 'non authentifie';
  end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'profil deja cree';
  end if;
  if not p_accept_terms or not p_age_confirmed then
    raise exception 'CGU et age doivent etre valides (§10)';
  end if;

  -- Pseudo : format + unicite (l'unicite est aussi garantie par contrainte DB)
  p_username := trim(p_username);
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'pseudo invalide (3-20 caracteres alphanumeriques ou _)';
  end if;

  -- Lien de parrainage (le bonus est verse plus tard, apres activite reelle §10)
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_ref from profiles where referral_code = upper(trim(p_referral_code));
    if v_ref = v_uid then v_ref := null; end if;  -- pas d'auto-parrainage
  end if;

  -- Code de parrainage unique pour ce nouvel utilisateur
  loop
    v_code := _gen_code(8);
    exit when not exists (select 1 from profiles where referral_code = v_code);
  end loop;

  insert into profiles (id, username, avatar_url, referral_code, referred_by,
                        age_confirmed, terms_accepted_at)
  values (v_uid, p_username, p_avatar_url, v_code, v_ref, true, now())
  returning * into v_profile;

  -- Dotation initiale
  perform _apply_tx(v_uid, 'initial_grant', v_grant, null, null,
                    jsonb_build_object('reason','onboarding'));

  select * into v_profile from profiles where id = v_uid;
  return v_profile;
end;
$$;

-- =========================================================
-- PLACE_BET — le coeur (§7, §14). Transaction atomique.
-- =========================================================
create or replace function place_bet(
  p_market uuid, p_option uuid, p_amount bigint
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_market markets;
  v_bet_id bigint;
  v_opts jsonb;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'montant invalide'; end if;

  -- Verrou du marche : serialise les paris => integrite des pools
  select * into v_market from markets where id = p_market for update;
  if v_market.id is null then raise exception 'marche introuvable'; end if;
  if v_market.status <> 'open' then raise exception 'marche non ouvert'; end if;
  if v_market.close_time <= now() then raise exception 'marche cloture'; end if;

  -- Option valide et rattachee au marche
  if not exists (select 1 from market_options where id = p_option and market_id = p_market) then
    raise exception 'option invalide pour ce marche';
  end if;

  -- Marche de crew : reserve aux membres
  if v_market.crew_id is not null and not exists (
    select 1 from crew_members where crew_id = v_market.crew_id and user_id = v_uid
  ) then
    raise exception 'reserve aux membres du crew';
  end if;

  -- 1) inserer le pari d'abord (pour avoir l'id), 2) debiter (verifie le solde).
  -- Si solde insuffisant, _apply_tx leve et TOUT est annule (atomique).
  insert into bets (user_id, market_id, option_id, amount, status)
  values (v_uid, p_market, p_option, p_amount, 'active')
  returning id into v_bet_id;

  perform _apply_tx(v_uid, 'bet_placed', -p_amount, p_market, v_bet_id,
                    jsonb_build_object('option', p_option));

  -- Mise a jour des pools + stat
  update market_options set pool_amount = pool_amount + p_amount where id = p_option;
  update markets set total_pool = total_pool + p_amount where id = p_market;
  update profiles set bets_total = bets_total + 1 where id = v_uid;

  -- Cotes indicatives a jour (indicatives : bougent jusqu'a la cloture)
  select jsonb_agg(jsonb_build_object(
           'option_id', o.id,
           'label', o.label,
           'pool', o.pool_amount,
           'odds', case when o.pool_amount > 0
                        then round((m.total_pool::numeric / o.pool_amount), 2)
                        else null end
         ) order by o.sort_order)
    into v_opts
  from market_options o join markets m on m.id = o.market_id
  where o.market_id = p_market;

  return jsonb_build_object(
    'bet_id', v_bet_id,
    'balance', (select balance from profiles where id = v_uid),
    'total_pool', (select total_pool from markets where id = p_market),
    'options', v_opts
  );
end;
$$;

-- =========================================================
-- RESOLVE_MARKET — parimutuel + rake + dust + cas limites (§7)
-- =========================================================
create or replace function resolve_market(
  p_market uuid, p_winning_option uuid,
  p_source text default null, p_justification text default null, p_by uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_market markets;
  v_rake_bps bigint := _cfg_int('rake_bps', 400);
  v_total bigint;
  v_pool_w bigint;
  v_rake bigint;
  v_net bigint;
  v_sum_payout bigint := 0;
  v_dust bigint;
  v_sys uuid := _system_account();
  b record;
  v_payout bigint;
  v_winners int := 0;
begin
  -- Verrou marche
  select * into v_market from markets where id = p_market for update;
  if v_market.id is null then raise exception 'marche introuvable'; end if;
  if v_market.status in ('resolved','cancelled') then
    raise exception 'marche deja termine';
  end if;

  -- Autorisation :
  --  - appel serveur (cron/edge en service_role) : auth.uid() null => autorise
  --  - staff (admin/moderateur) : autorise
  --  - createur d'un marche crew en mode 'creator' : autorise
  if v_uid is not null then
    if not is_staff(v_uid) then
      if not (v_market.resolution_mode = 'creator' and v_market.creator_id = v_uid) then
        raise exception 'non autorise a resoudre ce marche';
      end if;
    end if;
  end if;

  -- Gel si dispute ouverte sur un marche non-crew, sauf staff (§8)
  if v_market.crew_id is null
     and exists (select 1 from disputes where market_id = p_market and status = 'open')
     and (v_uid is not null and not is_staff(v_uid)) then
    raise exception 'dispute ouverte : resolution gelee';
  end if;

  if not exists (select 1 from market_options where id = p_winning_option and market_id = p_market) then
    raise exception 'option gagnante invalide';
  end if;

  v_total := v_market.total_pool;
  select pool_amount into v_pool_w from market_options where id = p_winning_option;

  -- Marquer l'option gagnante
  update market_options set is_winner = (id = p_winning_option) where market_id = p_market;

  -- CAS 1 : aucun pari => rien a distribuer
  if v_total = 0 then
    update markets set status = 'resolved', resolved_option = p_winning_option, resolved_at = now()
     where id = p_market;

  -- CAS 2 : personne n'a mise sur l'option gagnante => remboursement integral, pas de rake (§7)
  elsif v_pool_w = 0 then
    for b in select * from bets where market_id = p_market and status = 'active' loop
      perform _apply_tx(b.user_id, 'refund', b.amount, p_market, b.id,
                        jsonb_build_object('reason','no_winner'));
      update bets set status = 'refunded', payout_amount = b.amount, resolved_at = now()
       where id = b.id;
    end loop;
    update markets set status = 'resolved', resolved_option = p_winning_option, resolved_at = now()
     where id = p_market;

  -- CAS 3 : distribution parimutuelle normale
  else
    v_rake := (v_total * v_rake_bps) / 10000;   -- floor (entiers)
    v_net  := v_total - v_rake;

    for b in select * from bets where market_id = p_market and status = 'active' loop
      if b.option_id = p_winning_option then
        v_payout := (b.amount * v_net) / v_pool_w;         -- floor
        v_sum_payout := v_sum_payout + v_payout;
        v_winners := v_winners + 1;
        perform _apply_tx(b.user_id, 'bet_payout', v_payout, p_market, b.id, null);
        update bets set status = 'won', payout_amount = v_payout, resolved_at = now()
         where id = b.id;
        -- stats gagnant
        update profiles set bets_won = bets_won + 1,
                            net_profit = net_profit + (v_payout - b.amount)
         where id = b.user_id;
      else
        update bets set status = 'lost', payout_amount = 0, resolved_at = now()
         where id = b.id;
        update profiles set net_profit = net_profit - b.amount where id = b.user_id;
      end if;
    end loop;

    -- Rake maison -> compte systeme (sort de l'economie des joueurs, §6)
    if v_rake > 0 and v_sys is not null then
      perform _apply_tx(v_sys, 'rake', v_rake, p_market, null,
                        jsonb_build_object('market', p_market));
    end if;

    -- Dust (reste des arrondis) -> compte systeme, regle deterministe (§7)
    v_dust := v_net - v_sum_payout;
    if v_dust > 0 and v_sys is not null then
      perform _apply_tx(v_sys, 'adjustment', v_dust, p_market, null,
                        jsonb_build_object('reason','dust'));
    end if;

    update markets set status = 'resolved', resolved_option = p_winning_option, resolved_at = now()
     where id = p_market;
  end if;

  -- Trace de resolution (preuve : source + justif, §8)
  insert into market_resolutions (market_id, proposed_option, method, status, source_url, justification, resolved_by)
  values (p_market, p_winning_option,
          coalesce(v_market.resolution_mode, 'admin'), 'confirmed',
          p_source, p_justification, coalesce(v_uid, p_by));

  -- Points de ligue (saison courante) + notifications aux parieurs
  update league_standings ls
     set points = ls.points + b.gain
    from (
      select user_id, greatest(sum(payout_amount) - sum(amount), 0) as gain
        from bets where market_id = p_market group by user_id
    ) b,
    (select id from seasons where is_current limit 1) s
   where ls.user_id = b.user_id and ls.season_id = s.id;

  insert into notifications (user_id, type, payload)
  select b.user_id, 'market_resolved',
         jsonb_build_object('market', p_market, 'status', b.status, 'payout', b.payout_amount)
    from bets b where b.market_id = p_market;

  return jsonb_build_object(
    'market', p_market, 'winning_option', p_winning_option,
    'total_pool', v_total, 'rake', coalesce(v_rake,0),
    'net_pool', coalesce(v_net,0), 'winners', v_winners
  );
end;
$$;

-- =========================================================
-- CANCEL_MARKET — annulation : remboursement integral, aucun rake (§7)
-- =========================================================
create or replace function cancel_market(p_market uuid, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_market markets;
  b record;
begin
  select * into v_market from markets where id = p_market for update;
  if v_market.id is null then raise exception 'marche introuvable'; end if;
  if v_market.status in ('resolved','cancelled') then raise exception 'marche deja termine'; end if;
  if v_uid is not null and not is_staff(v_uid)
     and not (v_market.resolution_mode = 'creator' and v_market.creator_id = v_uid) then
    raise exception 'non autorise';
  end if;

  for b in select * from bets where market_id = p_market and status = 'active' loop
    perform _apply_tx(b.user_id, 'refund', b.amount, p_market, b.id,
                      jsonb_build_object('reason','cancelled'));
    update bets set status = 'refunded', payout_amount = b.amount, resolved_at = now()
     where id = b.id;
  end loop;

  update markets set status = 'cancelled', resolved_at = now() where id = p_market;
  return jsonb_build_object('market', p_market, 'status', 'cancelled');
end;
$$;

-- =========================================================
-- COFFRE JOURNALIER (§4.6) — idempotent via daily_claims (PK)
-- =========================================================
create or replace function claim_daily_chest()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_amount bigint := _cfg_int('daily_chest_amount', 100);
  v_inserted int;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  insert into daily_claims (user_id, day, kind, amount)
  values (v_uid, current_date, 'chest', v_amount)
  on conflict (user_id, day, kind) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then raise exception 'coffre deja reclame aujourd''hui'; end if;

  perform _apply_tx(v_uid, 'daily_chest', v_amount, null, null,
                    jsonb_build_object('day', current_date));
  return jsonb_build_object('amount', v_amount, 'balance', (select balance from profiles where id = v_uid));
end;
$$;

-- =========================================================
-- STREAK QUOTIDIEN (§4.6) — recompense croissante, idempotent
-- =========================================================
create or replace function claim_streak()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_base bigint := _cfg_int('daily_chest_amount', 100);
  v_p profiles;
  v_new_streak int;
  v_reward bigint;
  v_inserted int;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  select * into v_p from profiles where id = v_uid for update;

  -- Idempotence : une seule reclamation de streak par jour
  insert into daily_claims (user_id, day, kind, amount)
  values (v_uid, current_date, 'streak', 0)
  on conflict (user_id, day, kind) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then raise exception 'streak deja reclame aujourd''hui'; end if;

  if v_p.streak_last = current_date - 1 then
    v_new_streak := v_p.streak_count + 1;      -- jour consecutif
  else
    v_new_streak := 1;                          -- serie cassee (ou premiere fois)
  end if;

  -- Recompense croissante, plafonnee (sink/faucet maitrise §6)
  v_reward := v_base + (least(v_new_streak, 7) - 1) * 20;

  update daily_claims set amount = v_reward
   where user_id = v_uid and day = current_date and kind = 'streak';
  update profiles set streak_count = v_new_streak, streak_last = current_date where id = v_uid;

  perform _apply_tx(v_uid, 'streak_reward', v_reward, null, null,
                    jsonb_build_object('streak', v_new_streak));
  return jsonb_build_object('streak', v_new_streak, 'reward', v_reward,
                            'balance', (select balance from profiles where id = v_uid));
end;
$$;

-- =========================================================
-- QUETES (§4.6)
-- =========================================================
create or replace function claim_quest_reward(p_quest_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_reward bigint;
  v_uq user_quests;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  select * into v_uq from user_quests
   where user_id = v_uid and quest_id = p_quest_id and period_day = current_date
   for update;
  if v_uq.user_id is null then raise exception 'quete non trouvee'; end if;
  if v_uq.claimed_at is not null then raise exception 'recompense deja reclamee'; end if;

  if v_uq.progress < (select target from quests where id = p_quest_id) then
    raise exception 'quete non terminee';
  end if;
  select reward into v_reward from quests where id = p_quest_id;

  update user_quests set claimed_at = now(), completed_at = coalesce(completed_at, now())
   where user_id = v_uid and quest_id = p_quest_id and period_day = current_date;

  perform _apply_tx(v_uid, 'quest_reward', v_reward, null, null,
                    jsonb_build_object('quest', p_quest_id));
  return jsonb_build_object('reward', v_reward, 'balance', (select balance from profiles where id = v_uid));
end;
$$;

-- =========================================================
-- CREATION DE MARCHE (crew prive, §4.4) — cout = sink anti-spam
-- =========================================================
create or replace function create_market(
  p_title text, p_category text, p_close_time timestamptz,
  p_options text[], p_crew_id uuid, p_description text default null,
  p_type market_type default 'binary'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cost bigint := _cfg_int('market_creation_cost', 50);
  v_market_id uuid;
  i int;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  if p_crew_id is null then
    raise exception 'MVP : creation reservee aux crews prives (§4.4)';
  end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = v_uid) then
    raise exception 'reserve aux membres du crew';
  end if;
  if array_length(p_options, 1) < 2 then raise exception 'au moins 2 options'; end if;
  if p_close_time <= now() then raise exception 'close_time doit etre dans le futur'; end if;

  -- Sink : cout de creation
  perform _apply_tx(v_uid, 'adjustment', -v_cost, null, null,
                    jsonb_build_object('reason','market_creation'));

  insert into markets (creator_id, crew_id, title, description, category, type,
                       status, resolution_mode, close_time, counts_for_ranking)
  values (v_uid, p_crew_id, p_title, p_description, p_category, p_type,
          'open', 'creator', p_close_time, false)  -- crew prive : hors classement global (§10.5)
  returning id into v_market_id;

  for i in 1 .. array_length(p_options, 1) loop
    insert into market_options (market_id, label, sort_order)
    values (v_market_id, p_options[i], i);
  end loop;

  return v_market_id;
end;
$$;

-- =========================================================
-- DISPUTE (§8) — gele le payout sur marche non-crew
-- =========================================================
create or replace function open_dispute(p_market uuid, p_reason text, p_source text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_market markets;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  select * into v_market from markets where id = p_market for update;
  if v_market.id is null then raise exception 'marche introuvable'; end if;

  insert into disputes (market_id, user_id, reason, source_url) values (p_market, v_uid, p_reason, p_source);

  -- Gel du payout pour les marches publics (crew : confiance interne)
  if v_market.crew_id is null and v_market.status in ('closed','resolving') then
    update markets set status = 'disputed' where id = p_market;
  end if;
  return jsonb_build_object('market', p_market, 'status', 'dispute_open');
end;
$$;

-- =========================================================
-- CREWS (§4.5) — creation + adhesion via RPC (genere invite_code)
-- =========================================================
create or replace function create_crew(p_name text, p_description text default null)
returns crews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_crew crews;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  loop
    v_code := _gen_code(6);
    exit when not exists (select 1 from crews where invite_code = v_code);
  end loop;

  insert into crews (name, description, owner_id, invite_code)
  values (p_name, p_description, v_uid, v_code) returning * into v_crew;
  insert into crew_members (crew_id, user_id, role) values (v_crew.id, v_uid, 'owner');
  return v_crew;
end;
$$;

create or replace function join_crew(p_invite_code text)
returns crews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_crew crews;
begin
  if v_uid is null then raise exception 'non authentifie'; end if;
  select * into v_crew from crews where invite_code = upper(trim(p_invite_code));
  if v_crew.id is null then raise exception 'code d''invitation invalide'; end if;
  insert into crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'member')
  on conflict (crew_id, user_id) do nothing;
  return v_crew;
end;
$$;

-- =========================================================
-- GRANTS D'EXECUTION
-- Par defaut PUBLIC peut executer : on revoque puis on ouvre au strict minimum.
-- anon n'appelle rien. authenticated : les actions joueur. resolve/cancel :
-- authenticated (staff/createur, verif interne) + service_role (cron/edge).
-- Les helpers _* restent internes (aucun grant).
-- =========================================================
revoke execute on all functions in schema public from public, anon;

grant execute on function complete_onboarding(text, text, text, boolean, boolean) to authenticated;
grant execute on function place_bet(uuid, uuid, bigint)                         to authenticated;
grant execute on function claim_daily_chest()                                   to authenticated;
grant execute on function claim_streak()                                        to authenticated;
grant execute on function claim_quest_reward(bigint)                            to authenticated;
grant execute on function create_market(text, text, timestamptz, text[], uuid, text, market_type) to authenticated;
grant execute on function open_dispute(uuid, text, text)                        to authenticated;
grant execute on function create_crew(text, text)                               to authenticated;
grant execute on function join_crew(text)                                       to authenticated;

grant execute on function resolve_market(uuid, uuid, text, text, uuid) to authenticated, service_role;
grant execute on function cancel_market(uuid, text)                    to authenticated, service_role;
