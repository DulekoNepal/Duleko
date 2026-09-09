-- =====================================================================
-- Duleko MVP :: 3200 :: Auto rickshaw as a trade & local service
-- =====================================================================
-- Rickshaw/auto drivers are a distinct, commonly-searched-for trade from
-- the general 'driver' skill, so they get their own entry rather than
-- being folded into it. Slotted right after 'driver' (sort_order 80).

insert into public.skills (id, name_en, name_ne, emoji, sort_order, category) values
  ('auto_rickshaw', 'Auto Rickshaw', 'अटो रिक्सा', '🛺', 85, 'trades')
on conflict (id) do update
  set name_en    = excluded.name_en,
      name_ne    = excluded.name_ne,
      emoji      = excluded.emoji,
      sort_order = excluded.sort_order,
      category   = excluded.category;
