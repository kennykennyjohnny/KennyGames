-- =========================================================
-- RPC admin (SECURITY DEFINER, gate is_staff) — §8 pilotage.
--
-- But : le tableau de bord admin fonctionne avec la SEULE session de
-- l'admin connecte (role admin/moderateur), SANS jamais avoir besoin de la
-- service_role dans l'app web. Chaque fonction revalide le role en base.
-- =========================================================

create or replace function admin_publish_market(p_market uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  update markets set status = 'open' where id = p_market and status = 'draft';
end;
$$;

create or replace function admin_delete_market(p_market uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  -- uniquement les brouillons (jamais un marche avec des paris)
  delete from markets where id = p_market and status = 'draft';
end;
$$;

create or replace function admin_set_config(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  insert into config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
end;
$$;

create or replace function admin_set_resolution_status(p_id bigint, p_status resolution_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  update market_resolutions set status = p_status, resolved_by = auth.uid() where id = p_id;
end;
$$;

create or replace function admin_resolve_dispute(p_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_market uuid;
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  select market_id into v_market from disputes where id = p_id;
  if v_market is null then raise exception 'litige introuvable'; end if;

  if p_accept then
    -- litige fonde : on annule le marche (remboursement integral)
    perform cancel_market(v_market, 'litige accepte');
    update disputes set status = 'accepted' where id = p_id;
  else
    -- litige rejete : on degele le marche
    update disputes set status = 'rejected' where id = p_id;
    update markets set status = 'closed' where id = v_market and status = 'disputed';
  end if;
end;
$$;

-- Creation de marche cote admin/IA (creator = compte systeme). Sert au bouton
-- "Generer maintenant" et aux marches editoriaux, sans service_role.
create or replace function admin_create_market(
  p_title text, p_category text, p_close_time timestamptz, p_options text[],
  p_description text default null, p_type market_type default 'binary',
  p_status market_status default 'draft', p_is_ai boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sys uuid;
  v_market uuid;
  i int;
begin
  if not is_staff(auth.uid()) then raise exception 'reserve au staff'; end if;
  if array_length(p_options, 1) < 2 then raise exception 'au moins 2 options'; end if;
  select id into v_sys from profiles where is_system order by created_at limit 1;

  insert into markets (creator_id, title, description, category, type, status, resolution_mode, close_time, is_ai_generated)
  values (v_sys, p_title, p_description, p_category, p_type, p_status,
          case when p_is_ai then 'ai' else 'admin' end, p_close_time, p_is_ai)
  returning id into v_market;

  for i in 1 .. array_length(p_options, 1) loop
    insert into market_options (market_id, label, sort_order) values (v_market, p_options[i], i);
  end loop;
  return v_market;
end;
$$;

grant execute on function admin_publish_market(uuid)                          to authenticated;
grant execute on function admin_delete_market(uuid)                           to authenticated;
grant execute on function admin_set_config(text, jsonb)                       to authenticated;
grant execute on function admin_set_resolution_status(bigint, resolution_status) to authenticated;
grant execute on function admin_resolve_dispute(bigint, boolean)              to authenticated;
grant execute on function admin_create_market(text, text, timestamptz, text[], text, market_type, market_status, boolean) to authenticated;
