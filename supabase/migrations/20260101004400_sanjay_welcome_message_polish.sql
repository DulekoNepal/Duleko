-- =====================================================================
-- Duleko MVP :: 4400 :: Sanjay welcome chat copy, polished
-- =====================================================================
-- Tidier wording and signature for the automated signup message sent
-- from Sanjay's account. Same {first_name} placeholder. The phone number
-- now appears once, in the body, not repeated under the signature.

update public.welcome_senders
   set message = $msg$Hi {first_name},

Welcome to Duleko. I'm Sanjay, and I've built Duleko to be simple: you can find help nearby, chat, and share what you're good at without extra hassle.

I hold myself to one standard. If someone who isn't technical can't use and understand Duleko, it doesn't matter how well it was built.

If anything feels confusing, slow, or could be easier, message me here or on WhatsApp at +977 9766382090. I read every message.

Glad you're here.

Best regards,
Sanjay Gupta
Tech Lead, Duleko
www.duleko.com$msg$
 where profile_id = 'b7bc1f68-7f04-4eb4-addd-df5d71db8e98';
