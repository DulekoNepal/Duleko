import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock, Handshake, Quote, ShieldCheck, X } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingStars } from "@/components/duleko/Rating";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { SettleDealDialog } from "@/components/duleko/calls/SettleDealDialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/ui/pager";
import { Segmented } from "@/components/ui/segmented";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useI18n, type StringKey } from "@/lib/i18n";
import {
  CALL_DEALS_PAGE,
  getActivityStats,
  listSkills,
  listStaffCallDeals,
  type CallDealView,
  type StaffCallDealRow,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Skill } from "@/lib/types";
import { cn, formatDate, formatMoney, formatNumber, relativeTime, skillName } from "@/lib/utils";

const VIEWS: { value: CallDealView; label: StringKey; how?: StringKey; empty: StringKey }[] = [
  { value: "disputed", label: "dealsViewDisputed", how: "dealsHowDisputed", empty: "dealsEmptyDisputed" },
  { value: "waiting", label: "dealsViewWaiting", how: "dealsHowWaiting", empty: "dealsEmptyWaiting" },
  { value: "settled", label: "dealsViewSettled", empty: "dealsEmptySettled" },
  { value: "all", label: "dealsViewAll", empty: "dealsEmptyAll" },
];

/** Settle buttons: compact on a phone, the usual small size from 640px. */
const ACTION = "h-8 gap-1.5 rounded-lg px-2.5 text-xs sm:h-9 sm:gap-2 sm:rounded-xl sm:px-3 sm:text-sm";

const STATUS: Record<StaffCallDealRow["status"], { label: StringKey; tone: "warning" | "success" | "danger" | "muted" }> = {
  reported: { label: "dealStatusReported", tone: "warning" },
  confirmed: { label: "dealStatusConfirmed", tone: "success" },
  disputed: { label: "dealStatusDisputed", tone: "danger" },
  removed: { label: "dealStatusRemoved", tone: "muted" },
};

/**
 * Staff: deals agreed over a call (6800, 8400). Opens on the disputes -
 * a customer says there was a deal, the worker says there wasn't - each
 * with what the customer reported and wrote, and the two ways to settle
 * it right on the card. The other views show deals still waiting on the
 * worker, what staff already settled, and everything.
 */
export function CallDealsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { view?: CallDealView; range?: "last_30_days" };
  const view: CallDealView = search.view ?? "disputed";
  const range = search.range ?? "all_time";
  const [settling, setSettling] = useState<{ deal: StaffCallDealRow; count: boolean } | null>(null);
  // Back to the first page whenever the view or the range changes.
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [view, range]);

  const isStaff = Boolean(profile?.staff_role);
  const stats = useQuery({ queryKey: ["activity-stats"], queryFn: getActivityStats, enabled: isStaff });
  const since = useMemo(
    () => (range === "last_30_days" ? new Date(Date.now() - 30 * 86_400_000).toISOString() : null),
    [range],
  );
  const deals = useQuery({
    queryKey: ["staff-call-deals", view, range, page],
    queryFn: () => listStaffCallDeals(view, since, page),
    enabled: isStaff,
    placeholderData: keepPreviousData,
  });

  function go(next: { view?: CallDealView; range?: "all_time" | "last_30_days" }) {
    const v = next.view ?? view;
    const r = next.range ?? range;
    void navigate({
      to: "/staff/deals",
      search: { ...(v === "disputed" ? {} : { view: v }), ...(r === "last_30_days" ? { range: r } : {}) },
      replace: true,
    });
  }
  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  const skillLabel = useMemo(() => {
    const byId = new Map<string, Skill>((skills.data ?? []).map((s) => [s.id, s]));
    return (id: string | null) => (id ? skillName(byId.get(id), lang) || id : "");
  }, [skills.data, lang]);

  if (!profile) return <SignInRequiredScreen title={t("dealsTitle")} />;

  const current = VIEWS.find((v) => v.value === view)!;
  const counts: Partial<Record<CallDealView, number>> = {
    disputed: stats.data?.disputed_deals,
    waiting: stats.data?.waiting_deals,
  };

  return (
    <>
      <AppHeader title={t("dealsTitle")} subtitle={t("dealsSubtitle")} back={<BackButton />} />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : (
          <>
            {/* The views: scrolls sideways on a narrow phone rather than wrapping. */}
            <div role="tablist" aria-label={t("dealsTitle")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
              {VIEWS.map((v) => {
                const on = v.value === view;
                const n = counts[v.value];
                return (
                  <button
                    key={v.value}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => go({ view: v.value })}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors sm:h-9 sm:px-3.5 sm:text-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                      on
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-slate-200 bg-surface text-slate-700 hover:border-brand-300",
                    )}
                  >
                    {t(v.label)}
                    {n != null && n > 0 && (
                      <span
                        className={cn(
                          "min-w-4.5 rounded-full px-1.5 text-center text-[11px] tabular-nums leading-[18px] sm:min-w-5 sm:text-xs sm:leading-5",
                          on ? "bg-white/20 text-white" : v.value === "disputed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {formatNumber(n, lang)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Last 30 days or all time, and how many that is. */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 sm:text-xs">
                {deals.data ? t("dealsCountLine", { count: formatNumber(deals.data.total, lang) }) : " "}
              </p>
              <Segmented
                label={t("dealsRangeHint")}
                options={[
                  { value: "all_time", label: t("activityAllTime") },
                  { value: "last_30_days", label: t("activityLast30") },
                ]}
                value={range}
                onChange={(next) => go({ range: next })}
              />
            </div>

            {current.how && <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">{t(current.how)}</p>}

            {deals.isPending ? (
              <CardSkeleton count={3} />
            ) : deals.isError ? (
              <ErrorState message={errorMessage(deals.error)} onRetry={() => deals.refetch()} retryLabel={t("retry")} />
            ) : deals.data.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-surface px-4 py-8 text-center sm:rounded-2xl sm:py-10">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 sm:h-11 sm:w-11">
                  {view === "disputed" ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  ) : (
                    <Handshake className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  )}
                </span>
                <p className="text-[13px] font-medium text-slate-700 sm:text-sm">{t(current.empty)}</p>
              </div>
            ) : (
              <>
                <ul className={cn("grid gap-2.5 sm:gap-3 lg:grid-cols-2", deals.isPlaceholderData && "opacity-60")}>
                  {deals.data.rows.map((deal) => (
                    <DealCard
                      key={deal.deal_id}
                      deal={deal}
                      skill={skillLabel(deal.skill_id)}
                      onSettle={(count) => setSettling({ deal, count })}
                    />
                  ))}
                </ul>
                <Pager page={page} pageSize={CALL_DEALS_PAGE} total={deals.data.total} onChange={setPage} />
              </>
            )}
          </>
        )}
      </PageContainer>

      <SettleDealDialog
        dealId={settling?.deal.deal_id ?? null}
        count={settling?.count ?? false}
        names={settling ? `${settling.deal.hirer_name} → ${settling.deal.worker_name}` : undefined}
        onClose={() => setSettling(null)}
      />
    </>
  );
}

/** Back to wherever you came from - or Profile's Staff tab, opened from an alert. */
function BackButton() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() =>
        canGoBack ? router.history.back() : router.navigate({ to: "/profile", search: { tab: "staff" } })
      }
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function DealCard({
  deal,
  skill,
  onSettle,
}: {
  deal: StaffCallDealRow;
  skill: string;
  onSettle: (count: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const open = deal.status === "disputed" && !deal.settled_at;
  // Nobody settles a deal they're part of (the database says so too).
  const ownDeal = profile?.id === deal.hirer_id || profile?.id === deal.worker_id;
  const status =
    deal.settlement === "counted"
      ? { label: "dealSettledCounted" as StringKey, tone: "success" as const }
      : deal.settlement === "no_deal"
        ? { label: "dealSettledNoDeal" as StringKey, tone: "muted" as const }
        : STATUS[deal.status];

  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-3 shadow-sm sm:rounded-2xl sm:p-3.5",
        open ? "border-red-200" : "border-slate-200",
      )}
    >
      {/* Who: the customer who reported it, and the worker. */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex shrink-0 -space-x-2">
          <Avatar name={deal.hirer_name} src={deal.hirer_photo} size={30} className="text-[11px] ring-2 ring-surface sm:h-9! sm:w-9!" />
          <Avatar name={deal.worker_name} src={deal.worker_photo} size={30} className="text-[11px] ring-2 ring-surface sm:h-9! sm:w-9!" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-x-1 text-[13px] font-semibold leading-snug text-slate-900 sm:gap-x-1.5 sm:text-sm">
            <Link to="/worker/$workerId" params={{ workerId: deal.hirer_id }} className="truncate hover:text-brand-700">
              {deal.hirer_name}
            </Link>
            <ArrowRight className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" aria-hidden />
            <Link to="/worker/$workerId" params={{ workerId: deal.worker_id }} className="truncate hover:text-brand-700">
              {deal.worker_name}
            </Link>
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-1 text-[11px] text-slate-500 sm:gap-x-1.5 sm:text-xs">
            {[skill, deal.amount != null ? formatMoney(deal.amount, lang) : null, formatDate(deal.deal_date, lang)]
              .filter(Boolean)
              .map((part, i) => (
                <span key={i} className="whitespace-nowrap">
                  {i > 0 && "· "}
                  {part}
                </span>
              ))}
          </p>
        </div>
        <Badge tone={status.tone} className="px-1.5 text-[10px] sm:px-2 sm:text-[11px]">
          {t(status.label)}
        </Badge>
      </div>

      {/* What the customer wrote about the worker - posted only if it counts. */}
      {(deal.rating || deal.comment) && (
        <div className="mt-2.5 rounded-lg bg-slate-50 px-2.5 py-2 sm:mt-3 sm:rounded-xl sm:px-3 sm:py-2.5">
          {deal.rating ? <RatingStars value={deal.rating} size={11} showCount={false} showValue={false} /> : null}
          {deal.comment && (
            <p className="mt-1 flex gap-1.5 text-xs leading-snug text-slate-700 sm:text-[13px]">
              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span className="break-words">{deal.comment}</span>
            </p>
          )}
        </div>
      )}

      {/* Where it stands. */}
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 sm:mt-2.5 sm:text-xs">
        <Clock className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" aria-hidden />
        {deal.settled_at || deal.status === "removed"
          ? t("dealsSettledLine", {
              name: deal.settled_by_name ?? "-",
              when: deal.settled_at ? relativeTime(deal.settled_at, lang) : "",
            })
          : deal.status === "disputed"
            ? t("dealsWorkerSaidNo", {
                name: deal.worker_name,
                when: deal.worker_answered_at ? relativeTime(deal.worker_answered_at, lang) : "",
              })
            : deal.status === "reported"
              ? t("dealsCountsOn", { when: formatDate(deal.confirm_by.slice(0, 10), lang) })
              : relativeTime(deal.created_at, lang)}
      </p>
      {deal.settle_note && (
        <p className="mt-1 break-words pl-[18px] text-[11px] italic text-slate-600 sm:pl-5 sm:text-xs">{deal.settle_note}</p>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-2.5 sm:gap-2 sm:pt-3">
        {open && !ownDeal && (
          <>
            <Button size="sm" className={ACTION} onClick={() => onSettle(true)}>
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
              {t("dealsCount")}
            </Button>
            <Button size="sm" variant="outline" className={ACTION} onClick={() => onSettle(false)}>
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
              {t("dealsNoDeal")}
            </Button>
          </>
        )}
        <Link
          to="/staff/activity/$type/$itemId"
          params={{ type: "deal", itemId: deal.deal_id }}
          className="ml-auto inline-flex h-8 items-center gap-0.5 rounded-lg px-1.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 sm:px-2 sm:text-xs"
        >
          {t("dealsOpen")}
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
        </Link>
      </div>
    </li>
  );
}
