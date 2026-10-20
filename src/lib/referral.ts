import { siteOrigin } from "./share";
import type { StringKey } from "./i18n";

/**
 * Referral codes (7900): four letters from a member's name plus a number,
 * e.g. SANJ42. Joining with one gives the new member and the one who
 * invited them a free job each - no Duleko fee on it.
 *
 * An invite link (duleko.com/?ref=SANJ42) can be opened long before the
 * account exists - on the website, then "Create profile", then a sign-up
 * screen - so the code waits in storage until onboarding picks it up.
 */
const PENDING_KEY = "duleko.referralCode";

/** "sanj 42" -> "SANJ42": what someone types, the way the database stores it. */
export function cleanReferralCode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** Letters then digits - enough to catch a typo before asking the server. */
export function looksLikeReferralCode(code: string): boolean {
  return /^[A-Z]{4}\d{2,9}$/.test(code);
}

/** Keeps ?ref=CODE from the address the app was opened with. Called once at startup. */
export function captureReferralFromUrl(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    const code = cleanReferralCode(ref);
    if (looksLikeReferralCode(code)) window.localStorage.setItem(PENDING_KEY, code);
  } catch {
    // No storage: they can still type the code.
  }
}

export function readPendingReferral(): string {
  try {
    return window.localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingReferral(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The link to share: the website's front page, which explains Duleko first. */
export function referralLink(code: string): string {
  return `${siteOrigin()}/?ref=${encodeURIComponent(code)}`;
}

/** apply_referral()'s refusals, in the member's own words. */
export function referralErrorKey(error: unknown): StringKey | null {
  const message = (error as { message?: string })?.message ?? "";
  if (message.includes("referral_not_found")) return "referralErrNotFound";
  if (message.includes("referral_own_code")) return "referralErrOwn";
  if (message.includes("referral_already_used")) return "referralErrUsed";
  if (message.includes("referral_too_late")) return "referralErrTooLate";
  return null;
}
