-- =====================================================================
-- Duleko MVP :: 7000 :: Nepali alert text, same standard as the app
-- =====================================================================
-- Run after 6900.
--
-- The app's string tables (src/lib/i18n*.ts) were cleaned up on
-- 2026-10-20; the alerts the database writes were not. This re-creates
-- every function whose title_ne / body_ne needed fixing, each copied from
-- its latest version with only the Nepali changed. The English, the logic
-- and the grants stay as they are (create or replace keeps the grants and
-- the triggers already pointing at these functions).
--
-- What changes:
--   - postpositions join the name: "रामले", not "राम ले"
--   - साथी (not मित्र), "का लागि" (not "को लागि")
--   - wording matches the app: "कामको अनुरोध पठाउनुभयो", "अनुरोध
--     स्वीकार / अस्वीकार गरियो", "मिति बुक गर्न पक्का गर्नुहोस्",
--     "साथी अनुरोध पठाउनुभयो", "नामछेउ प्रमाणित ब्याज"
--   - no comma before वा
--   - the rating and the job budget show in Nepali digits
--
-- Unchanged (already fine): notify_on_message, fan_out_notice,
-- notify_on_fee_payment, review_kyc, answer_call.
-- Alerts already sent keep their old text.
-- =====================================================================

-- ---------------------------------------------------------------------
-- notify_on_engagement (latest: 0100) - Work requests: sent, accepted, declined, confirmed, completed, cancelled
-- ---------------------------------------------------------------------
create or replace function public.notify_on_engagement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  employer_name text;
  worker_name   text;
  recipient     uuid;
  kind          text;
  t_en text; t_ne text; b_en text; b_ne text; actor text;
begin
  select full_name into employer_name from public.profiles where id = new.employer_profile_id;
  select full_name into worker_name   from public.profiles where id = new.worker_profile_id;

  if tg_op = 'INSERT' then
    recipient := new.worker_profile_id;
    kind := 'request';
    actor := employer_name;
    t_en := 'New work request';
    t_ne := 'नयाँ कामको अनुरोध';
    b_en := employer_name || ' asked you for: ' || new.title;
    b_ne := employer_name || 'ले तपाईंलाई कामको अनुरोध पठाउनुभयो: ' || new.title;

  elsif new.status is distinct from old.status then
    case new.status
      when 'accepted' then
        recipient := new.employer_profile_id; kind := 'accepted'; actor := worker_name;
        t_en := 'Request accepted';  t_ne := 'अनुरोध स्वीकार गरियो';
        b_en := worker_name || ' accepted your request. Confirm to lock the date.';
        b_ne := worker_name || 'ले तपाईंको अनुरोध स्वीकार गर्नुभयो। मिति बुक गर्न पक्का गर्नुहोस्।';
      when 'declined' then
        recipient := new.employer_profile_id; kind := 'declined'; actor := worker_name;
        t_en := 'Request declined';  t_ne := 'अनुरोध अस्वीकार गरियो';
        b_en := worker_name || ' cannot take this job.';
        b_ne := worker_name || 'ले यो काम लिन नसक्ने जनाउनुभयो।';
      when 'confirmed' then
        recipient := new.worker_profile_id; kind := 'confirmed'; actor := employer_name;
        t_en := 'Work confirmed';    t_ne := 'काम पक्का भयो';
        b_en := employer_name || ' confirmed the job. Phone numbers are now shared.';
        b_ne := employer_name || 'ले काम पक्का गर्नुभयो। अब दुवैको फोन नम्बर देखिन्छ।';
      when 'completed' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'completed'; actor := employer_name;
        t_en := 'Work completed';    t_ne := 'काम सम्पन्न भयो';
        b_en := 'Leave a review for ' || new.title || '.';
        b_ne := new.title || 'का लागि समीक्षा दिनुहोस्।';
      when 'cancelled' then
        recipient := case when new.cancelled_by = new.worker_profile_id
                          then new.employer_profile_id else new.worker_profile_id end;
        kind := 'cancelled'; actor := coalesce(employer_name, worker_name);
        t_en := 'Work cancelled';    t_ne := 'काम रद्द भयो';
        b_en := new.title || ' was cancelled.';
        b_ne := new.title || ' रद्द भयो।';
      else
        return null;
    end case;
  else
    return null;
  end if;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
  values (recipient, kind, t_en, t_ne, b_en, b_ne, new.id, actor);

  -- On completion notify both sides so each can review the other.
  if tg_op = 'UPDATE' and new.status = 'completed' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
    select case when recipient = new.worker_profile_id
                then new.employer_profile_id else new.worker_profile_id end,
           kind, t_en, t_ne, b_en, b_ne, new.id, actor;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- notify_on_review (latest: 0100) - New review (the rating now in Nepali digits)
-- ---------------------------------------------------------------------
create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare reviewer_name text;
begin
  select full_name into reviewer_name from public.profiles where id = new.reviewer_profile_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, engagement_id, actor_name)
  values (new.reviewee_profile_id, 'review',
          'New review', 'नयाँ समीक्षा',
          reviewer_name || ' rated you ' || new.rating || ' out of 5.',
          reviewer_name || 'ले तपाईंलाई ५ मध्ये ' || translate(new.rating::text, '0123456789', '०१२३४५६७८९') || ' तारा दिनुभयो।',
          new.engagement_id, reviewer_name);
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- notify_on_friendship (latest: 0800) - Friend request sent / accepted
-- ---------------------------------------------------------------------
create or replace function public.notify_on_friendship()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requester_name text;
  addressee_name text;
begin
  select full_name into requester_name from public.profiles where id = new.requester_profile_id;
  select full_name into addressee_name from public.profiles where id = new.addressee_profile_id;

  if tg_op = 'INSERT' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      new.addressee_profile_id, 'friend_request',
      'New friend request', 'नयाँ साथी अनुरोध',
      requester_name || ' wants to add you as a friend.',
      requester_name || 'ले तपाईंलाई साथी अनुरोध पठाउनुभयो।',
      requester_name
    );
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      new.requester_profile_id, 'friend_accepted',
      'Friend request accepted', 'साथी अनुरोध स्वीकार गरियो',
      addressee_name || ' accepted your friend request.',
      addressee_name || 'ले तपाईंको साथी अनुरोध स्वीकार गर्नुभयो।',
      addressee_name
    );
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- job_budget_text (latest: 5800) - Budget in job-post alerts: Nepali digits for 'ne'
-- ---------------------------------------------------------------------
create or replace function public.job_budget_text(lo numeric, hi numeric, lang text)
returns text language sql immutable as $$
  select case
    when lo is null and hi is null then null
    else (case when lang = 'ne' then 'रु ' else 'Rs ' end)
      || translate(case
           when lo is not null and hi is not null and lo <> hi then
             to_char(lo, 'FM99,99,99,999') || '-' || to_char(hi, 'FM99,99,99,999')
           else to_char(coalesce(lo, hi), 'FM99,99,99,999')
         end,
         '0123456789', case when lang = 'ne' then '०१२३४५६७८९' else '0123456789' end)
  end;
$$;

-- ---------------------------------------------------------------------
-- make_job_offer (latest: 5800) - New / changed offer on your post
-- ---------------------------------------------------------------------
create or replace function public.make_job_offer(p_job_post_id uuid, p_amount numeric, p_note text default null)
returns public.job_offers
language plpgsql security definer set search_path = public as $$
declare
  me     uuid := public.current_profile_id();
  post   public.job_posts;
  before public.job_offers;
  result public.job_offers;
  worker_name text;
  money_en text;
  money_ne text;
begin
  if me is null then
    raise exception 'You must be signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into post from public.job_posts where id = p_job_post_id for update;
  if not found or (public.is_profile_suspended(post.employer_profile_id) and post.employer_profile_id <> me) then
    raise exception 'JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if post.employer_profile_id = me then
    raise exception 'JOB_OWN_POST' using errcode = 'P0001';
  end if;
  if post.status <> 'open' then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;
  if post.work_date < public.nepal_today() then
    raise exception 'JOB_EXPIRED' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then
    raise exception 'JOB_BAD_AMOUNT' using errcode = 'P0001';
  end if;
  if public.is_profile_suspended(me) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001';
  end if;
  -- Offers come from workers: someone who has listed what they do.
  if not exists (select 1 from public.user_skills where profile_id = me) then
    raise exception 'JOB_NEEDS_SKILLS' using errcode = 'P0001';
  end if;
  -- Same rule as accepting a request (5600): fees past due pause new work.
  if (public.fee_summary_for(me)->>'blocked')::boolean then
    raise exception 'FEES_OVERDUE' using errcode = 'P0001';
  end if;

  select * into before from public.job_offers
   where job_post_id = p_job_post_id and worker_profile_id = me;

  insert into public.job_offers (job_post_id, worker_profile_id, amount, note, status)
  values (p_job_post_id, me, round(p_amount), nullif(trim(coalesce(p_note, '')), ''), 'pending')
  on conflict (job_post_id, worker_profile_id) do update
     set amount = excluded.amount,
         note   = excluded.note,
         status = 'pending'
   where public.job_offers.status <> 'accepted'
  returning * into result;

  if result.id is null then
    raise exception 'JOB_NOT_OPEN' using errcode = 'P0001';
  end if;

  if before.id is null or before.status <> 'pending' or before.amount <> result.amount then
    select full_name into worker_name from public.profiles where id = me;
    money_en := 'Rs ' || to_char(result.amount, 'FM99,99,99,999');
    money_ne := 'रु ' || translate(to_char(result.amount, 'FM99,99,99,999'), '0123456789', '०१२३४५६७८९');
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id, related_profile_id, actor_name)
    values (post.employer_profile_id, 'job_offer',
            case when before.id is not null and before.status = 'pending'
                 then 'Offer changed: ' || post.title else 'New offer: ' || post.title end,
            case when before.id is not null and before.status = 'pending'
                 then 'प्रस्ताव बदलियो: ' || post.title else 'नयाँ प्रस्ताव: ' || post.title end,
            worker_name || ' can do it for ' || money_en || '. Open the post to see their offer.',
            worker_name || 'ले यो काम ' || money_ne || 'मा गर्न सक्ने बताउनुभयो। प्रस्ताव हेर्न पोस्ट खोल्नुहोस्।',
            post.id, me, worker_name);
  end if;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- decline_other_job_offers (latest: 5800) - Offer not chosen / job closed
-- ---------------------------------------------------------------------
create or replace function public.decline_other_job_offers(post public.job_posts, keep uuid, chosen boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  with declined as (
    update public.job_offers
       set status = 'declined'
     where job_post_id = post.id
       and status = 'pending'
       and id is distinct from keep
    returning worker_profile_id
  )
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id)
  select d.worker_profile_id, 'job_closed',
         case when chosen then 'Offer not chosen' else 'Job closed' end,
         case when chosen then 'प्रस्ताव छानिएन' else 'काम बन्द भयो' end,
         case when chosen
              then post.title || ' went to someone else this time. Thank you for your offer.'
              else post.title || ' is no longer taking offers.' end,
         case when chosen
              then post.title || ' यसपटक अरू कसैलाई दिइयो। तपाईंको प्रस्तावका लागि धन्यवाद।'
              else post.title || 'मा अब प्रस्ताव लिइँदैन।' end,
         post.id
    from declined d;
end;
$$;

-- ---------------------------------------------------------------------
-- notify_on_verification (latest: 6300) - Your profile is verified
-- ---------------------------------------------------------------------
create or replace function public.notify_on_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
  values (
    new.profile_id, 'verified',
    'Your profile is verified', 'तपाईंको प्रोफाइल प्रमाणित भयो',
    'Duleko checked your ID and verified your profile. The verified badge now shows next to your name.',
    'डुलेकोले तपाईंको परिचयपत्र जाँचेर प्रोफाइल प्रमाणित गर्‍यो। अब तपाईंको नामछेउ प्रमाणित ब्याज देखिन्छ।'
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- kyc_reason_text (latest: 6300) - Why an ID was turned down (same as i18n-kyc.ts)
-- ---------------------------------------------------------------------
create or replace function public.kyc_reason_text(code text, lang text)
returns text language sql immutable as $$
  select case code
    when 'unclear' then case when lang = 'ne' then 'फोटो धमिलो वा पढ्न गाह्रो छ।'
                             else 'The photo is blurry or hard to read.' end
    when 'name_mismatch' then case when lang = 'ne' then 'कागजातको नाम तपाईंको प्रोफाइलको नामसँग मिलेन।'
                                   else 'The name on the document does not match your profile name.' end
    when 'incomplete' then case when lang = 'ne' then 'कागजातको केही भाग छुटेको वा काटिएको छ।'
                                else 'Part of the document is missing or cut off.' end
    when 'not_valid' then case when lang = 'ne' then 'यो मान्य परिचयपत्र होइन वा यसको म्याद सकिएको छ।'
                               else 'This is not an accepted ID, or it has expired.' end
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- submit_kyc (latest: 6300) - Staff: an ID to check
-- ---------------------------------------------------------------------
create or replace function public.submit_kyc(p_documents jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me       uuid := public.current_profile_id();
  folder   text := auth.uid()::text || '/';
  doc      jsonb;
  doc_kind text;
  front    text;
  back     text;
  new_id   uuid;
  me_name  text;
begin
  if me is null then
    raise exception 'KYC_SIGN_IN' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.staff_roles where profile_id = me) then
    raise exception 'KYC_STAFF' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profile_verifications where profile_id = me) then
    raise exception 'KYC_ALREADY_VERIFIED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.kyc_submissions where profile_id = me and status = 'pending') then
    raise exception 'KYC_PENDING' using errcode = 'P0001';
  end if;
  if p_documents is null or jsonb_typeof(p_documents) <> 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'KYC_DOCUMENT_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_documents) > 4 then
    raise exception 'KYC_BAD_DOCUMENT' using errcode = 'P0001';
  end if;

  insert into public.kyc_submissions (profile_id) values (me) returning id into new_id;

  for doc in select value from jsonb_array_elements(p_documents) loop
    doc_kind := doc->>'type';
    front    := nullif(trim(coalesce(doc->>'front', '')), '');
    back     := nullif(trim(coalesce(doc->>'back', '')), '');

    if doc_kind is null or doc_kind not in ('citizenship', 'national_id', 'driving_license', 'passport')
       or exists (select 1 from public.kyc_documents where submission_id = new_id and doc_type = doc_kind) then
      raise exception 'KYC_BAD_DOCUMENT' using errcode = 'P0001';
    end if;
    if front is null then
      raise exception 'KYC_FRONT_REQUIRED' using errcode = 'P0001', detail = doc_kind;
    end if;
    if doc_kind = 'passport' then
      back := null;
    elsif back is null then
      raise exception 'KYC_BACK_REQUIRED' using errcode = 'P0001', detail = doc_kind;
    end if;

    if left(front, length(folder)) <> folder or (back is not null and left(back, length(folder)) <> folder) then
      raise exception 'KYC_BAD_FILE' using errcode = 'P0001';
    end if;

    insert into public.kyc_documents (submission_id, doc_type, front_path, back_path)
    values (new_id, doc_kind, front, back);
  end loop;

  select full_name into me_name from public.profiles where id = me;
  insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
  select s.profile_id, 'kyc_review',
         'ID to check', 'जाँच्नुपर्ने परिचयपत्र',
         me_name || ' sent their ID for the verified badge. Check it in ID checks.',
         me_name || 'ले प्रमाणित ब्याजका लागि परिचयपत्र पठाउनुभयो। "परिचयपत्र जाँच"मा हेर्नुहोस्।',
         me_name
    from public.staff_roles s;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------
-- deliver_welcome (latest: 6400) - The welcome alert
-- ---------------------------------------------------------------------
create or replace function public.deliver_welcome(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target      record;
  first_name  text;
begin
  select id, full_name into target
    from public.profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  first_name := coalesce(
    nullif(split_part(trim(target.full_name), ' ', 1), ''),
    trim(target.full_name)
  );

  if not exists (
    select 1 from public.notifications
     where profile_id = target.id and kind = 'welcome'
  ) then
    insert into public.notifications
      (profile_id, kind, title_en, title_ne, body_en, body_ne, actor_name)
    values (
      target.id, 'welcome',
      'Welcome to Duleko 👋', 'डुलेकोमा स्वागत छ 👋',
      'Hi ' || first_name || ', welcome to Duleko! First, complete your profile: add a clear photo, your skills and a short bio so people nearby can find you. Then get verified: send a photo of your citizenship, national ID, driving licence or passport from your profile. The verified badge shows people they can trust you.',
      'नमस्ते ' || first_name || ', डुलेकोमा स्वागत छ! पहिले आफ्नो प्रोफाइल पूरा गर्नुहोस्: नजिकैका मानिसहरूले तपाईंलाई भेट्टाउन सकून् भनेर स्पष्ट फोटो, सीप र छोटो परिचय थप्नुहोस्। त्यसपछि प्रमाणित हुनुहोस्: प्रोफाइलबाट आफ्नो नागरिकता, राष्ट्रिय परिचयपत्र, सवारी चालक अनुमतिपत्र वा राहदानीको फोटो पठाउनुहोस्। प्रमाणित ब्याजले मानिसहरूलाई तपाईंमाथि भरोसा गर्न मद्दत गर्छ।',
      'Duleko'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- fan_out_job_post (latest: 6700) - New work near you (no double space when the skill has no Nepali name)
-- ---------------------------------------------------------------------
create or replace function public.fan_out_job_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  poster_name text;
  skill_en    text;
  skill_ne    text;
  budget_en   text := public.job_budget_text(new.budget_min, new.budget_max, 'en');
  budget_ne   text := public.job_budget_text(new.budget_min, new.budget_max, 'ne');
begin
  if new.kind = 'offer' then
    return null;
  end if;

  select full_name into poster_name from public.profiles where id = new.employer_profile_id;
  select name_en, name_ne into skill_en, skill_ne from public.skills where id = new.skill_id;

  insert into public.notifications
    (profile_id, kind, title_en, title_ne, body_en, body_ne, job_post_id, actor_name)
  select p.id, 'job_post',
         'New work near you: ' || new.title,
         'नजिकै नयाँ काम: ' || new.title,
         poster_name || ' needs ' || coalesce(skill_en, 'help') || ' work in ' || new.district
           || coalesce(' (' || budget_en || ')', '') || '. Send an offer if you can do it.',
         poster_name || 'लाई ' || new.district || 'मा ' || coalesce(skill_ne || ' ', '') || 'काम चाहिएको छ'
           || coalesce(' (' || budget_ne || ')', '') || '। गर्न सक्नुहुन्छ भने प्रस्ताव पठाउनुहोस्।',
         new.id, poster_name
    from public.profiles p
   where p.id <> new.employer_profile_id
     and p.district = new.district
     and p.is_available
     and exists (select 1 from public.user_skills us
                  where us.profile_id = p.id and us.skill_id = new.skill_id)
     and not public.is_profile_suspended(p.id)
   order by (p.municipality is not distinct from new.municipality) desc,
            p.rating desc, p.rating_count desc, p.created_at desc
   limit 30;

  return null;
end;
$$;
