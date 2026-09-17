-- =====================================================================
-- Duleko MVP :: 4200 :: Sanjay welcome chat copy
-- =====================================================================
-- Updates the automated signup message sent from Sanjay's account.
-- English only, same {first_name} placeholder as before.

update public.welcome_senders
   set message = $msg$Hi {first_name}! 👋

I'm Sanjay. I keep Duleko simple so you can find help nearby, chat, and share what you're good at without extra hassle.

The standard I hold myself to is this: if someone who isn't technical can't use and understand Duleko, it doesn't matter how well I built it.

If anything feels confusing, slow, or could be easier, message me here or on WhatsApp at +977 9766382090. I read every message.

Glad you're here.

Sanjay Gupta
Tech Lead, Duleko
+977 9766382090
www.duleko.com$msg$
 where profile_id = 'b7bc1f68-7f04-4eb4-addd-df5d71db8e98';
