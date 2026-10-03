import type { useNavigate } from "@tanstack/react-router";
import { getEngagement } from "@/lib/queries";
import type { AppNotification } from "@/lib/types";

/**
 * Where a notification leads - shared by the Alerts list and a tapped
 * phone alert, so both open exactly the same screen.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

/** The first web link in a notification's text, if it carries one. */
export function linkIn(n: {
  kind: string;
  body_en: string | null;
  body_ne: string | null;
  title_en: string;
  title_ne: string;
}): string | null {
  // Only staff announcements are trusted to carry a link - other kinds
  // embed user-written text (job titles, names) that could hold anything.
  if (n.kind !== "announcement") return null;
  const text = [n.body_en, n.body_ne, n.title_en, n.title_ne].join(" ");
  const match = text.match(URL_RE);
  // Trailing punctuation belongs to the sentence, not the address.
  return match ? match[0].replace(/[.,;:!?]+$/, "") : null;
}

export async function openNotification(
  n: AppNotification,
  navigate: ReturnType<typeof useNavigate>,
  myProfileId: string,
): Promise<void> {
  // A link written into the notification wins: it opens in a new tab,
  // leaving this list where it was.
  const link = linkIn(n);
  if (link) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  // A notice opens whole - its full image and text - on the board.
  if (n.kind === "notice" && n.notice_id) {
    void navigate({ to: "/notices/$noticeId", params: { noticeId: n.notice_id } });
    return;
  }

  // "Someone accepted your request" is about a person - show who.
  if (n.kind === "accepted" && n.engagement_id) {
    try {
      const job = await getEngagement(n.engagement_id, myProfileId);
      if (job) {
        void navigate({ to: "/worker/$workerId", params: { workerId: job.worker_profile_id } });
        return;
      }
    } catch {
      // Fall through to the job itself.
    }
  }

  if (n.kind === "friend_request" || n.kind === "friend_accepted") {
    void navigate({ to: "/friends" });
  } else if (
    n.kind === "welcome" ||
    n.kind === "verified" ||
    n.kind === "verify_reminder" ||
    n.kind === "announcement"
  ) {
    void navigate({ to: "/profile" });
  } else if (n.engagement_id) {
    // Job updates and reviews land on the job itself, not just the list.
    void navigate({ to: "/work", search: { job: n.engagement_id, from: "notifications" } });
  } else if (n.related_profile_id) {
    void navigate({ to: "/chat/$otherId", params: { otherId: n.related_profile_id } });
  }
}
