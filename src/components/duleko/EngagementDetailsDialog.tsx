import { CalendarDays, MapPin, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { REASON_KEY } from "./CancelReasonDialog";
import { ProgressTimeline, STATUS_ACCENT } from "./EngagementProgress";
import { SkillChip } from "./SkillIcon";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate, formatMoney, skillName } from "@/lib/utils";
import type { EngagementWithParties } from "@/lib/types";

/**
 * The whole job in one sheet: everything the card abbreviates, in full.
 * It leads with the fee and the two facts you act on, then the journey,
 * then the words - rather than a flat list where the address and the
 * price carry the same weight.
 *
 * Read-only on purpose - the actions stay on the card underneath, so
 * there is exactly one place that can move a job forward.
 */
export function EngagementDetailsDialog({
  open,
  onClose,
  engagement,
  myProfileId,
  statusTone,
  statusLabel,
}: {
  open: boolean;
  onClose: () => void;
  engagement: EngagementWithParties;
  myProfileId: string;
  statusTone: "warning" | "brand" | "success" | "muted" | "danger";
  statusLabel: string;
}) {
  const { t, lang } = useI18n();
  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;

  return (
    <Dialog open={open} onClose={onClose} title={engagement.title}>
      {/* Who, and what state it is in. */}
      <div className="flex items-center gap-3">
        <Avatar name={other.full_name} src={other.avatar_url} size={48} profileId={other.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{other.full_name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {iAmWorker ? t("workAsWorkerNote") : t("workAsEmployerNote")}
          </p>
        </div>
        <Badge className="shrink-0" tone={statusTone}>
          {statusLabel}
        </Badge>
      </div>

      {/* The fee as the headline, with the day and place under it - the
          three things you actually act on, before any prose. */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className={cn("h-1 w-full", STATUS_ACCENT[engagement.status])} aria-hidden />
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("workCardPayment")}
          </p>
          <p className="text-2xl font-bold leading-tight text-slate-900">
            {formatMoney(engagement.payment_amount, lang)}
          </p>
          {engagement.payment_note && (
            <p className="mt-1 text-xs text-slate-500">{engagement.payment_note}</p>
          )}

          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {formatDate(engagement.work_date, lang)}
            </p>
            {/* The full address - the card only ever had room to truncate it. */}
            <p className="flex items-start gap-2 text-sm text-slate-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span>{engagement.location_text}</span>
            </p>
            {engagement.skill && (
              <p className="pt-1">
                <SkillChip skillId={engagement.skill.id}>
                  {skillName(engagement.skill, lang)}
                </SkillChip>
              </p>
            )}
          </div>
        </div>
      </div>

      {engagement.cancellation_reason && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {t("cancelledBecause")} · {t(REASON_KEY[engagement.cancellation_reason])}
            </p>
            {engagement.cancellation_note && (
              <p className="mt-0.5 whitespace-pre-line text-xs text-red-700">
                {engagement.cancellation_note}
              </p>
            )}
          </div>
        </div>
      )}

      {engagement.details && (
        <section className="mt-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("jobDetails")}
          </h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {engagement.details}
          </p>
        </section>
      )}

      <section className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("workProgress")}
        </h3>
        <ProgressTimeline
          status={engagement.status}
          createdAt={engagement.created_at}
          completedAt={engagement.completed_at}
        />
      </section>
    </Dialog>
  );
}
