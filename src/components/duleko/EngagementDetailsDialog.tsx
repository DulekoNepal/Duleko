import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Info, MapPin, Phone, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CancelReasonDialog, REASON_KEY } from "./CancelReasonDialog";
import { ProgressTimeline, STATUS_KEY, STATUS_TONE } from "./EngagementProgress";
import { NegotiationPanel } from "./NegotiationPanel";
import { ReviewDialog } from "./ReviewDialog";
import { SkillChip } from "./SkillIcon";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  cancelEngagement,
  getContact,
  listBids,
  setEngagementStatus,
  submitBid,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { formatDate, formatMoney, skillName } from "@/lib/utils";
import type { CancellationReason, EngagementStatus, EngagementWithParties } from "@/lib/types";

/**
 * The whole job in one sheet - what a row on Work only ever had room to
 * summarise, plus every action that moves it forward. This is now the
 * one place a job actually gets acted on; the row that opens it is pure
 * navigation, so a list of many jobs can stay a dense list of rows
 * instead of a stack of large cards.
 */
export function EngagementDetailsDialog({
  open,
  onClose,
  engagement,
  myProfileId,
}: {
  open: boolean;
  onClose: () => void;
  engagement: EngagementWithParties;
  myProfileId: string;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;
  const contactVisible = ["accepted", "confirmed", "completed"].includes(engagement.status);
  const isPending = engagement.status === "pending";

  const contact = useQuery({
    queryKey: ["contact", other.id],
    queryFn: () => getContact(other.id),
    enabled: open && contactVisible,
    staleTime: 5 * 60_000,
  });

  // The negotiation thread - only meaningful while a request is still pending.
  // work_engagements.payment_amount already mirrors the latest bid (synced by
  // a DB trigger), so this is only needed to know *who* made that last move.
  const bids = useQuery({
    queryKey: ["bids", engagement.id],
    queryFn: () => listBids(engagement.id),
    enabled: open && isPending,
  });

  const bid = useMutation({
    mutationFn: (amount: number) => submitBid(engagement.id, myProfileId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids", engagement.id] });
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const change = useMutation({
    mutationFn: (status: EngagementStatus) => setEngagementStatus(engagement.id, status, myProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const cancel = useMutation({
    mutationFn: ({ reason, note }: { reason: CancellationReason; note: string | null }) =>
      cancelEngagement(engagement.id, myProfileId, reason, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      setCancelOpen(false);
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // Split rather than one flat row: the move-it-forward action belongs on
  // the right where the eye finishes, and cancelling belongs well away
  // from it as a quiet text button - not shoulder to shoulder with it.
  // Accepting a price lives inside the NegotiationPanel below, since that
  // is the one action that both settles the amount and advances the job.
  const actions: React.ReactNode[] = [];
  if (engagement.status === "pending" && iAmWorker) {
    actions.push(
      <Button
        key="decline"
        variant="outline"
        loading={change.isPending}
        onClick={() => change.mutate("declined")}
      >
        {t("decline")}
      </Button>,
    );
  }
  if (engagement.status === "accepted" && !iAmWorker) {
    actions.push(
      <Button key="confirm" loading={change.isPending} onClick={() => change.mutate("confirmed")}>
        {t("confirmWork")}
      </Button>,
    );
  }
  if (engagement.status === "confirmed") {
    actions.push(
      <Button key="complete" loading={change.isPending} onClick={() => change.mutate("completed")}>
        {t("markComplete")}
      </Button>,
    );
  }
  if (engagement.status === "completed" && !engagement.my_review) {
    actions.push(
      <Button key="review" onClick={() => setReviewOpen(true)}>
        {t("leaveReview")}
      </Button>,
    );
  }

  const canCancel = ["pending", "accepted", "confirmed"].includes(engagement.status);

  const waitingHint =
    engagement.status === "pending"
      ? null // superseded by the negotiation block below, which is more specific
      : engagement.status === "accepted"
        ? iAmWorker
          ? t("waitingOnEmployer")
          : null
        : engagement.status === "confirmed"
          ? t("confirmedNext")
          : null;

  return (
    <Dialog open={open} onClose={onClose} title={engagement.title}>
      {/* Same flat, compact rhythm as the row that opens this - small
          text, no boxes-within-a-box, just space-y doing the separating.
          Nothing here is cut, only tightened: every section the old
          larger sheet had is still below, just lighter on the page. */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={other.full_name} src={other.avatar_url} size={40} profileId={other.id} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{other.full_name}</p>
            <p className="text-xs text-slate-500">
              {iAmWorker ? t("workAsWorkerNote") : t("workAsEmployerNote")}
            </p>
          </div>
          <Badge className="shrink-0" tone={STATUS_TONE[engagement.status]}>
            {t(STATUS_KEY[engagement.status])}
          </Badge>
        </div>

        {/* Fee leads as a plain bold figure, same as the row - date sits
            beside it, the full address (never truncated here) under it. */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-xl font-bold leading-tight text-slate-900">
              {formatMoney(engagement.payment_amount, lang)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatDate(engagement.work_date, lang)}
            </span>
          </div>
          {engagement.payment_note && (
            <p className="mt-0.5 text-xs text-slate-500">{engagement.payment_note}</p>
          )}
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>{engagement.location_text}</span>
          </p>
          {engagement.skill && (
            <p className="mt-1.5">
              <SkillChip skillId={engagement.skill.id} compact>
                {skillName(engagement.skill, lang)}
              </SkillChip>
            </p>
          )}
        </div>

        {isPending && bids.data && bids.data.length > 0 && (
          <NegotiationPanel
            bids={bids.data}
            myProfileId={myProfileId}
            otherName={other.full_name}
            otherAvatarUrl={other.avatar_url}
            otherProfileId={other.id}
            currentAmount={engagement.payment_amount}
            canAccept={iAmWorker}
            onAccept={() => change.mutate("accepted")}
            accepting={change.isPending}
            onCounter={(amount) => bid.mutate(amount)}
            countering={bid.isPending}
          />
        )}

        {contactVisible &&
          (contact.data ? (
            <a
              href={`tel:${contact.data.phone}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors duration-200 hover:text-brand-800"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {contact.data.phone}
            </a>
          ) : (
            <p className="text-xs text-slate-400">{t("noPhoneSaved")}</p>
          ))}

        {waitingHint && (
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {waitingHint}
          </p>
        )}

        {engagement.cancellation_reason && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-800">
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
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {t("jobDetails")}
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {engagement.details}
            </p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3">
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("workProgress")}
          </h3>
          <ProgressTimeline
            status={engagement.status}
            createdAt={engagement.created_at}
            completedAt={engagement.completed_at}
          />
        </div>

        {(actions.length > 0 || canCancel) && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="rounded-lg px-1 py-1 text-xs font-medium text-slate-500 transition-colors duration-200 hover:text-red-600"
              >
                {t("cancelWork")}
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          </div>
        )}
      </div>

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        engagementId={engagement.id}
        reviewerProfileId={myProfileId}
        revieweeProfileId={other.id}
        revieweeName={other.full_name}
      />

      <CancelReasonDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        loading={cancel.isPending}
        onConfirm={(reason, note) => cancel.mutate({ reason, note })}
      />
    </Dialog>
  );
}
