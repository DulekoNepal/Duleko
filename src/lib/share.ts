/**
 * Sharing a profile. Phones get the native share sheet (WhatsApp, Viber,
 * Messenger - how a link actually travels in Nepal); everything else
 * falls back to putting the link on the clipboard.
 */

export type ShareResult = "shared" | "cancelled" | "copied" | "failed";

/** The public, openable address of a profile. */
export function profileUrl(profileId: string): string {
  return `${window.location.origin}/worker/${profileId}`;
}

export async function shareProfile(
  profileId: string,
  title: string,
  text: string,
): Promise<ShareResult> {
  const url = profileUrl(profileId);

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
