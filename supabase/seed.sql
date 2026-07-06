-- =========================================================
-- KENNYGAMES — Seed (§12.D)
-- config + compte systeme + referentiels + marches de demo Madame Irma.
-- S'execute apres les migrations lors de `supabase db reset`.
-- =========================================================

-- ---------------------------------------------------------
-- CONFIG (source de verite economie — modifiable sans migration, §6)
-- ---------------------------------------------------------
insert into config (key, value) values
  ('rake_bps',             '400'),        -- 4% de rake (regulateur anti-inflation)
  ('initial_grant',        '1000'),
  ('daily_chest_amount',   '100'),
  ('market_creation_cost', '50'),
  ('currency_name',        '"Pepites"'),
  ('app_name',             '"KennyGames"')
on conflict (key) do nothing;

-- ---------------------------------------------------------
-- COMPTE SYSTEME (§9) — recoit rake / dust, sert de contrepartie au ledger.
-- profiles.id -> auth.users(id) : on cree d'abord l'utilisateur auth technique.
-- UUID fixe et reconnaissable.
-- ---------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000aa',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'systeme@kennygames.local', '',
        now(), now(), now())
on conflict (id) do nothing;

insert into profiles (id, username, display_name, referral_code, is_system, role,
                      age_confirmed, terms_accepted_at)
values ('00000000-0000-0000-0000-0000000000aa', '__systeme__', 'Systeme',
        'SYSTEM00', true, 'admin', true, now())
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- SAISON courante (ligues, §4.6)
-- ---------------------------------------------------------
insert into seasons (name, starts_at, ends_at, is_current)
values ('Saison 1', now(), now() + interval '90 days', true)
on conflict do nothing;

-- ---------------------------------------------------------
-- QUETES quotidiennes (§4.6)
-- ---------------------------------------------------------
insert into quests (key, title, description, reward, target) values
  ('daily_place_3',  'Parieur du jour',   'Place 3 paris aujourd''hui',        150, 3),
  ('daily_win_1',    'Premier sang',      'Gagne 1 pari aujourd''hui',         200, 1),
  ('daily_politics', 'Fin politologue',   'Parie sur un marche Politique',     100, 1)
on conflict (key) do nothing;

-- ---------------------------------------------------------
-- BADGES (§4.7)
-- ---------------------------------------------------------
insert into badges (key, title, description, icon) values
  ('first_bet',   'Baptfeu',         'Ton tout premier pari',            'flame'),
  ('streak_7',    'Fidele',          '7 jours de streak',                'calendar'),
  ('big_winner',  'Gros coup',       'Un gain de plus de 1000',          'trophy'),
  ('sharp',       'Fine gachette',   'Taux de reussite > 60%',           'target')
on conflict (key) do nothing;

-- ---------------------------------------------------------
-- MARCHES DE DEMO — "generes par Madame Irma" (§12.D, §15)
-- creator = compte systeme, is_ai_generated, status open, close_time futur.
-- ---------------------------------------------------------
do $$
declare
  v_sys uuid := '00000000-0000-0000-0000-0000000000aa';
  m uuid;
begin
  -- 1) Telerealite (binaire)
  insert into markets (creator_id, title, description, category, type, status,
                       resolution_mode, close_time, is_ai_generated)
  values (v_sys, 'Kevin gagne-t-il la finale de la Star Ac ?',
          'Madame Irma sent une victoire... ou une desillusion. A toi de voir.',
          'Telerealite', 'binary', 'open', 'ai', now() + interval '7 days', true)
  returning id into m;
  insert into market_options (market_id, label, color, sort_order) values
    (m, 'Oui', '#22c55e', 1), (m, 'Non', '#ef4444', 2);

  -- 2) Politique (binaire)
  insert into markets (creator_id, title, description, category, type, status,
                       resolution_mode, close_time, is_ai_generated)
  values (v_sys, 'Macron dissout-il l''Assemblee avant fin 2026 ?',
          'Les astres politiques sont troubles cette annee.',
          'Politique', 'binary', 'open', 'ai', now() + interval '30 days', true)
  returning id into m;
  insert into market_options (market_id, label, color, sort_order) values
    (m, 'Oui', '#22c55e', 1), (m, 'Non', '#ef4444', 2);

  -- 3) Musique (choix multiple)
  insert into markets (creator_id, title, description, category, type, status,
                       resolution_mode, close_time, is_ai_generated)
  values (v_sys, 'Qui sera #1 du Top Single vendredi ?',
          'Trois pretendants, un seul trone.',
          'Musique', 'multiple', 'open', 'ai', now() + interval '3 days', true)
  returning id into m;
  insert into market_options (market_id, label, color, sort_order) values
    (m, 'Aya Nakamura', '#a855f7', 1),
    (m, 'Gazo',         '#3b82f6', 2),
    (m, 'Un outsider',  '#f59e0b', 3);

  -- 4) Sport (binaire)
  insert into markets (creator_id, title, description, category, type, status,
                       resolution_mode, close_time, is_ai_generated)
  values (v_sys, 'Le PSG marque-t-il en premiere mi-temps ce week-end ?',
          'Madame Irma consulte sa boule... et le calendrier.',
          'Sport', 'binary', 'open', 'ai', now() + interval '5 days', true)
  returning id into m;
  insert into market_options (market_id, label, color, sort_order) values
    (m, 'Oui', '#22c55e', 1), (m, 'Non', '#ef4444', 2);

  -- 5) Buzz / Internet (binaire)
  insert into markets (creator_id, title, description, category, type, status,
                       resolution_mode, close_time, is_ai_generated)
  values (v_sys, 'Cette video atteint-elle 1M de vues avant lundi ?',
          'Le buzz est une matiere volatile.',
          'Buzz / Internet', 'binary', 'open', 'ai', now() + interval '2 days', true)
  returning id into m;
  insert into market_options (market_id, label, color, sort_order) values
    (m, 'Oui', '#22c55e', 1), (m, 'Non', '#ef4444', 2);
end $$;
