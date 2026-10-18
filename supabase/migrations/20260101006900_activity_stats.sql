-- =====================================================================
-- Duleko MVP :: 6900 :: Activity numbers - for staff, and the website
-- =====================================================================
-- Run after 6800.
--
-- First-release feedback, item 4 (part 2). One set of numbers, two
-- audiences:
--
--   activity_stats()         staff: exact numbers, all-time and for the
--                            last 30 days.
--   public_activity_stats()  anyone (the website): the same numbers,
--                            rounded down ("120+"), and only while an
--                            admin has switched them on - they start off,
--                            so small early numbers aren't on show.
--   set_public_stats(bool)   admins: the switch (app_settings key
--                            'public_stats_visible').
--   remove_call_deal(uuid)   staff: take a made-up deal out of every count
--                            (and its review with it).
--
-- What counts:
--   calls          taps on Call, minus mis-taps (6800)
--   accepted       work requests accepted (accepted, confirmed or completed)
--   completed      jobs done: completed requests + call deals that count
--   reviews        reviews written
--   repeat         people who got work done 2+ times through Duleko
--   active         members who opened the app in the last 30 days
--                  (presence, 2300) - the same in both columns
--   deals_npr      the money in those jobs: agreed prices of completed
--                  requests + call deal amounts (each capped at
--                  Rs 5,00,000 in 6800, so one silly number can't skew it)
--
-- A call deal counts once the worker confirms it, or 7 days on if they
-- don't answer (auto_confirm_call_deals, 6800); disputed or removed
-- deals never count.
-- =====================================================================

insert into public.app_settings (key, value) values ('public_stats_visible', 'false')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- The numbers since a moment (null = all time). Internal.
-- ---------------------------------------------------------------------
create or replace function public.activity_numbers(since timestamptz)
returns jsonb
language sql stable security definer set search_path = public as $$
  with done as (
    select e.employer_profile_id as hirer, e.payment_amount as amount
      from public.work_engagements e
     where e.status = 'completed'
       and (since is null or coalesce(e.completed_at, e.updated_at) >= since)
    union all
    select d.hirer_profile_id, d.amount
      from public.call_deals d
     where d.status = 'confirmed'
       and (since is null or d.created_at >= since)
  )
  select jsonb_build_object(
    'calls', (select count(*) from public.contact_calls c
               where c.outcome is distinct from 'short' and (since is null or c.created_at >= since)),
    'accepted', (select count(*) from public.work_engagements e
                  where e.status in ('accepted', 'confirmed', 'completed')
                    and (since is null or e.created_at >= since)),
    'completed', (select count(*) from done),
    'reviews', (select count(*) from public.reviews r where since is null or r.created_at >= since),
    'repeat', (select count(*) from (select hirer from done group by hirer having count(*) >= 2) x),
    'active', (select count(*) from public.presence p where p.last_seen_at >= now() - interval '30 days'),
    'deals_npr', (select coalesce(round(sum(amount)), 0) from done)
  );
$$;

revoke execute on function public.activity_numbers(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Staff: exact numbers.
-- ---------------------------------------------------------------------
create or replace function public.activity_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'all_time', public.activity_numbers(null),
    'last_30_days', public.activity_numbers(now() - interval '30 days'),
    'public_visible', coalesce((select value from public.app_settings where key = 'public_stats_visible'), 'false') = 'true',
    'disputed_deals', (select count(*) from public.call_deals where status = 'disputed'),
    'waiting_deals', (select count(*) from public.call_deals where status = 'reported')
  );
end;
$$;

revoke execute on function public.activity_stats() from public, anon;
grant execute on function public.activity_stats() to authenticated;

-- ---------------------------------------------------------------------
-- Everyone: rounded down, and only while switched on (else null).
-- ---------------------------------------------------------------------
create or replace function public.round_down_nicely(n numeric)
returns numeric
language sql immutable as $$
  select case
    when n < 10 then n
    when n < 100 then floor(n / 10) * 10
    when n < 1000 then floor(n / 50) * 50
    when n < 10000 then floor(n / 100) * 100
    when n < 100000 then floor(n / 1000) * 1000
    else floor(n / 10000) * 10000
  end;
$$;

create or replace function public.public_activity_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select value from public.app_settings where key = 'public_stats_visible'), 'false') <> 'true'
      then null
    else (
      select jsonb_object_agg(key, public.round_down_nicely(value::numeric))
        from jsonb_each_text(public.activity_numbers(null))
    )
  end;
$$;

revoke execute on function public.public_activity_stats() from public;
grant execute on function public.public_activity_stats() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Admins: show or hide the website's numbers.
-- ---------------------------------------------------------------------
create or replace function public.set_public_stats(p_visible boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_above() then
    raise exception 'Admins only' using errcode = 'insufficient_privilege';
  end if;
  insert into public.app_settings (key, value)
  values ('public_stats_visible', case when p_visible then 'true' else 'false' end)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke execute on function public.set_public_stats(boolean) from public, anon;
grant execute on function public.set_public_stats(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Staff: the latest call deals, to look over, and to remove a made-up one.
-- ---------------------------------------------------------------------
create or replace function public.recent_call_deals(p_limit integer default 30)
returns table (
  deal_id     uuid,
  status      text,
  amount      numeric,
  deal_date   date,
  created_at  timestamptz,
  skill_id    text,
  hirer_id    uuid,
  hirer_name  text,
  worker_id   uuid,
  worker_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  return query
    select d.id, d.status, d.amount, d.deal_date, d.created_at, d.skill_id,
           h.id, h.full_name, w.id, w.full_name
      from public.call_deals d
      join public.profiles h on h.id = d.hirer_profile_id
      join public.profiles w on w.id = d.worker_profile_id
     order by d.created_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100));
end;
$$;

revoke execute on function public.recent_call_deals(integer) from public, anon;
grant execute on function public.recent_call_deals(integer) to authenticated;

create or replace function public.remove_call_deal(p_deal uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  update public.call_deals
     set status = 'removed', removed_by = public.current_profile_id()
   where id = p_deal;
  -- Its review goes too; the rating average follows (trg_reviews_recalculate).
  delete from public.reviews where call_deal_id = p_deal;
end;
$$;

revoke execute on function public.remove_call_deal(uuid) from public, anon;
grant execute on function public.remove_call_deal(uuid) to authenticated;
