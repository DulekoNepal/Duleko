import { ChevronRight, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { STATUS_KEY, STATUS_TONE } from "./EngagementProgress";
import { useI18n, type StringKey } from "@/lib/i18n";
import { NEEDS_ME, dayLabel, firstName, stepOf, type Step } from "@/lib/work";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import type { EngagementWithParties } from "@/lib/types";

const ACTION_KEY: Partial<Record<Step, StringKey>> = {
  reply: "actReply",
  confirm: "actConfirm",
  markDone: "actMarkDone",
  checkDone: "actCheckDone",
  review: "actRate",
};

const STEP_DOT: Record<Step, string> = {
  reply: "bg-amber-500",
  confirm: "bg-amber-500",
  markDone: "bg-amber-500",
  checkDone: "bg-amber-500",
  review: "bg-amber-500",
  waitDoneCheck: "bg-brand-400",
  waitReply: "bg-slate-300",
  waitConfirm: "bg-brand-400",
  upcoming: "bg-brand-600",
  done: "bg-slate-400",
  declined: "bg-red-400",
  cancelled: "bg-red-400",
};

/** The one line under a job in a list: where it stands, in words. */
export function useStepLine() {
  const { t } = useI18n();
  return (e: EngagementWithParties, step: Step, myProfileId: string): string => {
    const iAmWorker = e.worker_profile_id === myProfileId;
    const name = firstName((iAmWorker ? e.employer : e.worker).full_name);
    switch (step) {
      case "reply":
        // As the worker: a fresh request, or the hirer answered my price.
        if (iAmWorker) {
          return (e.bid_count ?? 0) > 1 ? t("stepLineReplyWorkerCounter", { name }) : t("stepLineReplyWorker");
        }
        return t("stepLineReplyEmployer", { name });
      case "waitReply":
        return t("stepLineWaitReply", { name });
      case "confirm":
        return t("stepLineConfirm", { name });
      case "waitConfirm":
        return t("stepLineWaitConfirm", { name });
      case "upcoming":
        return t("stepLineUpcoming");
      case "markDone":
        return t("stepLineMarkDone");
      case "checkDone":
        return t("stepLineCheckDone", { name });
      case "waitDoneCheck":
        return t("stepLineWaitDoneCheck", { name });
      case "review":
        return t("stepLineReview", { name });
      default:
        return t(STATUS_KEY[e.status]);
    }
  };
}

/**
 * One job in a list on Work: who it's with, the day, the price, and -
 * on the Active list - where it stands. A job that waits on you says what
 * to do in a button-like chip; everything else is a plain row. Tapping
 * opens the job's sheet, where every action lives.
 *
 * `finished` is the History list: the outcome as a badge, and your
 * rating if you left one, instead of a next step.
 */
export function EngagementRow({
  engagement,
  myProfileId,
  onOpen,
  finished = false,
}: {
  engagement: EngagementWithParties;
  myProfileId: string;
  onOpen: () => void;
  finished?: boolean;
}) {
  const { t, lang } = useI18n();
  const stepLine = useStepLine();

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;
  const step = stepOf(engagement, myProfileId);
  const needsMe = !finished && NEEDS_ME.has(step);
  const action = needsMe ? ACTION_KEY[step] : undefined;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:px-4"
    >
      <Avatar name={other.full_name} src={other.avatar_url} size={40} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{engagement.title}</span>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              engagement.payment_amount == null ? "text-slate-500" : "text-slate-900",
            )}
          >
            {formatMoney(engagement.payment_amount, lang)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {other.full_name}
          <span className="text-slate-300" aria-hidden>
            {" · "}
          </span>
          {dayLabel(engagement.work_date, lang, t)}
        </span>

        {finished ? (
          <span className="mt-1.5 flex items-center gap-2">
            <Badge tone={STATUS_TONE[engagement.status]}>{t(STATUS_KEY[engagement.status])}</Badge>
            {engagement.my_review && (
              <span
                className="inline-flex items-center gap-1 text-xs text-slate-500"
                aria-label={t("workYouRated", { rating: formatNumber(engagement.my_review.rating, lang) })}
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                {formatNumber(engagement.my_review.rating, lang)}
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-2">
            <span
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 text-xs",
                needsMe ? "font-semibold text-amber-800" : "text-slate-500",
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STEP_DOT[step])} aria-hidden />
              <span className="truncate">{stepLine(engagement, step, myProfileId)}</span>
            </span>
            {action && (
              <span className="shrink-0 rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors group-hover:bg-brand-800">
                {t(action)}
              </span>
            )}
          </span>
        )}
      </span>

      {!action && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />}
    </button>
  );
}

export function EngagementRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
          <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between gap-3">
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton h-4 w-14" />
            </div>
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
