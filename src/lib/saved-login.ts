import type { User } from "@supabase/supabase-js";
import { signInMobile } from "./phone-auth";

/**
 * The account last signed out on this phone, so signing back in is "type
 * your PIN" rather than starting from nothing. Only who they are and how
 * they sign in - never the PIN or password, which is the key to the
 * account on a phone others in the family may pick up.
 */
export interface SavedLogin {
  method: "phone" | "email" | "google";
  /** The 10-digit mobile number, for a phone account. */
  phone: string | null;
  /** For an email or Google account. */
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

const KEY = "duleko.savedLogin";

export function readSavedLogin(): SavedLogin | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedLogin;
    return saved && typeof saved.name === "string" && saved.method ? saved : null;
  } catch {
    return null;
  }
}

export function forgetSavedLogin(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // No storage - nothing was saved.
  }
}

/** Remembers the signed-in account, from the session's user and their profile. */
export function saveLogin(user: User, profile: { full_name: string; avatar_url: string | null }): void {
  const phone = signInMobile(user);
  const providers = [
    ...((user.app_metadata?.providers as string[] | undefined) ?? []),
    user.app_metadata?.provider,
  ];
  // An email account that later added Google still signs in by email.
  const method: SavedLogin["method"] = phone
    ? "phone"
    : user.app_metadata?.provider === "email" || !providers.includes("google")
      ? "email"
      : "google";
  const saved: SavedLogin = {
    method,
    phone,
    email: phone ? null : (user.email ?? null),
    name: profile.full_name,
    avatarUrl: profile.avatar_url,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // No storage - it just won't be remembered.
  }
}
