import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { EngagementDetailsDialog } from "./EngagementDetailsDialog";
import { useI18n } from "@/lib/i18n";
import { formatDateShort, formatMoney } from "@/lib/utils";
import type { EngagementWithParties } from "@/lib/types";

/**
 * One dense row inside a status group on Work - name, who and when,
 * the fee, done. Every action (accept, decline, confirm, cancel, call,
 * negotiate) lives in the sheet this opens, not here: with jobs already
 * grouped by status, a row doesn't need to re-argue what its own status
 * is or what to do about it - it just needs to be tappable.
 */
export function EngagementRow({
  engagement,
  myProfileId,
}: {
  engagement: EngagementWithParties;
  myProfileId: string;
}) {
  const { t, lang } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{engagement.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {other.full_name} · {formatDateShort(engagement.work_date, lang)}
            {engagement.status === "completed" && engagement.my_review ? ` · ${t("reviewDone")}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {formatMoney(engagement.payment_amount, lang)}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      <EngagementDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        engagement={engagement}
        myProfileId={myProfileId}
      />
    </>
  );
}
