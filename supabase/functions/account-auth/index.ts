// =====================================================================
// Duleko :: account-auth
// =====================================================================
// 4-digit email codes and 4-digit PINs - see migration 8100.
//
// Every call is a POST with { action, ...fields } and answers 200 with
// either the result or { error: "<code>", ... } for the app to put in the
// person's own words. Only a broken request or a crash is a non-200.
//
//   email_code_send   { email, purpose: "signup" | "reset", lang }
//   email_code_verify { email, code }            -> { token_hash }
//   pin_sign_up       { phone, pin }             -> { phone, password }
//   pin_sign_in       { phone, pin }             -> { token_hash } | { phone, password }
//   pin_check         { pin }        (signed in) -> { ok }
//   pin_set           { pin, current_pin?, phone? } (signed in) -> { ok }
//
// A sign-in comes back one of two ways. An account with an email gets a
// one-time magic-link token the app redeems with verifyOtp - its email
// password is never touched. A phone-only account has no email to hang
// that on, so its Supabase password is replaced with a fresh random one
// that only this answer carries, and the app signs in with that.
//
// Deploy with --no-verify-jwt: signed-out people call it. The signed-in
// actions check the caller's token themselves.
//
// Secrets: PIN_PEPPER (new, never change it), BREVO_API_KEY and
// NOTIFY_EMAIL_FROM (shared with send-notifications).
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const env = (key: string, fallback = "") => Deno.env.get(key) ?? fallback;

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CODE_TTL_MINUTES = 10;
const RESEND_SECONDS = 45;
const CODES_PER_HOUR = 5;
const CODE_TRIES = 5;
const CODE_FAILS_PER_DAY = 10;
/** A rough brake on someone mailing codes to strangers to burn the Brevo allowance. */
const CODES_PER_HOUR_ALL = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const fail = (error: string, extra: Record<string, unknown> = {}) => reply({ error, ...extra });

// ---- small helpers ----------------------------------------------------

async function hmac(message: string): Promise<string> {
  const pepper = env("PIN_PEPPER");
  if (pepper.length < 32) throw new Error("PIN_PEPPER is not set");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function fourDigits(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return String(n).padStart(4, "0");
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(30));
  return "Duleko-" + btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "x");
}

function cleanEmail(raw: unknown): string | null {
  const email = String(raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

/** 98XXXXXXXX, or null. Same rule as isNepaliMobile in phone-auth.ts. */
function cleanPhone(raw: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("977")) digits = digits.slice(3);
  return /^9[678]\d{8}$/.test(digits) ? digits : null;
}

const isFourDigits = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

/** Same rule as isWeakPin in phone-auth.ts: 1111, 1234, 4321, 1212. */
function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const steps = pin.split("").slice(1).map((d, i) => Number(d) - Number(pin[i]));
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return true;
  const half = pin.slice(0, pin.length / 2);
  return pin === half + half;
}

const pinHash = (userId: string, pin: string) => hmac(`pin:${userId}:${pin}`);
const codeHash = (email: string, code: string) => hmac(`code:${email}:${code}`);

/** 5 wrong: 15 minutes. 10: an hour. 15 and on: a day. */
function lockFor(failed: number): number | null {
  if (failed >= 15) return 24 * 60;
  if (failed >= 10 && failed % 5 === 0) return 60;
  if (failed >= 5 && failed % 5 === 0) return 15;
  return null;
}

async function signedInUser(req: Request): Promise<User | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return null;
  // Asks Supabase Auth, so an expired or forged token gets nothing.
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

/** How the app signs this account in, without ever learning a password it could keep. */
async function sessionFor(user: User): Promise<Record<string, unknown>> {
  if (user.email && user.email_confirmed_at) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
    if (error) throw error;
    return { token_hash: data.properties.hashed_token };
  }
  const password = randomPassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  return { phone: `+${String(user.phone).replace(/\D/g, "")}`, password };
}

// ---- email ------------------------------------------------------------

const EMAIL_COPY = {
  en: {
    subject: (code: string) => `${code} is your Duleko code`,
    signup: "Enter this code in Duleko to finish creating your account.",
    reset: "Enter this code in Duleko to choose a new password.",
    expiry: `It works for ${CODE_TTL_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
  },
  ne: {
    subject: (code: string) => `तपाईंको डुलेको कोड ${code} हो`,
    signup: "खाता बनाउने काम पूरा गर्न डुलेकोमा यो कोड हाल्नुहोस्।",
    reset: "नयाँ पासवर्ड राख्न डुलेकोमा यो कोड हाल्नुहोस्।",
    expiry: `यो कोड ${CODE_TTL_MINUTES} मिनेटसम्म मात्र चल्छ। तपाईंले नमाग्नुभएको हो भने यो इमेल बेवास्ता गर्नुहोस्।`,
  },
} as const;

class EmailLimitReached extends Error {}

async function sendCodeEmail(to: string, code: string, purpose: "signup" | "reset", lang: "en" | "ne") {
  const key = env("BREVO_API_KEY");
  if (!key) throw new Error("BREVO_API_KEY is not set");
  const c = EMAIL_COPY[lang];
  const raw = env("NOTIFY_EMAIL_FROM", "Duleko <no-reply@duleko.com>");
  const match = raw.match(/^(.*)<(.+)>$/);
  const sender = match ? { name: match[1].trim(), email: match[2].trim() } : { name: "Duleko", email: raw.trim() };
  const line = purpose === "signup" ? c.signup : c.reset;

  const html = `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
    <div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px;text-align:center">
      <div style="font-size:18px;font-weight:700;color:#0f766e;margin-bottom:16px">Duleko</div>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">${line}</p>
      <div style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:12px;padding:12px 20px 12px 32px;border-radius:12px;background:#f0fdfa;color:#0f172a">${code}</div>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#94a3b8">${c.expiry}</p>
    </div>
  </body>
</html>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject: c.subject(code),
      htmlContent: html,
      textContent: `${code}\n\n${line}\n${c.expiry}`,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 402 || detail.includes("not_enough_credits")) throw new EmailLimitReached(detail);
    throw new Error(`brevo ${res.status}: ${detail}`);
  }
}

async function userByEmail(email: string): Promise<{ id: string; confirmed: boolean } | null> {
  const { data, error } = await admin.rpc("auth_user_by_email", { p_email: email });
  if (error) throw error;
  return (data as { id: string; confirmed: boolean }[])[0] ?? null;
}

async function emailCodeSend(body: Record<string, unknown>): Promise<Response> {
  const email = cleanEmail(body.email);
  if (!email) return fail("bad_email");
  const purpose = body.purpose === "reset" ? "reset" : "signup";
  const lang = body.lang === "ne" ? "ne" : "en";

  const existing = await userByEmail(email);
  if (purpose === "signup" && existing?.confirmed) return fail("email_taken");
  if (purpose === "reset" && !existing) return fail("no_account");

  const now = Date.now();
  const { data: row } = await admin.from("auth_email_codes").select("*").eq("email", email).maybeSingle();
  const hourFresh = row && now - Date.parse(row.hour_start) < 3600_000;
  const dayFresh = row && now - Date.parse(row.day_start) < 86400_000;

  if (row && dayFresh && row.day_failed >= CODE_FAILS_PER_DAY) return fail("code_locked");
  if (row) {
    const wait = Math.ceil(RESEND_SECONDS - (now - Date.parse(row.last_sent_at)) / 1000);
    if (wait > 0) return fail("too_soon", { wait });
  }
  if (hourFresh && row.hour_count >= CODES_PER_HOUR) return fail("too_many");

  const { count } = await admin
    .from("auth_email_codes")
    .select("email", { count: "exact", head: true })
    .gt("last_sent_at", new Date(now - 3600_000).toISOString());
  if ((count ?? 0) >= CODES_PER_HOUR_ALL) return fail("busy");

  const code = fourDigits();
  const { error } = await admin.from("auth_email_codes").upsert({
    email,
    purpose,
    code_hash: await codeHash(email, code),
    expires_at: new Date(now + CODE_TTL_MINUTES * 60_000).toISOString(),
    attempts: 0,
    last_sent_at: new Date(now).toISOString(),
    hour_start: hourFresh ? row.hour_start : new Date(now).toISOString(),
    hour_count: (hourFresh ? row.hour_count : 0) + 1,
    day_start: dayFresh ? row.day_start : new Date(now).toISOString(),
    day_failed: dayFresh ? row.day_failed : 0,
  });
  if (error) throw error;

  try {
    await sendCodeEmail(email, code, purpose, lang);
  } catch (err) {
    // Let them try again straight away rather than wait out a code that never left.
    await admin.from("auth_email_codes").update({ last_sent_at: new Date(0).toISOString() }).eq("email", email);
    if (err instanceof EmailLimitReached) return fail("email_limit");
    console.error(err);
    return fail("email_failed");
  }
  return reply({ ok: true });
}

async function emailCodeVerify(body: Record<string, unknown>): Promise<Response> {
  const email = cleanEmail(body.email);
  const code = String(body.code ?? "");
  if (!email || !/^\d{4}$/.test(code)) return fail("code_wrong");

  const { data: row } = await admin.from("auth_email_codes").select("*").eq("email", email).maybeSingle();
  if (!row || Date.parse(row.expires_at) < Date.now()) return fail("code_expired");
  const dayFresh = Date.now() - Date.parse(row.day_start) < 86400_000;
  if (dayFresh && row.day_failed >= CODE_FAILS_PER_DAY) return fail("code_locked");
  if (row.attempts >= CODE_TRIES) return fail("code_expired");

  if (!sameText(row.code_hash, await codeHash(email, code))) {
    const attempts = row.attempts + 1;
    await admin
      .from("auth_email_codes")
      .update({
        attempts,
        day_start: dayFresh ? row.day_start : new Date().toISOString(),
        day_failed: (dayFresh ? row.day_failed : 0) + 1,
      })
      .eq("email", email);
    return fail(attempts >= CODE_TRIES ? "code_expired" : "code_wrong", { left: CODE_TRIES - attempts });
  }

  await admin.from("auth_email_codes").delete().eq("email", email);

  let found = await userByEmail(email);
  if (!found) {
    if (row.purpose !== "signup") return fail("no_account");
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    found = { id: data.user.id, confirmed: true };
  } else if (!found.confirmed) {
    // An old sign-up that never confirmed: the code just did.
    const { error } = await admin.auth.admin.updateUserById(found.id, { email_confirm: true });
    if (error) throw error;
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return reply({ token_hash: data.properties.hashed_token });
}

// ---- PINs -------------------------------------------------------------

interface PinRow {
  user_id: string;
  phone: string;
  pin_hash: string;
  failed_count: number;
  locked_until: string | null;
}

/** Checks a PIN against its row, counting wrong tries and locking. */
async function checkPin(row: PinRow, pin: string): Promise<Response | null> {
  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
    return fail("pin_locked", { minutes: Math.ceil((Date.parse(row.locked_until) - Date.now()) / 60_000) });
  }
  if (sameText(row.pin_hash, await pinHash(row.user_id, pin))) {
    if (row.failed_count > 0 || row.locked_until) {
      await admin.from("account_pins").update({ failed_count: 0, locked_until: null }).eq("user_id", row.user_id);
    }
    return null;
  }
  const failed = row.failed_count + 1;
  const minutes = lockFor(failed);
  await admin
    .from("account_pins")
    .update({
      failed_count: failed,
      locked_until: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
    })
    .eq("user_id", row.user_id);
  return minutes ? fail("pin_locked", { minutes }) : fail("pin_wrong", { left: 5 - (failed % 5) });
}

async function pinSignUp(body: Record<string, unknown>): Promise<Response> {
  const phone = cleanPhone(body.phone);
  if (!phone) return fail("bad_phone");
  if (!isFourDigits(body.pin)) return fail("bad_pin");
  if (isWeakPin(body.pin)) return fail("weak_pin");

  const { data: taken, error: takenError } = await admin.rpc("phone_account_exists", { p_phone: phone });
  if (takenError) throw takenError;
  if (taken) return fail("phone_taken");

  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    phone: `+977${phone}`,
    phone_confirm: true,
    password,
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) return fail("phone_taken");
    throw error;
  }
  const { error: pinError } = await admin.from("account_pins").insert({
    user_id: data.user.id,
    phone,
    pin_hash: await pinHash(data.user.id, body.pin),
  });
  if (pinError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw pinError;
  }
  return reply({ phone: `+977${phone}`, password });
}

async function pinSignIn(body: Record<string, unknown>): Promise<Response> {
  const phone = cleanPhone(body.phone);
  if (!phone || !isFourDigits(body.pin)) return fail("pin_wrong");
  const { data: row } = await admin.from("account_pins").select("*").eq("phone", phone).maybeSingle();
  if (!row) return fail("pin_wrong");

  const refused = await checkPin(row as PinRow, body.pin);
  if (refused) return refused;

  const { data, error } = await admin.auth.admin.getUserById(row.user_id);
  if (error || !data.user) throw error ?? new Error("account missing");
  return reply(await sessionFor(data.user));
}

async function pinCheck(req: Request, body: Record<string, unknown>): Promise<Response> {
  const user = await signedInUser(req);
  if (!user) return fail("signed_out");
  if (!isFourDigits(body.pin)) return fail("pin_wrong");
  const { data: row } = await admin.from("account_pins").select("*").eq("user_id", user.id).maybeSingle();
  if (!row) return fail("no_pin");
  return (await checkPin(row as PinRow, body.pin)) ?? reply({ ok: true });
}

/**
 * Settings: change a PIN (the current one first), move an old 6-digit PIN
 * to 4 digits, or add a mobile number + PIN to an email or Google account.
 */
async function pinSet(req: Request, body: Record<string, unknown>): Promise<Response> {
  const user = await signedInUser(req);
  if (!user) return fail("signed_out");
  if (!isFourDigits(body.pin)) return fail("bad_pin");
  if (isWeakPin(body.pin)) return fail("weak_pin");

  const { data: row } = await admin.from("account_pins").select("*").eq("user_id", user.id).maybeSingle();
  const isPhoneAccount = !user.email && Boolean(user.phone);
  let phone: string | null;

  if (row) {
    const current = String(body.current_pin ?? "");
    if (!isFourDigits(current)) return fail("pin_wrong");
    const refused = await checkPin(row as PinRow, current);
    if (refused) return refused;
    phone = row.phone;
  } else if (isPhoneAccount) {
    const current = String(body.current_pin ?? "");
    const { data: ok, error } = await admin.rpc("legacy_pin_matches", { p_user: user.id, p_pin: current });
    if (error) throw error;
    if (!/^\d{6}$/.test(current) || !ok) return fail("pin_wrong");
    phone = cleanPhone(user.phone);
  } else {
    phone = cleanPhone(body.phone);
    if (!phone) return fail("bad_phone");
    const { data: used, error } = await admin.rpc("phone_used_by_other", { p_phone: phone, p_user: user.id });
    if (error) throw error;
    if (used) return fail("phone_taken");
  }
  if (!phone) return fail("bad_phone");

  const { error } = await admin.from("account_pins").upsert({
    user_id: user.id,
    phone,
    pin_hash: await pinHash(user.id, body.pin),
    failed_count: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return fail("phone_taken");
    throw error;
  }
  // An old 6-digit PIN was this account's password: retire it.
  if (isPhoneAccount && !row) {
    const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password: randomPassword() });
    if (pwError) throw pwError;
  }
  return reply({ ok: true });
}

// ---- entry ------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "bad_request" }, 400);
  }

  try {
    switch (body.action) {
      case "email_code_send":
        return await emailCodeSend(body);
      case "email_code_verify":
        return await emailCodeVerify(body);
      case "pin_sign_up":
        return await pinSignUp(body);
      case "pin_sign_in":
        return await pinSignIn(body);
      case "pin_check":
        return await pinCheck(req, body);
      case "pin_set":
        return await pinSet(req, body);
      default:
        return reply({ error: "bad_request" }, 400);
    }
  } catch (err) {
    console.error(err);
    return reply({ error: "server" }, 500);
  }
});
