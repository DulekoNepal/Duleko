# Duleko — manual test script

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
- [ ] Reload the page — the language choice is remembered.

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
- [ ] Sita's card for that job now shows "Reviewed" — she cannot review twice.
- [ ] Ram reviews Sita. Her rating updates too.
- [ ] Add a second completed job with a 3-star review → the average becomes 4.0 (2).

## F. Safety and privacy

- [ ] Sita blocks Ram. He disappears from her search results and skill counts.
- [ ] Ram no longer sees Sita in his search results either (blocking is mutual).
- [ ] Unblock from Profile → Settings → Blocked people; he reappears.
- [ ] Report a user with a reason → a row lands in `reports`.
- [ ] Sign out and open a worker URL directly (`/worker/<id>`) → you get the sign-in screen, no data.
- [ ] In the browser console, confirm no phone numbers appear in any network response for a
      profile you have no accepted work with.

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

## After the run

Check Supabase → Logs for errors, and Vercel → Deployments → Functions for build warnings.
