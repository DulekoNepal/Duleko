import { Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import type { EngagementStatus } from "@/lib/types";

/**
 * A job is a journey - requested, accepted, confirmed, done - and the
 * single most useful thing a card can say is where along it you are.
 * That is what these two views are for: a compact rail on the card you
 * scan in a list, and a full timeline in the sheet you open.
 *
 * Declining and cancelling are off-ramps, not steps, so they never draw
 * a partly-filled track pretending progress was made.
 */
export const FLOW = ["pending", "accepted", "confirmed", "completed"] as const;

const STEP_KEY = {
  pending: "stepRequested",
  accepted: "stepAccepted",
  confirmed: "stepConfirmed",
  completed: "stepDone",
} as const;

/** The accent a status paints with, used by the rail, bar and timeline. */
export const STATUS_ACCENT: Record<EngagementStatus, string> = {
  pending: "bg-amber-400",
  accepted: "bg-brand-500",
  confirmed: "bg-brand-600",
  completed: "bg-slate-400",
  declined: "bg-red-400",
  cancelled: "bg-red-400",
};

export function isOffRamp(status: EngagementStatus): boolean {
  return status === "declined" || status === "cancelled";
}

export function flowIndex(status: EngagementStatus): number {
  return (FLOW as readonly string[]).indexOf(status);
}

/**
 * One continuous line across the top of a card. Four separate segments
 * with four labels under them read as clutter at this size - a single
 * filled track says the same thing, in the status colour, and costs the
 * card no vertical space at all.
 *
 * An off-ramp fills the whole track in red: the job is not part-done,
 * it is stopped.
 */
export function ProgressBar({ status }: { status: EngagementStatus }) {
  const offRamp = isOffRamp(status);
  const filled = offRamp ? 1 : (flowIndex(status) + 1) / FLOW.length;

  return (
    <div className="h-1 w-full bg-slate-100" aria-hidden>
      <div
        className={cn("h-full transition-[width] duration-300", STATUS_ACCENT[status])}
        style={{ width: `${Math.round(filled * 100)}%` }}
      />
    </div>
  );
}

/** The laid-out version for the details sheet, with dates where known. */
export function ProgressTimeline({
  status,
  createdAt,
  completedAt,
}: {
  status: EngagementStatus;
  createdAt: string;
  completedAt: string | null;
}) {
  const { t, lang } = useI18n();
  const reached = flowIndex(status);
  const offRamp = isOffRamp(status);

  const dateFor = (step: (typeof FLOW)[number]) => {
    if (step === "pending") return formatDate(createdAt.slice(0, 10), lang);
    if (step === "completed" && completedAt) return formatDate(completedAt.slice(0, 10), lang);
    return null;
  };

  return (
    <ol className="mt-1">
      {FLOW.map((step, i) => {
        const done = !offRamp && i <= reached;
        const isNow = !offRamp && i === reached;
        const last = i === FLOW.length - 1;
        const when = dateFor(step);
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
                  done
                    ? cn("border-transparent text-white", STATUS_ACCENT[status])
                    : "border-slate-200 bg-white",
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "w-0.5 flex-1",
                    !offRamp && i < reached ? STATUS_ACCENT[status] : "bg-slate-200",
                  )}
                />
              )}
            </div>
            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
              <p
                className={cn(
                  "text-sm leading-6",
                  isNow ? "font-semibold text-slate-900" : done ? "text-slate-700" : "text-slate-400",
                )}
              >
                {t(STEP_KEY[step])}
              </p>
              {when && <p className="text-xs text-slate-400">{when}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
