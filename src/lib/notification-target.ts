import type { useNavigate } from "@tanstack/react-router";
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

  // The job board: a new post nearby, an offer on yours, or the post you
  // offered on settled - all open the post itself.
  if ((n.kind === "job_post" || n.kind === "job_offer" || n.kind === "job_closed") && n.job_post_id) {
    void navigate({ to: "/jobs/$jobId", params: { jobId: n.job_post_id } });
    return;
  }

  // Staff changed your service post: open it - or My posts, once it's deleted.
  if (n.kind === "post_moderated") {
    if (n.job_post_id) void navigate({ to: "/jobs/$jobId", params: { jobId: n.job_post_id } });
    else void navigate({ to: "/work", search: { role: "employer", view: "posts" } });
    return;
  }

  // Someone who called you says you made a deal: Home asks you to confirm it.
  if (n.kind === "call_deal") {
    void navigate({ to: "/home" });
    return;
  }

  // (Staff) a worker said no to a reported deal: the disputes to settle.
  if (n.kind === "deal_dispute") {
    void navigate({ to: "/staff/deals" });
    return;
  }

  // (Staff) someone sent the website's investor form.
  if (n.kind === "investor_interest") {
    void navigate({ to: "/staff/investors" });
    return;
  }

  // Duleko's fees: the verdict on your payment, or (staff) one to check.
  // A free job from a referral: where free jobs are counted.
  if (n.kind === "referral") {
    void navigate({ to: "/fees" });
    return;
  }
  if (n.kind === "fee_payment") {
    void navigate({ to: "/fees" });
    return;
  }
  if (n.kind === "fee_review") {
    void navigate({ to: "/staff/fees" });
    return;
  }

  // ID checks: (staff) one to check, or the reminder / a rejected ID,
  // which both lead to sending one.
  if (n.kind === "kyc_review") {
    void navigate({ to: "/staff/verify" });
    return;
  }
  if (n.kind === "kyc_result") {
    void navigate({ to: "/verify", search: { step: "id" } });
    return;
  }
  if (n.kind === "verify_reminder") {
    void navigate({ to: "/verify" });
    return;
  }

  if (n.kind === "friend_request" || n.kind === "friend_accepted") {
    void navigate({ to: "/friends" });
  } else if (
    n.kind === "welcome" ||
    n.kind === "verified" ||
    n.kind === "announcement" ||
    // A review from a deal agreed over a call has no job to open (6800).
    (n.kind === "review" && !n.engagement_id)
  ) {
    void navigate({ to: "/profile" });
  } else if (n.engagement_id) {
    // Job updates and reviews land on the job itself, not just the list.
    void navigate({ to: "/work", search: { job: n.engagement_id, from: "notifications" } });
  } else if (n.related_profile_id) {
    void navigate({ to: "/chat/$otherId", params: { otherId: n.related_profile_id } });
  }
}
