-- =====================================================================
-- Duleko MVP :: 3600 :: "Get verified" broadcast
-- =====================================================================
-- A new notification kind for staff-initiated broadcasts about profile
-- verification, plus a one-time send: every current profile except the
-- three staff members gets the notification (and, since email defaults
-- on in notification_prefs, a matching email via the existing delivery
-- pipeline - see 2500_notification_delivery.sql's trigger, which fires
-- on insert into public.notifications same as any other kind).

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in
    ('request','accepted','declined','confirmed','completed','cancelled','review',
     'friend_request','friend_accepted','message','welcome','verified','verify_reminder'));

insert into public.notifications (profile_id, kind, title_en, title_ne, body_en, body_ne)
select
  p.id, 'verify_reminder',
  'Get your verified badge ✅',
  'तपाईंको प्रमाणित ब्याज लिनुहोस् ✅',
  'Duleko now has profile verification! Complete your profile - a clear photo, your skills, and a short bio - and our team will review it for the verified badge. Update it anytime from the Profile tab.',
  'डुलेकोमा अब प्रोफाइल प्रमाणीकरण सुरु भएको छ! आफ्नो प्रोफाइल पूरा गर्नुहोस् - स्पष्ट फोटो, सीपहरू, र छोटो परिचय - हाम्रो टिमले हेरेर प्रमाणित ब्याज दिनेछ। प्रोफाइल ट्याबबाट जुनसुकै बेला अपडेट गर्न सकिन्छ।'
from public.profiles p
where not exists (select 1 from public.staff_roles sr where sr.profile_id = p.id);
