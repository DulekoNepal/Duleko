/**
 * Sharing a profile. Phones get the native share sheet (WhatsApp, Viber,
 * Messenger - how a link actually travels in Nepal); everything else
 * falls back to putting the link on the clipboard.
 */

export type ShareResult = "shared" | "cancelled" | "copied" | "failed";

/**
 * Links always point at the real site, never at whatever host the app
 * happens to be running on - otherwise a link shared from a Vercel
 * preview or from localhost is dead the moment it leaves the device.
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

/**
 * The one real address of the app, regardless of which host served the
 * page it's called from - a Vercel preview URL, a branch deploy, even
 * localhost. Anything that leaves the device (a shared link, an OAuth
 * redirect) needs to come back to this, not to `window.location.origin`.
 */
export function siteOrigin(): string {
  if (SITE_URL) return SITE_URL;
  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * The public, openable address of a profile. Takes the profile's
 * public_slug, so the link carries an opaque handle rather than the
 * database id. Passing an id still works - the app resolves either.
 */
export function profileUrl(handle: string): string {
  return `${siteOrigin()}/worker/${handle}`;
}

export async function shareProfile(
  handle: string,
  title: string,
  text: string,
): Promise<ShareResult> {
  const url = profileUrl(handle);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // Dismissing the share sheet is a normal outcome, not a failure -
      // falling through to a clipboard copy there would be surprising.
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  return copyLink(url);
}

export async function copyLink(url: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
