import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CancelReasonDialog } from "./CancelReasonDialog";
import { EngagementDetailsDialog } from "./EngagementDetailsDialog";
import { ProgressBar } from "./EngagementProgress";
import { NegotiationPanel } from "./NegotiationPanel";
import { SkillChip } from "./SkillIcon";
import { ReviewDialog } from "./ReviewDialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { cancelEngagement, getContact, listBids, setEngagementStatus, submitBid } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { formatDateShort, formatMoney, skillName } from "@/lib/utils";
import type { CancellationReason, EngagementStatus, EngagementWithParties } from "@/lib/types";

const STATUS_TONE: Record<EngagementStatus, "warning" | "brand" | "success" | "muted" | "danger"> = {
  pending: "warning",
  accepted: "brand",
  confirmed: "success",
  completed: "muted",
  declined: "danger",
  cancelled: "danger",
};

const STATUS_KEY = {
  pending: "statusPending",
  accepted: "statusAccepted",
  declined: "statusDeclined",
  confirmed: "statusConfirmed",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
} as const;

export function EngagementCard({
  engagement,
  myProfileId,
}: {
  engagement: EngagementWithParties;
  myProfileId: string;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;
  const contactVisible = ["accepted", "confirmed", "completed"].includes(engagement.status);
  const isPending = engagement.status === "pending";

  const contact = useQuery({
    queryKey: ["contact", other.id],
    queryFn: () => getContact(other.id),
    enabled: contactVisible,
    staleTime: 5 * 60_000,
  });

  // The negotiation thread - only meaningful while a request is still pending.
  // work_engagements.payment_amount already mirrors the latest bid (synced by
  // a DB trigger), so this is only needed to know *who* made that last move.
  const bids = useQuery({
    queryKey: ["bids", engagement.id],
    queryFn: () => listBids(engagement.id),
    enabled: isPending,
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
        size="sm"
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
      <Button key="confirm" size="sm" loading={change.isPending} onClick={() => change.mutate("confirmed")}>
        {t("confirmWork")}
      </Button>,
    );
  }
  if (engagement.status === "confirmed") {
    actions.push(
      <Button key="complete" size="sm" loading={change.isPending} onClick={() => change.mutate("completed")}>
        {t("markComplete")}
      </Button>,
    );
  }
  if (engagement.status === "completed") {
    actions.push(
      engagement.my_review ? (
        <Badge key="reviewed" tone="success">
          {t("reviewDone")}
        </Badge>
      ) : (
        <Button key="review" size="sm" onClick={() => setReviewOpen(true)}>
          {t("leaveReview")}
        </Button>
      ),
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
    <Card className="group relative overflow-hidden p-0 transition-all duration-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60">
      {/* One line across the top carries both the state and how far along
          it is - readable before a single word of the card is. */}
      <ProgressBar status={engagement.status} />

      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <Avatar
              name={other.full_name}
              src={other.avatar_url}
              size={44}
              profileId={other.id}
              className="relative z-10"
            />
            <div className="min-w-0">
              <h3 className="truncate font-semibold leading-tight text-slate-900">
                {engagement.title}
              </h3>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {iAmWorker ? t("workForName", { name: other.full_name }) : t("workByName", { name: other.full_name })}
              </p>
              {engagement.skill && (
                <p className="mt-1.5">
                  <SkillChip skillId={engagement.skill.id} compact>
                    {skillName(engagement.skill, lang)}
                  </SkillChip>
                </p>
              )}
            </div>
          </div>
          <Badge className="shrink-0" tone={STATUS_TONE[engagement.status]}>
            {t(STATUS_KEY[engagement.status])}
          </Badge>
        </div>

        {/* The fee is what people look for first, so it is a figure, not
            the third column of a grey strip. Date and place sit beside it
            as supporting detail. */}
        <div className="mt-3 flex items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
          {/* The fee never truncates - it is the headline. The address is
              the one thing here that can be arbitrarily long, so it is
              what gives way. */}
          <div className="shrink-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {t("workCardPayment")}
            </p>
            <p className="text-lg font-bold leading-tight text-slate-900">
              {formatMoney(engagement.payment_amount, lang)}
            </p>
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-medium text-slate-700">
              {formatDateShort(engagement.work_date, lang)}
            </p>
            <p className="truncate text-xs text-slate-500">{engagement.location_text}</p>
          </div>
        </div>

        {isPending && bids.data && bids.data.length > 0 && (
          <div className="relative z-10">
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
          </div>
        )}

        {contactVisible &&
          (contact.data ? (
            <a
              href={`tel:${contact.data.phone}`}
              className="relative z-10 mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50"
            >
              <Phone className="h-4 w-4 text-slate-400" aria-hidden />
              {contact.data.phone}
            </a>
          ) : (
            <p className="mt-3 text-xs text-slate-400">{t("noPhoneSaved")}</p>
          ))}

        {/* What happens next was a grey aside that read as fine print.
            It is the single most useful line on a card mid-flow, so it
            gets a marker and a surface of its own. */}
        {waitingHint && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {waitingHint}
          </p>
        )}

        {(actions.length > 0 || canCancel) && (
          <div className="relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
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
        {/* Stretched click target: the card holds buttons, a phone link
            and the avatar link, so wrapping the lot in a button would be
            invalid markup. This covers the card instead, and every
            control above sits on z-10 - so a tap on any plain part of the
            card opens the sheet while the controls still work. */}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label={t("viewDetails")}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        />
      </CardBody>

      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        engagementId={engagement.id}
        reviewerProfileId={myProfileId}
        revieweeProfileId={other.id}
        revieweeName={other.full_name}
      />

      <EngagementDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        engagement={engagement}
        myProfileId={myProfileId}
        statusTone={STATUS_TONE[engagement.status]}
        statusLabel={t(STATUS_KEY[engagement.status])}
      />

      <CancelReasonDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        loading={cancel.isPending}
        onConfirm={(reason, note) => cancel.mutate({ reason, note })}
      />
    </Card>
  );
}
