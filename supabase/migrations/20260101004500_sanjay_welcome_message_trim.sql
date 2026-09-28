-- =====================================================================
-- Duleko MVP :: 4500 :: Sanjay welcome chat copy, trimmed
-- =====================================================================
-- Drops the "I hold myself to one standard..." paragraph from the
-- automated signup message sent from Sanjay's account. Everything else
-- is unchanged from 4400. Same {first_name} placeholder.

update public.welcome_senders
   set message = $msg$Hi {first_name},

Welcome to Duleko. I'm Sanjay, and I've built Duleko to be simple: you can find help nearby, chat, and share what you're good at without extra hassle.

If anything feels confusing, slow, or could be easier, message me here or on WhatsApp at +977 9766382090. I read every message.

Glad you're here.

Best regards,
Sanjay Gupta
Tech Lead, Duleko
www.duleko.com$msg$
 where profile_id = 'b7bc1f68-7f04-4eb4-addd-df5d71db8e98';
