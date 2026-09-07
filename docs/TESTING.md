# Duleko - manual test script

Run this against the deployed URL, not localhost, before inviting beta users.
You need two browsers (or one normal + one private window) so you can be two
people at once. Call them **Ram** (worker) and **Sita** (employer).

## A. Sign up and onboarding

- [ ] Sign up as Ram. With "Confirm email" off you land straight in onboarding.
- [ ] Step 1: photo, name, phone. A bad phone number (e.g. `12345`) is rejected.
- [ ] Step 2: province → district → municipality. Picking a district auto-fills its province.
- [ ] Step 3: pick Electrician + Plumber. Finish.
- [ ] Home screen greets you by first name.
- [ ] Supabase → Table editor: one row in `profiles`, one in `profile_contacts`, two in `user_skills`.
- [ ] Repeat as Sita in the second browser, same district, **no skills**.

## B. Language

- [ ] Toggle EN/नेपाली in the header. Every label switches, including skill names.
- [ ] Numbers in ratings and dates render as Nepali digits (१२३) in Nepali mode.
- [ ] Reload the page - the language choice is remembered.

## C. Search and discovery

- [ ] As Sita: home shows Ram under "Available today".
- [ ] Tap the Electrician tile → search filtered to electricians, Ram is listed.
- [ ] Filters: switch district to a far one → no results, empty state offers "Clear filters".
- [ ] Set "Free on" to a date → Ram still appears (nothing is booked yet).
- [ ] Open Ram's profile. **His phone number must NOT be visible.** The note says it appears after he accepts.

## D. Work request lifecycle

- [ ] Sita → Request work: title, date (today or later), location, payment 1500. Send.
- [ ] Past date is rejected.
- [ ] Ram: bell shows 1 unread; notification reads "New work request".
- [ ] Ram → Work → "Work I do": the job is **Waiting**, with Accept / Decline.
- [ ] Ram accepts.
- [ ] **Now both sides can see each other's phone number** on the job card, as a tappable `tel:` link.
- [ ] Sita gets "Request accepted" and a Confirm button. Confirm it.
- [ ] Ram's profile calendar now shows that day in amber (booked by a confirmed job) and he cannot untick it manually.
- [ ] Search with "Free on" = that date → Ram no longer appears.
- [ ] Either side taps "Mark completed".
- [ ] Both sides receive a "Work completed" notification.

## E. Reviews and ratings

- [ ] Sita leaves 5 stars + comment. Ram's profile shows 5.0 (1).
- [ ] Sita's card for that job now shows "Reviewed" - she cannot review twice.
- [ ] Ram reviews Sita. Her rating updates too.
- [ ] Add a second completed job with a 3-star review → the average becomes 4.0 (2).

## F. Safety and privacy

- [ ] Report a user with a reason → a row lands in `reports`.
- [ ] Signed in, open a stranger's profile with no work request and no friendship between you:
      **Call** and **Chat** both work (this is the open beta rule).
- [ ] Open a profile of someone who never saved a number: Call is greyed out with "has not
      added a phone number yet", but Chat still works.
- [ ] Sign out and open a worker URL directly (`/worker/<id>`): the profile is browsable as a
      guest, but Call and Chat both bounce you to sign-in.
- [ ] As a signed-out guest, confirm in the browser console that **no** phone number appears in
      any network response - `profile_contacts` should come back empty, not merely hidden in the UI.

## G. Invalid transitions (should all fail)

- [ ] Sita tries to accept her own request (via a stale tab): rejected, "Only the worker can accept".
- [ ] Ram tries to confirm: rejected, "Only the employer can confirm".
- [ ] Requesting work from yourself is not possible (no button on your own profile).

## H. Phone and slow network

- [ ] Open the deployed URL on a real Android phone.
- [ ] Bottom navigation is reachable one-handed; no horizontal scrolling anywhere.
- [ ] Chrome DevTools → Network → Slow 3G: skeletons appear, nothing flashes blank, and the
      app still works.
- [ ] Nepali text renders correctly (no tofu boxes) on the phone.

## I. Welcome message (needs one profile flagged `is_official`)

- [ ] Sign up as a brand new person. Alerts shows a 👋 **Welcome to Duleko** notification.
- [ ] Chats shows an unread thread from the official account with the founder's note, and the
      name carries the blue check.
- [ ] The greeting uses the new person's **first name only**, in the language they picked at
      signup.
- [ ] Reply to that thread - it sends, even though there is no work engagement or friendship
      between the two accounts.
- [ ] The official account can open the same thread and reply back.
- [ ] Signing up a second time does not produce a second welcome for the first person
      (`select public.deliver_welcome('<their profile id>');` in the SQL editor is a no-op).

## J. Email and SMS alerts (needs the edge function deployed)

- [ ] Profile → Settings shows **Email & SMS alerts** with email on and SMS off.
- [ ] Send Sita a work request. Within a minute her inbox has it, and
      `select status, count(*) from notification_deliveries group by 1;` shows a `sent` row.
- [ ] Turn email off in her settings, send another request: no new row for her.
- [ ] Message Sita while she has the app open: **no** email (the presence guard).
- [ ] Close her app, wait three minutes, message twice in a row: exactly **one** email.
- [ ] Turn SMS on for an account with a saved phone number, send a work request: one text.
      A chat message to the same account sends no text (chat is not in `sms_kinds`).
- [ ] Break a secret on purpose (e.g. a bad `RESEND_API_KEY`): the row lands in `failed`
      after three tries, with the provider's message in `last_error`, and nothing else stalls.

## K. Chat (needs two accounts, ideally two phones)

- [ ] Tap ⋯ on your own recent message: React, Reply, Edit, Unsend. On theirs: React, Reply only.
- [ ] Tap ⋯ on a message you unsent: no menu at all.
- [ ] React → the six quick emoji, then **+** → the full grid (48) scrolls. Picking from either
      applies; picking the same one again removes it.
- [ ] Reply to a message: the quote bar appears above the composer, the sent message shows the
      quoted stub, and tapping the stub scrolls to the original and rings it.
- [ ] Edit one of your messages: the text changes for both sides and picks up "· edited".
- [ ] Wait 15 minutes, then open ⋯ on that same message: Edit is gone. (The database refuses it
      even if you force the request.)
- [ ] On a phone, swipe **left** on your own message and **right** on theirs → both open a reply.
      Swiping the other way does nothing, and vertical swipes still scroll the thread.
- [ ] From the other account, try to edit a message you did not send (via a crafted request):
      rejected, "Only the sender can edit this message".

## L. Chat list, without opening a thread

- [ ] While they type, their row shows "typing…" and stops on its own a few seconds after they do.
- [ ] Your own last message shows a single tick, turning into a double tick once they open it.
- [ ] React to a message from the other account: the emoji appears at the end of that row.
- [ ] Unsend the last message: the row preview switches to "This message was removed."

## After the run

Check Supabase → Logs for errors, and Vercel → Deployments → Functions for build warnings.
For the notification pipeline, Supabase → Edge Functions → `send-notifications` → Logs shows
one line per run (`claimed / sent / failed`).
