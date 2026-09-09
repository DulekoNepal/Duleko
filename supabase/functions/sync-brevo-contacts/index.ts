// =====================================================================
// Duleko :: sync-brevo-contacts
// =====================================================================
// Drains public.marketing_contact_syncs and adds each profile to a Brevo
// contact list, so hello@duleko.com's Campaigns tool (sent by hand from
// Brevo's own dashboard) has real users to reach. Called once a minute
// by pg_cron via pg_net - see supabase/migrations/20260101003400_*.sql.
//
// It never throws on a single bad row: one failure is recorded against
// that row and the rest of the batch still goes out.
//
// Secrets (supabase secrets set ...):
//   BREVO_API_KEY   the same key send-notifications uses - reused, not duplicated
//   BREVO_LIST_ID   the numeric id of the Brevo list to add contacts to
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface ContactSync {
  id: string;
  profile_id: string;
  email: string;
  full_name: string;
  lang: "en" | "ne";
  attempts: number;
}

const MAX_ATTEMPTS = 3;

const env = (key: string, fallback = "") => Deno.env.get(key) ?? fallback;

/** Brevo's default attributes - FIRSTNAME/LASTNAME need no setup in their dashboard. */
function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

async function syncContact(c: ContactSync): Promise<void> {
  const key = env("BREVO_API_KEY");
  if (!key) throw new Error("BREVO_API_KEY is not set");
  const listId = Number(env("BREVO_LIST_ID"));
  if (!listId) throw new Error("BREVO_LIST_ID is not set");

  const { first, last } = splitName(c.full_name);

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    // A batch is processed one contact at a time, awaited in sequence - a
    // single hung request with no timeout stalls the whole run, which is
    // exactly what leaves every row after it stuck on 'sending' until the
    // 10-minute requeue kicks in (and likely just stalls again the same
    // way). Failing fast here means one bad contact costs a few seconds,
    // not the rest of the batch.
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      email: c.email,
      // FIRSTNAME/LASTNAME are Brevo's own default attributes, so this
      // works with no attribute setup on their side. Anything custom
      // (locale, district) would need to be created in Brevo's Contact
      // Attributes settings first, or the API rejects the unknown key.
      attributes: { FIRSTNAME: first, LASTNAME: last },
      listIds: [listId],
      // Already-registered emails (e.g. someone re-onboarding a deleted
      // profile) update in place instead of erroring the whole row out.
      updateEnabled: true,
    }),
  });

  // Brevo returns 204 for a fresh contact and 400 "duplicate_parameter"
  // for one that already exists on the list - both count as success once
  // updateEnabled has already asked it to upsert.
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400 && /duplicate/i.test(text)) return;
    throw new Error(`brevo ${res.status}: ${text.slice(0, 300)}`);
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("claim_marketing_contact_syncs", { batch_size: 40 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const batch = (data ?? []) as ContactSync[];
  let synced = 0;
  let failed = 0;

  for (const c of batch) {
    try {
      await syncContact(c);
      await supabase
        .from("marketing_contact_syncs")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", c.id);
      synced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("marketing_contact_syncs")
        .update({
          status: c.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: message.slice(0, 500),
        })
        .eq("id", c.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ claimed: batch.length, synced, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
