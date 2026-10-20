import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useCanGoBack, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, FileText, Link2, ShieldCheck, Star, Users } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { RatingStars } from "@/components/duleko/Rating";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import { ACTIVITY_ROWS } from "@/lib/activity";
import {
  getActivityItem,
  getActivityStats,
  listActivity,
  listSkills,
  removeCallDeal,
  type ActivityItem,
  type ActivityItemType,
  type ActivityNumbers,
  type ActivityPerson,
  type ActivityRow,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Lang, Skill } from "@/lib/types";
import { formatClockTime, formatDate, formatMoney, formatNumber, relativeTime, skillName, toDateKey } from "@/lib/utils";

export type ActivityRange = "all_time" | "last_30_days";

type Tone = "warning" | "success" | "danger" | "muted" | "neutral" | "brand";

const TYPE_LABEL: Record<ActivityItemType, StringKey> = {
  call: "itemCall",
  request: "itemRequest",
  deal: "itemDeal",
  review: "itemReview",
};

const CALL_OUTCOME: Record<string, { label: StringKey; tone: Tone }> = {
  deal: { label: "callOutcomeDeal", tone: "success" },
  discussing: { label: "callOutcomeDiscussing", tone: "warning" },
  no: { label: "callOutcomeNo", tone: "muted" },
  short: { label: "callOutcomeShort", tone: "muted" },
};

const REQUEST_STATUS: Record<string, { label: StringKey; tone: Tone }> = {
  pending: { label: "statusPending", tone: "warning" },
  accepted: { label: "statusAccepted", tone: "brand" },
  declined: { label: "statusDeclined", tone: "muted" },
  confirmed: { label: "statusConfirmed", tone: "brand" },
  completed: { label: "statusCompleted", tone: "success" },
  cancelled: { label: "statusCancelled", tone: "muted" },
};

const DEAL_STATUS: Record<string, { label: StringKey; tone: Tone }> = {
  reported: { label: "dealStatusReported", tone: "warning" },
  confirmed: { label: "dealStatusConfirmed", tone: "success" },
  disputed: { label: "dealStatusDisputed", tone: "danger" },
  removed: { label: "dealStatusRemoved", tone: "muted" },
};

function statusOf(type: ActivityRow["type"], status: string | null | undefined) {
  if (type === "call") return CALL_OUTCOME[status ?? ""] ?? { label: "callOutcomeNone" as StringKey, tone: "neutral" as Tone };
  if (type === "request") return status ? REQUEST_STATUS[status] : undefined;
  if (type === "deal") return status ? DEAL_STATUS[status] : undefined;
  return undefined;
}

/** "12 Oct 2026, 9:41 am" - a moment, in the reader's calendar. */
function moment(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatDate(toDateKey(d), lang)}, ${formatClockTime(iso, lang)}`;
}

function sinceFor(range: ActivityRange): string | null {
  return range === "last_30_days" ? new Date(Date.now() - 30 * 86_400_000).toISOString() : null;
}

function useSkillNames() {
  const { lang } = useI18n();
  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  return useMemo(() => {
    const byId = new Map<string, Skill>((skills.data ?? []).map((s) => [s.id, s]));
    return (id: string | null | undefined) => (id ? skillName(byId.get(id), lang) || id : "");
  }, [skills.data, lang]);
}

/** Back that never strands you: a page opened from a shared link has nothing behind it. */
function BackButton() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: "/staff/activity" }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

/* ================================================================== */
/* /staff/activity/$kind - the records behind one number               */
/* ================================================================== */

export function ActivityListScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { kind } = useParams({ strict: false }) as { kind: string };
  const { range = "all_time" } = useSearch({ strict: false }) as { range?: ActivityRange };
  const row = ACTIVITY_ROWS.find((r) => r.key === kind);
  const isStaff = Boolean(profile?.staff_role);
  const skillLabel = useSkillNames();

  // The header total comes from the same numbers as the tiles - the list
  // itself stops at 300.
  const stats = useQuery({ queryKey: ["activity-stats"], queryFn: getActivityStats, enabled: isStaff });
  const list = useQuery({
    queryKey: ["activity-list", kind, range],
    queryFn: () => listActivity(kind as keyof ActivityNumbers, sinceFor(range)),
    enabled: isStaff && Boolean(row),
  });

  const title = row ? t(row.label) : t("activityTitle");
  if (!profile) return <SignInRequiredScreen title={title} />;

  // Active members are always the last 30 days, whichever range is picked.
  const rangeLabel = t(range === "last_30_days" || kind === "active" ? "activityLast30" : "activityAllTime");
  const value = row && stats.data?.[range][row.key];
  const total = value == null ? null : row?.money ? formatMoney(value, lang) : formatNumber(value, lang);

  return (
    <>
      <AppHeader
        title={title}
        subtitle={total ? `${total} · ${rangeLabel}` : rangeLabel}
        back={<BackButton />}
      />
      <PageContainer className="space-y-3">
        {!isStaff || !row ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : list.isPending ? (
          <CardSkeleton count={4} />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} retryLabel={t("retry")} />
        ) : !list.data.length ? (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">{t("activityListEmpty")}</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
              {list.data.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <ActivityRowLink item={item} skillLabel={skillLabel} />
                </li>
              ))}
            </ul>
            {list.data.length >= 300 && <p className="text-center text-xs text-slate-500">{t("activityListCapped")}</p>}
          </>
        )}
      </PageContainer>
    </>
  );
}

function ActivityRowLink({ item, skillLabel }: { item: ActivityRow; skillLabel: (id: string | null | undefined) => string }) {
  const { t, lang } = useI18n();
  const status = statusOf(item.type, item.status);
  const people = item.to ? `${item.from?.name ?? "?"} → ${item.to.name}` : (item.from?.name ?? "?");

  let detail: React.ReactNode;
  if (item.type === "person") {
    detail = item.times
      ? t("activityRepeatLine", { count: formatNumber(item.times, lang), amount: formatMoney(item.amount ?? 0, lang) })
      : t("activityLastSeen", { time: relativeTime(item.at, lang) });
  } else if (item.type === "review") {
    detail = (
      <span className="flex min-w-0 items-center gap-1.5">
        <RatingStars value={item.rating ?? 0} showValue={false} size={12} />
        {item.comment && <span className="truncate">{item.comment}</span>}
      </span>
    );
  } else {
    detail = [
      t(TYPE_LABEL[item.type]),
      item.title || skillLabel(item.skill_id) || null,
      item.amount != null ? formatMoney(item.amount, lang) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const body = (
    <>
      <Avatar name={item.from?.name ?? "?"} src={item.from?.photo} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{people}</p>
        <div className="mt-0.5 truncate text-xs text-slate-500">{detail}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] text-slate-400">{relativeTime(item.at, lang)}</span>
        {status && <Badge tone={status.tone}>{t(status.label)}</Badge>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </>
  );
  const box = "flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none";

  return item.type === "person" ? (
    <Link to="/worker/$workerId" params={{ workerId: item.id }} className={box}>
      {body}
    </Link>
  ) : (
    <Link to="/staff/activity/$type/$itemId" params={{ type: item.type, itemId: item.id }} className={box}>
      {body}
    </Link>
  );
}

/* ================================================================== */
/* /staff/activity/$type/$itemId - one record, in full                 */
/* ================================================================== */

export function ActivityItemScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { type, itemId } = useParams({ strict: false }) as { type: ActivityItemType; itemId: string };
  const isStaff = Boolean(profile?.staff_role);
  const known = type in TYPE_LABEL;
  const skillLabel = useSkillNames();
  const [removing, setRemoving] = useState(false);

  const item = useQuery({
    queryKey: ["activity-item", type, itemId],
    queryFn: () => getActivityItem(type, itemId),
    enabled: isStaff && known,
  });

  const remove = useMutation({
    mutationFn: () => removeCallDeal(itemId),
    onSuccess: () => {
      toast(t("activityRemoved"));
      setRemoving(false);
      void queryClient.invalidateQueries({ queryKey: ["activity-item"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-list"] });
      void queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["call-deals"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const title = known ? t(TYPE_LABEL[type]) : t("activityTitle");
  if (!profile) return <SignInRequiredScreen title={title} />;

  const data = item.data;
  const status = data ? statusOf(data.type, data.type === "call" ? data.outcome : data.status) : undefined;

  return (
    <>
      <AppHeader
        title={title}
        subtitle={data ? moment(data.created_at, lang) : undefined}
        back={<BackButton />}
        right={status && <Badge tone={status.tone}>{t(status.label)}</Badge>}
      />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff || !known ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : item.isPending ? (
          <CardSkeleton count={3} />
        ) : item.isError ? (
          <ErrorState message={errorMessage(item.error)} onRetry={() => item.refetch()} retryLabel={t("retry")} />
        ) : !data ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title={t("activityItemGone")} />
        ) : (
          <>
            <SectionCard compact icon={Users} title={t("detailPeople")}>
              <div className="grid gap-2 sm:grid-cols-2">
                <PersonCard label={t(PEOPLE_LABELS[data.type][0])} person={data.from} />
                <PersonCard label={t(PEOPLE_LABELS[data.type][1])} person={data.to} />
              </div>
            </SectionCard>

            <SectionCard compact icon={FileText} title={t("detailDetails")}>
              <dl className="divide-y divide-slate-100">
                {facts(data, t, lang, skillLabel).map(([label, value]) => (
                  <div key={label} className="flex gap-3 py-2 first:pt-0 last:pb-0">
                    <dt className="w-36 shrink-0 text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            {data.type === "request" && (
              <SectionCard compact icon={Star} title={t("detailReviews")}>
                {!data.reviews?.length ? (
                  <p className="text-xs text-slate-500">{t("detailNoReviews")}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.reviews.map((r) => (
                      <li key={r.id}>
                        <Link
                          to="/staff/activity/$type/$itemId"
                          params={{ type: "review", itemId: r.id }}
                          className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                        >
                          <Avatar name={r.from?.name ?? "?"} src={r.from?.photo} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">{r.from?.name}</p>
                            <RatingStars value={r.rating} showValue={false} size={12} />
                            {r.comment && <p className="mt-0.5 text-xs text-slate-600">{r.comment}</p>}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            <LinkedRecords item={data} />

            {data.type === "deal" && data.status !== "removed" && (
              <div className="flex justify-end">
                <Button variant="danger" onClick={() => setRemoving(true)}>
                  {t("activityRemoveDeal")}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContainer>

      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={t("activityRemoveTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              {t("activityRemoveDeal")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">{t("activityRemoveBody")}</p>
      </Dialog>
    </>
  );
}

const PEOPLE_LABELS: Record<ActivityItemType, [StringKey, StringKey]> = {
  call: ["detailCaller", "detailCallee"],
  request: ["detailHirer", "detailWorker"],
  deal: ["detailHirer", "detailWorker"],
  review: ["detailReviewer", "detailReviewee"],
};

function PersonCard({ label, person }: { label: string; person: ActivityPerson | null }) {
  const { t } = useI18n();
  const inner = (
    <>
      <Avatar name={person?.name ?? "?"} src={person?.photo} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{person?.name ?? "—"}</p>
        {person?.member_no && (
          <p className="truncate text-[11px] text-slate-500">{t("detailMemberNo", { id: person.member_no })}</p>
        )}
      </div>
      {person && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
    </>
  );
  const box = "flex items-center gap-3 rounded-xl border border-slate-200 p-2.5";
  return person ? (
    <Link
      to="/worker/$workerId"
      params={{ workerId: person.id }}
      className={`${box} transition-colors hover:border-brand-300 hover:bg-slate-50`}
    >
      {inner}
    </Link>
  ) : (
    <div className={box}>{inner}</div>
  );
}

/** The label/value rows for one record - only the ones that have a value. */
function facts(
  item: ActivityItem,
  t: ReturnType<typeof useI18n>["t"],
  lang: Lang,
  skillLabel: (id: string | null | undefined) => string,
): [string, React.ReactNode][] {
  const rows: [StringKey, React.ReactNode | null | undefined][] = [];
  const at = (iso: string | null | undefined) => (iso ? moment(iso, lang) : null);
  const day = (key: string | null | undefined) => (key ? formatDate(key, lang) : null);
  const money = (n: number | null | undefined) => (n != null ? formatMoney(n, lang) : null);
  const stars = (n: number | null | undefined) => (n ? <RatingStars value={n} showValue={false} size={14} /> : null);

  if (item.type === "call") {
    rows.push(
      ["detailWhen", at(item.created_at)],
      ["detailStatus", t((CALL_OUTCOME[item.outcome ?? ""] ?? { label: "callOutcomeNone" }).label)],
      ["detailAnswered", at(item.answered_at)],
      ["detailAskAgain", at(item.ask_again_at)],
    );
  } else if (item.type === "request") {
    rows.push(
      ["detailTitle", item.title],
      ["detailWork", skillLabel(item.skill_id)],
      ["detailDetails", item.details],
      ["detailWorkDate", day(item.work_date)],
      ["detailPlace", item.location_text],
      ["detailPrice", money(item.amount)],
      ["detailPaymentNote", item.payment_note],
      ["detailCreated", at(item.created_at)],
      ["detailCompleted", at(item.completed_at)],
      ["detailCancelledBy", item.cancelled_by?.name],
    );
  } else if (item.type === "deal") {
    rows.push(
      ["detailWork", skillLabel(item.skill_id) || t("callDealSkillOther")],
      ["detailPrice", money(item.amount)],
      ["detailDealDate", day(item.deal_date)],
      ["detailCreated", at(item.created_at)],
      ["detailWorkerAnswered", at(item.worker_answered_at)],
      ["detailConfirmBy", item.status === "reported" ? at(item.confirm_by) : null],
      ["detailRating", stars(item.rating)],
      ["detailComment", item.comment],
      ["detailRemovedBy", item.removed_by?.name],
    );
  } else {
    rows.push(
      ["detailRating", stars(item.rating)],
      ["detailComment", item.comment],
      ["detailWhen", at(item.created_at)],
    );
  }
  return rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => [t(k), v]);
}

/** Links to the records this one came from or led to. */
function LinkedRecords({ item }: { item: ActivityItem }) {
  const { t } = useI18n();
  const links: { type: ActivityItemType; id: string }[] = [];
  if (item.type === "call" && item.deal_id) links.push({ type: "deal", id: item.deal_id });
  if (item.type === "deal") {
    if (item.call_id) links.push({ type: "call", id: item.call_id });
    if (item.review_id) links.push({ type: "review", id: item.review_id });
  }
  if (item.type === "review") {
    if (item.request_id) links.push({ type: "request", id: item.request_id });
    if (item.deal_id) links.push({ type: "deal", id: item.deal_id });
  }
  if (!links.length) return null;
  return (
    <SectionCard compact icon={Link2} title={t("detailLinked")}>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.type}>
            <Link
              to="/staff/activity/$type/$itemId"
              params={{ type: l.type, itemId: l.id }}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-brand-300 hover:bg-slate-50"
            >
              {t(TYPE_LABEL[l.type])}
              <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
