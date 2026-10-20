-- =====================================================================
-- Duleko MVP :: 7500 :: Activity details - what's behind each number
-- =====================================================================
-- Run after 7400.
--
-- /staff/activity shows counts (6900). Staff asked to tap any of them and
-- see the records underneath, and to tap any record for its full page:
--
--   activity_list(kind, since)   staff: the rows behind one number, newest
--                                first, counted exactly as
--                                activity_numbers() counts them.
--                                kind = calls | accepted | completed |
--                                reviews | repeat | active | deals_npr
--   activity_item(type, id)      staff: one call, work request, call deal
--                                or review, with everything about it.
--
-- People come back as {id, name, photo, member_no} - no phone numbers.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A person, as the staff pages show them. Internal.
-- ---------------------------------------------------------------------
create or replace function public.activity_person(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'name', p.full_name, 'photo', p.avatar_url, 'member_no', p.member_no)
    from public.profiles p
   where p.id = p_id;
$$;

revoke execute on function public.activity_person(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Staff: the rows behind one number (at most 300, newest first).
--
-- Every row: { type, id, at, from, to, skill_id, amount, status, title,
--              rating, comment, times }
--   type   call | request | deal | review | person
--   from   caller / hirer / reviewer / the person
--   to     callee / worker / the one reviewed
--   times  repeat customers: how many jobs
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

  else
    raise exception 'Unknown activity list' using errcode = 'invalid_parameter_value';
  end if;

  return rows;
end;
$$;

revoke execute on function public.activity_list(text, timestamptz) from public, anon;
grant execute on function public.activity_list(text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- Staff: one record, in full (null when it's gone).
-- ---------------------------------------------------------------------
create or replace function public.activity_item(p_type text, p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  item jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  if p_type = 'call' then
    select jsonb_build_object(
             'type', 'call', 'id', c.id, 'created_at', c.created_at,
             'from', public.activity_person(c.caller_profile_id),
             'to', public.activity_person(c.callee_profile_id),
             'outcome', c.outcome, 'answered_at', c.answered_at, 'ask_again_at', c.ask_again_at,
             'deal_id', (select d.id from public.call_deals d where d.call_id = c.id))
      into item
      from public.contact_calls c
     where c.id = p_id;

  elsif p_type = 'request' then
    select jsonb_build_object(
             'type', 'request', 'id', e.id, 'created_at', e.created_at, 'updated_at', e.updated_at,
             'from', public.activity_person(e.employer_profile_id),
             'to', public.activity_person(e.worker_profile_id),
             'skill_id', e.skill_id, 'title', e.title, 'details', e.details,
             'work_date', e.work_date, 'location_text', e.location_text,
             'amount', e.payment_amount, 'payment_note', e.payment_note,
             'status', e.status, 'completed_at', e.completed_at,
             'cancelled_by', public.activity_person(e.cancelled_by),
             'reviews', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', v.id, 'at', v.created_at, 'rating', v.rating, 'comment', v.comment,
                        'from', public.activity_person(v.reviewer_profile_id)) order by v.created_at), '[]')
                 from public.reviews v where v.engagement_id = e.id))
      into item
      from public.work_engagements e
     where e.id = p_id;

  elsif p_type = 'deal' then
    select jsonb_build_object(
             'type', 'deal', 'id', d.id, 'created_at', d.created_at, 'updated_at', d.updated_at,
             'from', public.activity_person(d.hirer_profile_id),
             'to', public.activity_person(d.worker_profile_id),
             'skill_id', d.skill_id, 'amount', d.amount, 'deal_date', d.deal_date,
             'status', d.status, 'confirm_by', d.confirm_by, 'worker_answered_at', d.worker_answered_at,
             'rating', d.rating, 'comment', d.comment,
             'removed_by', public.activity_person(d.removed_by),
             'call_id', d.call_id,
             'review_id', (select v.id from public.reviews v where v.call_deal_id = d.id limit 1))
      into item
      from public.call_deals d
     where d.id = p_id;

  elsif p_type = 'review' then
    select jsonb_build_object(
             'type', 'review', 'id', v.id, 'created_at', v.created_at,
             'from', public.activity_person(v.reviewer_profile_id),
             'to', public.activity_person(v.reviewee_profile_id),
             'rating', v.rating, 'comment', v.comment,
             'request_id', v.engagement_id, 'deal_id', v.call_deal_id)
      into item
      from public.reviews v
     where v.id = p_id;

  else
    raise exception 'Unknown activity item' using errcode = 'invalid_parameter_value';
  end if;

  return item;
end;
$$;

revoke execute on function public.activity_item(text, uuid) from public, anon;
grant execute on function public.activity_item(text, uuid) to authenticated;
