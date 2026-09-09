import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { translateStatic } from "./i18n";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once .env.local has been filled in. The app shows a setup screen when false. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * One browser client for the whole app. The session is persisted so a user on a
 * cheap phone with a flaky connection stays logged in between visits.
 */
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Turns any thrown value into a short message we can show a user. */
export function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as { message?: string; error_description?: string; code?: string };
  // Postgres unique_violation on the one-phone-one-account constraint -
  // surface a friendly bilingual message instead of the raw SQL error.
  if (e.code === "23505" && e.message?.includes("profile_contacts_phone_unique")) {
    return translateStatic("phoneAlreadyRegistered");
  }
  // Supabase Auth's one-account-per-email guard (password signup on an
  // email that already has an account, Google or otherwise).
  if (
    e.code === "user_already_exists" ||
    /already registered|already exists/i.test(e.message || "")
  ) {
    return translateStatic("emailAlreadyRegistered");
  }
  // A stale, reused, or mistyped OTP - the code path, not the email/password one.
  if (
    e.code === "otp_expired" ||
    /otp.*expired|token has expired|invalid.*(otp|token)/i.test(e.message || "")
  ) {
    return translateStatic("invalidOrExpiredCode");
  }
  // Wrong email/password - Supabase's own wording ("Invalid login credentials")
  // reads like a system message, not something aimed at the person typing it.
  if (e.code === "invalid_credentials" || /invalid login credentials/i.test(e.message || "")) {
    return translateStatic("incorrectCredentials");
  }
  // The resend/reset-code cooldown Supabase enforces server-side.
  if (e.code === "over_email_send_rate_limit" || /security purposes.*after \d+ seconds/i.test(e.message || "")) {
    return translateStatic("pleaseWaitBeforeRetry");
  }
  return e.error_description || e.message || "Something went wrong. Please try again.";
}
