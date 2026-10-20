import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Handshake,
  Inbox,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Sparkles,
  Star,
  TriangleAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CancelReasonDialog, REASON_KEY } from "./CancelReasonDialog";
import { ProgressTimeline } from "./EngagementProgress";
import { NegotiationPanel } from "./NegotiationPanel";
import { ReviewDialog } from "./ReviewDialog";
import { SkillChip } from "./SkillIcon";
import { RatingLine } from "./WorkerList";
import { PaymentMethodsList } from "./payments/PaymentMethodsManager";
import { useFeeAccount } from "@/hooks/use-fee-account";
import { feeFor, nepalDayOf } from "@/lib/fees";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import {
  answerJobDone,
  cancelEngagement,
  engagementPlaces,
  getContact,
  getFeeForJob,
  listBids,
  reportJobDone,
  setEngagementStatus,
  submitBid,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { firstName, stepOf, type Step } from "@/lib/work";
import { cn, formatDate, formatMoney, formatNumber, skillName } from "@/lib/utils";
import type { CancellationReason, EngagementStatus, EngagementWithParties } from "@/lib/types";

type Tone = "action" | "wait" | "good" | "bad" | "done";

const BANNER_TONE: Record<Tone, { box: string; icon: string; title: string; hint: string }> = {
  action: {
    box: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-800",
    title: "text-amber-900",
    hint: "text-amber-900/80",
  },
  wait: {
    box: "border-slate-200 bg-slate-50",
    icon: "bg-slate-200/70 text-slate-600",
    title: "text-slate-900",
    hint: "text-slate-600",
  },
  good: {
    box: "border-brand-200 bg-brand-50",
    icon: "bg-brand-100 text-brand-800",
    title: "text-brand-900",
    hint: "text-brand-900/80",
  },
  bad: {
    box: "border-red-200 bg-red-50",
    icon: "bg-red-100 text-red-700",
    title: "text-red-900",
    hint: "text-red-800/80",
  },
  done: {
    box: "border-slate-200 bg-slate-50",
    icon: "bg-green-100 text-green-700",
    title: "text-slate-900",
    hint: "text-slate-600",
  },
};

/**
 * The whole job in one sheet, top to bottom in the order you need it:
 * where it stands and what's next (the banner), who it's with and how to
 * reach them, the facts, the price while it's still being agreed, how to
 * pay, the details, and its progress. The one thing to do next is pinned
 * to the foot of the sheet so it's always in reach; cancelling sits at the
 * very end of the body, well away from it.
 *
 * Opened from a row on Work, or straight from a notification (?job=).
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
  const [confirming, setConfirming] = useState<"decline" | "markDone" | null>(null);

  const iAmWorker = engagement.worker_profile_id === myProfileId;
  const other = iAmWorker ? engagement.employer : engagement.worker;
  const otherFirst = firstName(other.full_name);
  const contactVisible = ["accepted", "confirmed", "completed"].includes(engagement.status);
  const isPending = engagement.status === "pending";

  const contact = useQuery({
    queryKey: ["contact", other.id],
    queryFn: () => getContact(other.id),
    enabled: open && contactVisible,
    staleTime: 5 * 60_000,
  });

  // Exact places, only while the job is live (engagement_places, 6100):
  // the job post's pin from the start, the other person's saved place once
  // it's accepted. The database decides; this just asks.
  const placesLive = ["pending", "accepted", "confirmed"].includes(engagement.status);
  const places = useQuery({
    queryKey: ["engagement-places", engagement.id, engagement.status],
    queryFn: () => engagementPlaces(engagement.id),
    enabled: open && placesLive,
    staleTime: 5 * 60_000,
  });

  // Duleko's fee on this job, for the worker: the real one once it's
  // completed, an estimate before that.
  const feeAccount = useFeeAccount(open && iAmWorker);
  const charge = useQuery({
    queryKey: ["fee-charge", engagement.id],
    queryFn: () => getFeeForJob(engagement.id),
    enabled: open && iAmWorker && engagement.status === "completed",
  });

  // The price negotiation - only meaningful while a request is pending.
  // work_engagements.payment_amount already mirrors the latest bid (a DB
  // trigger keeps it in step); the thread says who made that last move.
  const bids = useQuery({
    queryKey: ["bids", engagement.id],
    queryFn: () => listBids(engagement.id),
    enabled: open && isPending,
  });

  // Whose turn it is: from the thread once it's loaded, else from the row.
  const latestBid = bids.data?.[bids.data.length - 1];
  const step: Step = stepOf(
    {
      ...engagement,
      last_bidder_id: bids.data ? (latestBid?.bidder_profile_id ?? null) : engagement.last_bidder_id,
    },
    myProfileId,
  );
  const stepKnown = !isPending || bids.data !== undefined || engagement.last_bidder_id !== undefined;
  const bidCount = bids.data?.length ?? engagement.bid_count ?? 0;

  const invalidateJob = () => {
    queryClient.invalidateQueries({ queryKey: ["engagements"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
    queryClient.invalidateQueries({ queryKey: ["pending-for-me"] });
  };

  const bid = useMutation({
    mutationFn: ({ amount }: { amount: number; agreeing: boolean }) => submitBid(engagement.id, myProfileId, amount),
    onSuccess: (_bid, { amount, agreeing }) => {
      toast(
        agreeing
          ? t("toastAgreed", { amount: formatMoney(amount, lang), name: otherFirst })
          : t("toastCounterSent", { name: otherFirst }),
      );
      queryClient.invalidateQueries({ queryKey: ["bids", engagement.id] });
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const change = useMutation({
    mutationFn: (status: EngagementStatus) =>
      status === "completed" && iAmWorker
        ? reportJobDone(engagement.id)
        : setEngagementStatus(engagement.id, status, myProfileId),
    onSuccess: (_void, status) => {
      setConfirming(null);
      invalidateJob();
      if (status === "accepted") toast(t("toastAccepted", { name: otherFirst }));
      if (status === "declined") toast(t("toastDeclined"));
      if (status === "confirmed") toast(t("toastConfirmed"));
      if (status === "completed" && iAmWorker) {
        // A worker's "done" is a report: the hirer confirms it (7700).
        toast(t("toastDoneReported", { name: otherFirst }));
      } else if (status === "completed") {
        toast(t("toastCompleted"));
        // Finishing a job flows straight into rating it.
        if (!engagement.my_review) setReviewOpen(true);
      }
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // The hirer's "Not yet" to the worker's report.
  const notYet = useMutation({
    mutationFn: () => answerJobDone(engagement.id, false),
    onSuccess: () => {
      invalidateJob();
      toast(t("toastNotYetSent", { name: otherFirst }));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const cancel = useMutation({
    mutationFn: ({ reason, note }: { reason: CancellationReason; note: string | null }) =>
      cancelEngagement(engagement.id, myProfileId, reason, note),
    onSuccess: () => {
      invalidateJob();
      setCancelOpen(false);
      toast(t("toastCancelled"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // ---- Duleko's fee, for the worker -----------------------------------
  const rules = feeAccount.data?.rules;
  const price = engagement.payment_amount ?? 0;
  let feeLine: { text: string; free: boolean } | null = null;
  if (iAmWorker && engagement.status === "completed" && charge.data) {
    feeLine = charge.data.welcome
      ? { text: t("feeOnJobWelcome", { total: formatNumber(rules?.welcome_jobs ?? 0, lang) }), free: true }
      : charge.data.amount > 0
        ? { text: t("feeOnJob", { amount: formatMoney(charge.data.amount, lang) }), free: false }
        : null;
  } else if (
    iAmWorker &&
    rules &&
    price > 0 &&
    ["pending", "accepted", "confirmed"].includes(engagement.status) &&
    nepalDayOf(engagement.created_at) >= rules.starts_on
  ) {
    feeLine =
      (feeAccount.data?.welcome_left ?? 0) > 0
        ? { text: t("feeOnJobWelcome", { total: formatNumber(rules.welcome_jobs, lang) }), free: true }
        : { text: t("feeOnJob", { amount: formatMoney(feeFor(price, rules.tiers), lang) }), free: false };
  }
  // Fees past due pause accepting new work until they're paid.
  const feesBlockAccept = iAmWorker && isPending && Boolean(feeAccount.data?.blocked);

  // ---- The banner: where it stands, and what's next -------------------
  const date = formatDate(engagement.work_date, lang);
  const amount = formatMoney(engagement.payment_amount, lang);
  const banner = ((): { tone: Tone; icon: LucideIcon; title: string; hint: string | null } | null => {
    if (!stepKnown) return null;
    switch (step) {
      case "reply":
        return iAmWorker
          ? {
              tone: "action",
              icon: Inbox,
              title:
                bidCount > 1
                  ? t("bannerReplyWorkerCounterTitle", { name: otherFirst })
                  : t("bannerReplyWorkerTitle", { name: otherFirst }),
              hint: t("bannerReplyWorkerHint"),
            }
          : {
              tone: "action",
              icon: Handshake,
              title: t("bannerReplyEmployerTitle", { name: otherFirst }),
              hint: t("bannerReplyEmployerHint"),
            };
      case "waitReply":
        return {
          tone: "wait",
          icon: Clock,
          title: t("bannerWaitReplyTitle", { name: otherFirst }),
          hint: iAmWorker ? t("bannerWaitReplyWorkerHint", { amount }) : t("bannerWaitReplyEmployerHint"),
        };
      case "confirm":
        return {
          tone: "action",
          icon: CheckCircle2,
          title: t("bannerConfirmTitle", { name: otherFirst }),
          hint: t("bannerConfirmHint", { date }),
        };
      case "waitConfirm":
        return {
          tone: "good",
          icon: CheckCircle2,
          title: t("bannerWaitConfirmTitle"),
          hint: t("bannerWaitConfirmHint", { name: otherFirst }),
        };
      case "upcoming":
        return { tone: "good", icon: CalendarCheck, title: t("bannerUpcomingTitle", { date }), hint: t("bannerUpcomingHint") };
      case "markDone":
        return { tone: "action", icon: ClipboardCheck, title: t("bannerMarkDoneTitle"), hint: t("bannerMarkDoneHint") };
      case "checkDone":
        return {
          tone: "action",
          icon: ClipboardCheck,
          title: t("bannerCheckDoneTitle", { name: otherFirst }),
          hint: t("bannerCheckDoneHint"),
        };
      case "waitDoneCheck":
        return {
          tone: "good",
          icon: Clock,
          title: t("bannerWaitDoneCheckTitle"),
          hint: t("bannerWaitDoneCheckHint", { name: otherFirst }),
        };
      case "review":
        return { tone: "action", icon: Star, title: t("bannerReviewTitle"), hint: t("bannerReviewHint", { name: otherFirst }) };
      case "done":
        return {
          tone: "done",
          icon: CheckCircle2,
          title: t("bannerReviewTitle"),
          hint: engagement.my_review
            ? t("bannerDoneHint", { name: otherFirst, rating: formatNumber(engagement.my_review.rating, lang) })
            : null,
        };
      case "declined":
        return {
          tone: "bad",
          icon: XCircle,
          title: t("bannerDeclinedTitle"),
          hint: iAmWorker ? t("bannerDeclinedByMe") : t("bannerDeclinedByThem", { name: otherFirst }),
        };
      case "cancelled": {
        const reason = engagement.cancellation_reason ? t(REASON_KEY[engagement.cancellation_reason]) : "";
        return {
          tone: "bad",
          icon: Ban,
          title: t("bannerCancelledTitle"),
          hint: reason
            ? engagement.cancelled_by === myProfileId
              ? t("bannerCancelledByMe", { reason })
              : t("bannerCancelledByThem", { name: otherFirst, reason })
            : null,
        };
      }
    }
  })();

  // ---- The foot: the one thing to do next -----------------------------
  let footer: React.ReactNode = undefined;
  if (stepKnown) {
    if (step === "reply" && iAmWorker) {
      footer = (
        <>
          <Button variant="outline" onClick={() => setConfirming("decline")}>
            {t("decline")}
          </Button>
          <Button
            loading={change.isPending && change.variables === "accepted"}
            disabled={feesBlockAccept}
            onClick={() => change.mutate("accepted")}
          >
            <Check className="h-4 w-4" aria-hidden />
            <span className="truncate">{t("actAcceptAt", { amount })}</span>
          </Button>
        </>
      );
    } else if (step === "reply" && !iAmWorker && engagement.payment_amount != null) {
      footer = (
        <Button
          loading={bid.isPending && bid.variables?.agreeing}
          onClick={() => bid.mutate({ amount: engagement.payment_amount!, agreeing: true })}
        >
          <Handshake className="h-4 w-4" aria-hidden />
          <span className="truncate">{t("actAgreeAt", { amount })}</span>
        </Button>
      );
    } else if (step === "confirm") {
      footer = (
        <Button loading={change.isPending} onClick={() => change.mutate("confirmed")}>
          <CalendarCheck className="h-4 w-4" aria-hidden />
          {t("actConfirmBooking")}
        </Button>
      );
    } else if (step === "markDone" || step === "upcoming") {
      footer = (
        <Button variant={step === "markDone" ? "primary" : "outline"} onClick={() => setConfirming("markDone")}>
          <ClipboardCheck className="h-4 w-4" aria-hidden />
          {t("actMarkDoneFull")}
        </Button>
      );
    } else if (step === "checkDone") {
      footer = (
        <>
          <Button variant="outline" loading={notYet.isPending} disabled={change.isPending} onClick={() => notYet.mutate()}>
            {t("actNotYet")}
          </Button>
          <Button loading={change.isPending} disabled={notYet.isPending} onClick={() => change.mutate("completed")}>
            <Check className="h-4 w-4" aria-hidden />
            {t("actYesDone")}
          </Button>
        </>
      );
    } else if (step === "review") {
      footer = (
        <Button onClick={() => setReviewOpen(true)}>
          <Star className="h-4 w-4" aria-hidden />
          <span className="truncate">{t("actRateName", { name: otherFirst })}</span>
        </Button>
      );
    }
  }

  // The quiet way out at the end of the body. A worker turns down a
  // request (decline); a hirer withdraws theirs; after that either side
  // can cancel, with a reason.
  const exit: { label: string; onClick: () => void } | null = isPending
    ? iAmWorker
      ? step === "waitReply"
        ? { label: t("decline"), onClick: () => setConfirming("decline") }
        : null
      : { label: t("sheetWithdrawRequest"), onClick: () => setCancelOpen(true) }
    : engagement.status === "accepted" || engagement.status === "confirmed"
      ? { label: t("cancelWork"), onClick: () => setCancelOpen(true) }
      : null;

  const phone = contact.data?.phone ?? null;
  const priceSettled = !isPending;

  return (
    <Dialog open={open} onClose={onClose} title={engagement.title} footer={footer}>
      <div className="space-y-4">
        {banner ? (
          <Banner {...banner} />
        ) : (
          <div className="skeleton h-[68px] w-full rounded-2xl" aria-hidden />
        )}

        {engagement.status === "cancelled" && engagement.cancellation_note && (
          <p className="-mt-2 whitespace-pre-line px-1 text-xs text-slate-600">“{engagement.cancellation_note}”</p>
        )}

        {feesBlockAccept && feeAccount.data && (
          <Link
            to="/fees"
            className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 transition-colors hover:bg-red-100/70"
          >
            <TriangleAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-red-900">{t("feeBlockedTitle")}</span>
              <span className="block text-xs text-red-800/80">
                {t("feeBlockedText", { amount: formatMoney(feeAccount.data.overdue - feeAccount.data.awaiting, lang) })}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
          </Link>
        )}

        {/* Who it's with, and the two ways to reach them. */}
        <div>
          <div className="flex items-center gap-3">
            <Avatar name={other.full_name} src={other.avatar_url} size={44} profileId={other.id} />
            <div className="min-w-0 flex-1">
              <Link
                to="/worker/$workerId"
                params={{ workerId: other.id }}
                className="block truncate text-sm font-semibold text-slate-900 hover:underline"
              >
                {other.full_name}
              </Link>
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{iAmWorker ? t("sheetTheyHire") : t("sheetTheyWork")}</span>
                <RatingLine rating={other.rating} count={other.rating_count} className="text-xs" />
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  aria-label={`${t("callNow")} ${phone}`}
                  title={phone}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white transition-colors hover:bg-brand-800"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                </a>
              )}
              <Link
                to="/chat/$otherId"
                params={{ otherId: other.id }}
                aria-label={t("jobMessage")}
                title={t("jobMessage")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-surface text-slate-700 transition-colors hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          {contactVisible && phone && (
            <a href={`tel:${phone}`} className="ml-[56px] mt-1 inline-block text-xs font-medium text-brand-700 hover:underline">
              {phone}
            </a>
          )}
          {contactVisible && contact.isSuccess && !phone && (
            <p className="ml-[56px] mt-1 text-xs text-slate-400">{t("sheetNoPhone")}</p>
          )}
          {isPending && <p className="ml-[56px] mt-1 text-xs text-slate-400">{t("sheetNumbersLater")}</p>}
        </div>

        {/* The facts. While the price is still being agreed, the
            negotiation below says it - with who offered it - instead. */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-2xl border border-slate-200 p-3.5">
          {(priceSettled || bids.data?.length === 0 || bids.isError) && (
            <Fact
              icon={Wallet}
              label={
                contactVisible ? t("sheetAgreedPrice") : priceSettled ? t("sheetPrice") : t("sheetOfferedPrice")
              }
              wide
            >
              <span className="text-base font-bold tabular-nums text-slate-900">{amount}</span>
              {engagement.payment_note && (
                <span className="block text-xs font-normal text-slate-500">{engagement.payment_note}</span>
              )}
            </Fact>
          )}
          <Fact icon={CalendarDays} label={t("jobWhen")}>
            {date}
          </Fact>
          {engagement.skill ? (
            <Fact icon={Sparkles} label={t("sheetSkill")}>
              <SkillChip skillId={engagement.skill.id} category={engagement.skill.category} compact>
                {skillName(engagement.skill, lang)}
              </SkillChip>
            </Fact>
          ) : (
            <span />
          )}
          <Fact icon={MapPin} label={t("jobWhere")} wide>
            {engagement.location_text}
            {placesLive && places.data && places.data.length > 0 && (
              <span className="mt-1.5 flex flex-col items-start gap-1">
                {places.data.map((place) => (
                  <a
                    key={place.kind}
                    href={mapsLink(place.lat, place.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden />
                    {place.kind === "job"
                      ? t("placeJobSpot")
                      : place.is_shop
                        ? t("placeShop", { name: otherFirst })
                        : t("placePerson", { name: otherFirst })}
                  </a>
                ))}
                <span className="text-[11px] font-normal leading-snug text-slate-400">{t("placePrivateNote")}</span>
              </span>
            )}
          </Fact>
          {feeLine && (
            <p
              className={cn(
                "col-span-2 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs",
                feeLine.free ? "font-medium text-green-700" : "text-slate-600",
              )}
            >
              {feeLine.free ? (
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              )}
              {feeLine.text}
            </p>
          )}
        </dl>

        {isPending && bids.isLoading && <div className="skeleton h-[124px] w-full rounded-2xl" aria-hidden />}

        {isPending && bids.data && bids.data.length > 0 && (
          <NegotiationPanel
            bids={bids.data}
            myProfileId={myProfileId}
            otherName={otherFirst}
            currentAmount={engagement.payment_amount}
            myTurn={step === "reply"}
            onCounter={(value) => bid.mutateAsync({ amount: value, agreeing: false })}
            countering={bid.isPending && !bid.variables?.agreeing}
          />
        )}

        {/* The hirer pays the worker - with their own app, into the
            worker's account. Duleko never touches the money. */}
        {!iAmWorker && contactVisible && (
          <section className="@container">
            <SheetHeading>{t("payPayName", { name: otherFirst })}</SheetHeading>
            <p className="mb-2 text-xs text-slate-500">{t("payPayHint")}</p>
            <PaymentMethodsList
              owner={other.id}
              limit={1}
              empty={<p className="text-xs text-slate-500">{t("payNoneFromThem", { name: otherFirst })}</p>}
            />
          </section>
        )}

        {engagement.details && (
          <section>
            <SheetHeading>{t("jobDetails")}</SheetHeading>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{engagement.details}</p>
          </section>
        )}

        <section>
          <SheetHeading>{t("workProgress")}</SheetHeading>
          <ProgressTimeline
            status={engagement.status}
            createdAt={engagement.created_at}
            completedAt={engagement.completed_at}
          />
        </section>

        {exit && (
          <div className="border-t border-slate-100 pt-3 text-center">
            <button
              type="button"
              onClick={exit.onClick}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              {exit.label}
            </button>
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

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming === "decline" ? t("declineTitle") : t("markDoneTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {t("notNow")}
            </Button>
            <Button
              variant={confirming === "decline" ? "danger" : "primary"}
              loading={change.isPending}
              onClick={() => change.mutate(confirming === "decline" ? "declined" : "completed")}
            >
              {confirming === "decline" ? t("decline") : t("actMarkDoneFull")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {confirming === "decline"
            ? t("declineBody", { name: otherFirst })
            : iAmWorker
              ? t("markDoneBodyWorker", { name: otherFirst })
              : t("markDoneBody")}
        </p>
        {confirming === "markDone" && feeLine && (
          <p className="mt-2 text-xs text-slate-500">{feeLine.text}</p>
        )}
      </Dialog>
    </Dialog>
  );
}

function Banner({ tone, icon: Icon, title, hint }: { tone: Tone; icon: LucideIcon; title: string; hint: string | null }) {
  const style = BANNER_TONE[tone];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border px-3.5 py-3", style.box)}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", style.icon)}>
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={cn("text-sm font-semibold leading-snug", style.title)}>{title}</p>
        {hint && <p className={cn("mt-0.5 text-xs leading-relaxed", style.hint)}>{hint}</p>}
      </div>
    </div>
  );
}

/** Opens the point in the phone's maps app (or Google Maps on a computer), for directions. */
function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function Fact({
  icon: Icon,
  label,
  wide = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", wide && "col-span-2")}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="text-sm font-medium text-slate-800">{children}</dd>
      </div>
    </div>
  );
}

function SheetHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</h3>;
}
