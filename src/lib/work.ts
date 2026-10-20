import { addDays, formatDateShort, toDateKey, todayKey } from "./utils";
import type { EngagementWithParties, Lang } from "./types";

/**
 * Where a job stands for one of its two people, and so what - if anything
 * - it is waiting on them for. One answer drives the row on Work (which
 * list it sits in, the line under its title), the banner at the top of
 * its sheet, and the action pinned to the sheet's foot.
 *
 *   reply        pending, and the latest price offer is the other side's
 *   waitReply    pending, and the latest offer is mine
 *   confirm      accepted - the hirer books it
 *   waitConfirm  accepted - the worker waits for that
 *   markDone     confirmed, and the day has come
 *   upcoming     confirmed, day still ahead
 *   checkDone    confirmed, the worker says it's done - the hirer answers
 *   waitDoneCheck  confirmed, I said it's done - waiting on the hirer
 *   review       completed, and I haven't rated them
 *   done / declined / cancelled
 */
export type Step =
  | "reply"
  | "waitReply"
  | "confirm"
  | "waitConfirm"
  | "markDone"
  | "upcoming"
  | "checkDone"
  | "waitDoneCheck"
  | "review"
  | "done"
  | "declined"
  | "cancelled";

export function stepOf(
  e: Pick<EngagementWithParties, "status" | "worker_profile_id" | "work_date" | "my_review" | "last_bidder_id" | "done_reported_at">,
  myProfileId: string,
  today = todayKey(),
): Step {
  const iAmWorker = e.worker_profile_id === myProfileId;
  switch (e.status) {
    case "pending": {
      // Nobody has named a price yet (an old request): it's the worker's to answer.
      const last = e.last_bidder_id ?? null;
      const myTurn = last === null ? iAmWorker : last !== myProfileId;
      return myTurn ? "reply" : "waitReply";
    }
    case "accepted":
      return iAmWorker ? "waitConfirm" : "confirm";
    case "confirmed":
      if (e.done_reported_at) return iAmWorker ? "waitDoneCheck" : "checkDone";
      return e.work_date <= today ? "markDone" : "upcoming";
    case "completed":
      return e.my_review ? "done" : "review";
    case "declined":
      return "declined";
    case "cancelled":
      return "cancelled";
  }
}

/** The steps that put a job under "Needs you". */
export const NEEDS_ME: ReadonlySet<Step> = new Set<Step>(["reply", "confirm", "checkDone", "markDone", "review"]);

/** "Today", "Tomorrow", "Yesterday", or the short date - for a job's day in a list. */
export function dayLabel(iso: string, lang: Lang, t: (key: "dayToday" | "dayTomorrow" | "dayYesterday") => string): string {
  const today = new Date();
  if (iso === toDateKey(today)) return t("dayToday");
  if (iso === toDateKey(addDays(today, 1))) return t("dayTomorrow");
  if (iso === toDateKey(addDays(today, -1))) return t("dayYesterday");
  return formatDateShort(iso, lang);
}

/** "Bikash" from "Bikash Thapa" - lines in a list have no room for both. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
