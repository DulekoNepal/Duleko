// =====================================================================
// Duleko :: send-notifications
// =====================================================================
// Drains public.notification_deliveries and pushes each row out over
// email (Resend) or SMS (Sparrow SMS or Twilio). Called once a minute by
// pg_cron via pg_net - see supabase/migrations/20260101002500_*.sql.
//
// It never throws on a single bad row: one failure is recorded against
// that row and the rest of the batch still goes out.
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY      required for email
//   NOTIFY_EMAIL_FROM   e.g. "Duleko <hello@duleko.com>"  (default: onboarding@resend.dev)
//   SITE_URL            e.g. https://www.duleko.com       (default: same)
//   SMS_PROVIDER        "sparrow" | "twilio" | unset to disable SMS
//   SPARROW_TOKEN, SPARROW_FROM
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface Delivery {
  id: string;
  channel: "email" | "sms";
  lang: "en" | "ne";
  destination: string;
  subject: string;
  body: string;
  attempts: number;
}

const MAX_ATTEMPTS = 3;

const env = (key: string, fallback = "") => Deno.env.get(key) ?? fallback;

const SITE_URL = env("SITE_URL", "https://www.duleko.com");

const COPY = {
  en: { open: "Open Duleko", footer: "You are getting this because you have an account on Duleko.", settings: "Turn these off in Profile → Settings." },
  ne: { open: "दुलेको खोल्नुहोस्", footer: "तपाईंको दुलेकोमा खाता भएकाले यो सन्देश पठाइएको हो।", settings: "प्रोफाइल → सेटिङबाट यो बन्द गर्न सकिन्छ।" },
} as const;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function emailHtml(d: Delivery): string {
  const c = COPY[d.lang] ?? COPY.en;
  return `<!doctype html>
<html lang="${d.lang}">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;font-size:18px;font-weight:700;color:#0f766e">Duleko</div>
      <div style="padding:24px">
        <h1 style="margin:0 0 8px;font-size:18px;line-height:1.4">${escapeHtml(d.subject)}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;white-space:pre-wrap">${escapeHtml(d.body)}</p>
        <a href="${SITE_URL}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:11px 20px;border-radius:9999px;font-size:14px;font-weight:600">${c.open}</a>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;line-height:1.5">
        ${c.footer}<br />${c.settings}
      </div>
    </div>
  </body>
</html>`;
}

async function sendEmail(d: Delivery): Promise<void> {
  const key = env("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("NOTIFY_EMAIL_FROM", "Duleko <onboarding@resend.dev>"),
      to: [d.destination],
      subject: d.subject,
      html: emailHtml(d),
      text: `${d.subject}\n\n${d.body}\n\n${SITE_URL}`,
    }),
  });

  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Nepali numbers are stored however the user typed them; normalise here. */
function nepaliPhone(raw: string): { local: string; e164: string } {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00977")) digits = digits.slice(5);
  else if (digits.startsWith("977") && digits.length > 10) digits = digits.slice(3);
  return { local: digits, e164: `+977${digits}` };
}

async function sendSms(d: Delivery): Promise<void> {
  const provider = env("SMS_PROVIDER").toLowerCase();
  const phone = nepaliPhone(d.destination);

  if (provider === "sparrow") {
    const token = env("SPARROW_TOKEN");
    if (!token) throw new Error("SPARROW_TOKEN is not set");
    const res = await fetch("https://api.sparrowsms.com/v2/sms/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token,
        from: env("SPARROW_FROM", "Duleko"),
        to: phone.local,
        text: d.body,
      }),
    });
    if (!res.ok) throw new Error(`sparrow ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }

  if (provider === "twilio") {
    const sid = env("TWILIO_ACCOUNT_SID");
    const token = env("TWILIO_AUTH_TOKEN");
    if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: env("TWILIO_FROM"), To: phone.e164, Body: d.body }),
    });
    if (!res.ok) throw new Error(`twilio ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }

  throw new Error("SMS_PROVIDER is not configured");
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("claim_notification_deliveries", { batch_size: 40 });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const batch = (data ?? []) as Delivery[];
  let sent = 0;
  let failed = 0;

  for (const d of batch) {
    try {
      if (d.channel === "email") await sendEmail(d);
      else await sendSms(d);

      await supabase
        .from("notification_deliveries")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", d.id);
      sent++;
    } catch (err) {
      // Retry a couple of times, then stop paying attention to this row.
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("notification_deliveries")
        .update({
          status: d.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: message.slice(0, 500),
        })
        .eq("id", d.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ claimed: batch.length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
