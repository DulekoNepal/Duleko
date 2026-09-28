-- =====================================================================
-- Duleko MVP :: 4700 :: "Use Duleko on the website" chat from founders
-- =====================================================================
-- One-time send: Sunil and Sanjay (every row in welcome_senders) each
-- send the same short chat message to every non-staff profile. English
-- only, like the welcome chats. trg_messages_notify fires as usual, so
-- people get the unread badge (and the usual throttled chat email).

insert into public.messages (profile_a, profile_b, sender_profile_id, body)
select
  least(ws.profile_id, p.id),
  greatest(ws.profile_id, p.id),
  ws.profile_id,
  'Hi ' || coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'there') ||
    ', you can now use all of Duleko''s features at https://www.duleko.com. The updated app will be on the Play Store within a week.'
from public.welcome_senders ws
cross join public.profiles p
where p.id <> ws.profile_id
  and not exists (select 1 from public.staff_roles sr where sr.profile_id = p.id)
order by ws.sort_order;
