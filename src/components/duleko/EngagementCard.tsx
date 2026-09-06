import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Phone, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CancelReasonDialog } from "./CancelReasonDialog";
import { ReviewDialog } from "./ReviewDialog";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { cancelEngagement, getContact, setEngagementStatus } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { formatDate, formatMoney, skillName } from "@/lib/utils";
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

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;
  const contactVisible = ["accepted", "confirmed", "completed"].includes(engagement.status);

  const contact = useQuery({
    queryKey: ["contact", other.id],
    queryFn: () => getContact(other.id),
    enabled: contactVisible,
    staleTime: 5 * 60_000,
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

  const actions: React.ReactNode[] = [];
  if (engagement.status === "pending" && iAmWorker) {
    actions.push(
      <Button key="accept" size="sm" loading={change.isPending} onClick={() => change.mutate("accepted")}>
        {t("accept")}
      </Button>,
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
  if (["pending", "accepted", "confirmed"].includes(engagement.status)) {
    actions.push(
      <Button
        key="cancel"
        size="sm"
        variant="ghost"
        onClick={() => setCancelOpen(true)}
      >
        {t("cancelWork")}
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

  const waitingHint =
    engagement.status === "pending"
      ? iAmWorker
        ? null
        : t("waitingOnWorker")
      : engagement.status === "accepted"
        ? iAmWorker
          ? t("waitingOnEmployer")
          : null
        : engagement.status === "confirmed"
          ? t("confirmedNext")
          : null;

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 gap-3">
            <Avatar name={other.full_name} src={other.avatar_url} size={44} />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{engagement.title}</h3>
              <p className="truncate text-sm text-slate-500">
                {iAmWorker ? "←" : "→"} {other.full_name}
                {engagement.skill ? ` · ${skillName(engagement.skill, lang)}` : ""}
              </p>
            </div>
          </div>
          <Badge tone={STATUS_TONE[engagement.status]}>{t(STATUS_KEY[engagement.status])}</Badge>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-600 sm:grid-cols-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
            {formatDate(engagement.work_date, lang)}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{engagement.location_text}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-slate-400" aria-hidden />
            {formatMoney(engagement.payment_amount, lang)}
          </div>
        </dl>

        {engagement.details && (
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{engagement.details}</p>
        )}

        {contactVisible &&
          (contact.data ? (
            <a
              href={`tel:${contact.data.phone}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {contact.data.phone}
            </a>
          ) : (
            <p className="mt-3 text-xs text-slate-400">{t("phoneHidden")}</p>
          ))}

        {waitingHint && <p className="mt-2 text-xs text-slate-500">{waitingHint}</p>}

        {actions.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </CardBody>

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
    </Card>
  );
}
