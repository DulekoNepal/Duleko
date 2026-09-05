import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once .env.local has been filled in. The app shows a setup screen when false. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * One browser client for the whole app. The session is persisted so a user on a
 * cheap phone with a flaky connection stays logged in between visits.
 */
export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
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
  const e = error as { message?: string; error_description?: string };
  return e.error_description || e.message || "Something went wrong. Please try again.";
}
