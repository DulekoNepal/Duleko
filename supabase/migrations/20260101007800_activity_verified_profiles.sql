-- =====================================================================
-- Duleko MVP :: 7800 :: Activity: number of verified profiles
-- =====================================================================
-- Run after 7500.
--
-- The staff Activity page (/staff/activity) gets one more number: how many
-- members have the verified badge (profile_verifications - every badge
-- since 6300 comes from an approved ID check). "Last 30 days" counts the
-- badges given in that time. Tapping it lists them (activity_list
-- 'verified'), each with the staff member who approved the ID.
--
-- Staff only: public_activity_stats() leaves it out, so the website's
-- numbers don't change.
-- =====================================================================

-- ---------------------------------------------------------------------
-- activity_numbers (latest: 6900), plus 'verified'.
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
    'deals_npr', (select coalesce(round(sum(amount)), 0) from done),
    'verified', (select count(*) from public.profile_verifications v
                  where since is null or v.verified_at >= since)
  );
$$;

revoke execute on function public.activity_numbers(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- public_activity_stats (latest: 6900): the website stays as it was.
-- ---------------------------------------------------------------------
create or replace function public.public_activity_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select value from public.app_settings where key = 'public_stats_visible'), 'false') <> 'true'
      then null
    else (
      select jsonb_object_agg(key, public.round_down_nicely(value::numeric))
        from jsonb_each_text(public.activity_numbers(null) - 'verified')
    )
  end;
$$;

revoke execute on function public.public_activity_stats() from public;
grant execute on function public.public_activity_stats() to anon, authenticated;

-- ---------------------------------------------------------------------
-- activity_list (latest: 7500), plus kind = 'verified'.
-- ---------------------------------------------------------------------
create or replace function public.activity_list(p_kind text, p_since timestamptz default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  rows jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  if p_kind = 'calls' then
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'call', 'id', c.id, 'at', c.created_at,
               'from', public.activity_person(c.caller_profile_id),
               'to', public.activity_person(c.callee_profile_id),
               'status', c.outcome) as r
        from public.contact_calls c
       where c.outcome is distinct from 'short' and (p_since is null or c.created_at >= p_since)
       order by c.created_at desc
       limit 300
    ) x;

  elsif p_kind = 'accepted' then
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'request', 'id', e.id, 'at', e.created_at,
               'from', public.activity_person(e.employer_profile_id),
               'to', public.activity_person(e.worker_profile_id),
               'skill_id', e.skill_id, 'amount', e.payment_amount,
               'status', e.status, 'title', e.title) as r
        from public.work_engagements e
       where e.status in ('accepted', 'confirmed', 'completed')
         and (p_since is null or e.created_at >= p_since)
       order by e.created_at desc
       limit 300
    ) x;

  elsif p_kind in ('completed', 'deals_npr') then
    -- Jobs done: completed requests + call deals that count. The money
    -- list keeps only the ones with a price.
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select r from (
        select jsonb_build_object(
                 'type', 'request', 'id', e.id, 'at', coalesce(e.completed_at, e.updated_at),
                 'from', public.activity_person(e.employer_profile_id),
                 'to', public.activity_person(e.worker_profile_id),
                 'skill_id', e.skill_id, 'amount', e.payment_amount,
                 'status', e.status, 'title', e.title) as r,
               coalesce(e.completed_at, e.updated_at) as at
          from public.work_engagements e
         where e.status = 'completed'
           and (p_since is null or coalesce(e.completed_at, e.updated_at) >= p_since)
           and (p_kind = 'completed' or coalesce(e.payment_amount, 0) > 0)
        union all
        select jsonb_build_object(
                 'type', 'deal', 'id', d.id, 'at', d.created_at,
                 'from', public.activity_person(d.hirer_profile_id),
                 'to', public.activity_person(d.worker_profile_id),
                 'skill_id', d.skill_id, 'amount', d.amount, 'status', d.status), d.created_at
          from public.call_deals d
         where d.status = 'confirmed'
           and (p_since is null or d.created_at >= p_since)
           and (p_kind = 'completed' or d.amount is not null)
      ) u
      order by at desc
      limit 300
    ) x;

  elsif p_kind = 'reviews' then
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'review', 'id', v.id, 'at', v.created_at,
               'from', public.activity_person(v.reviewer_profile_id),
               'to', public.activity_person(v.reviewee_profile_id),
               'rating', v.rating, 'comment', v.comment) as r
        from public.reviews v
       where p_since is null or v.created_at >= p_since
       order by v.created_at desc
       limit 300
    ) x;

  elsif p_kind = 'repeat' then
    with done as (
      select e.employer_profile_id as hirer, e.payment_amount as amount,
             coalesce(e.completed_at, e.updated_at) as at
        from public.work_engagements e
       where e.status = 'completed'
         and (p_since is null or coalesce(e.completed_at, e.updated_at) >= p_since)
      union all
      select d.hirer_profile_id, d.amount, d.created_at
        from public.call_deals d
       where d.status = 'confirmed'
         and (p_since is null or d.created_at >= p_since)
    )
    select coalesce(jsonb_agg(r order by (r->>'times')::int desc, r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'person', 'id', hirer, 'at', max(at),
               'from', public.activity_person(hirer),
               'times', count(*), 'amount', sum(amount)) as r
        from done
       group by hirer
      having count(*) >= 2
       order by count(*) desc, max(at) desc
       limit 300
    ) x;

  elsif p_kind = 'active' then
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'person', 'id', p.profile_id, 'at', p.last_seen_at,
               'from', public.activity_person(p.profile_id)) as r
        from public.presence p
       where p.last_seen_at >= now() - interval '30 days'
       order by p.last_seen_at desc
       limit 300
    ) x;

  elsif p_kind = 'verified' then
    -- Verified profiles: who has the badge now, newest first, and which
    -- staff member approved them.
    select coalesce(jsonb_agg(r order by r->>'at' desc), '[]') into rows from (
      select jsonb_build_object(
               'type', 'person', 'id', v.profile_id, 'at', v.verified_at,
               'from', public.activity_person(v.profile_id),
               'status', 'verified',
               'title', s.full_name) as r
        from public.profile_verifications v
        left join public.profiles s on s.id = v.verified_by
       where p_since is null or v.verified_at >= p_since
       order by v.verified_at desc
       limit 300
    ) x;

  else
    raise exception 'Unknown activity list' using errcode = 'invalid_parameter_value';
  end if;

  return rows;
end;
$$;

revoke execute on function public.activity_list(text, timestamptz) from public, anon;
grant execute on function public.activity_list(text, timestamptz) to authenticated;
