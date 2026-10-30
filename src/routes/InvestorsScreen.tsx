import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock, Mail, MapPin, RotateCcw, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/ui/pager";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { translateIn, useI18n, type StringKey } from "@/lib/i18n";
import {
  INVESTORS_PAGE,
  countNewInvestorInterests,
  listStaffInvestorInterests,
  markInvestorInterestReplied,
  type InvestorInterestRow,
  type InvestorView,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

const VIEWS: { value: InvestorView; label: StringKey; empty: StringKey }[] = [
  { value: "new", label: "investorsViewNew", empty: "investorsEmptyNew" },
  { value: "all", label: "investorsViewAll", empty: "investorsEmptyAll" },
];

/** Card buttons: compact on a phone, the usual small size from 640px. */
const ACTION = "h-8 gap-1.5 rounded-lg px-2.5 text-xs sm:h-9 sm:gap-2 sm:rounded-xl sm:px-3 sm:text-sm";

/**
 * Staff: messages from the website's "Invest in Duleko" form (8500). Opens
 * on the ones nobody has answered yet, oldest first. Each is in Duleko's
 * official inbox too; whoever replies marks it here so the others know.
 */
export function InvestorsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { view?: InvestorView };
  const view: InvestorView = search.view ?? "new";
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [view]);

  const isStaff = Boolean(profile?.staff_role);
  const waiting = useQuery({ queryKey: ["investor-interests-new"], queryFn: countNewInvestorInterests, enabled: isStaff });
  const list = useQuery({
    queryKey: ["staff-investor-interests", view, page],
    queryFn: () => listStaffInvestorInterests(view, page),
    enabled: isStaff,
    placeholderData: keepPreviousData,
  });

  if (!profile) return <SignInRequiredScreen title={t("investorsTitle")} />;

  const current = VIEWS.find((v) => v.value === view)!;

  return (
    <>
      <AppHeader title={t("investorsTitle")} subtitle={t("investorsSubtitle")} back={<BackButton />} />
      <PageContainer className="space-y-3 md:space-y-4">
        {!isStaff ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title={t("activitySubtitle")} />
        ) : (
          <>
            <div role="tablist" aria-label={t("investorsTitle")} className="flex gap-2">
              {VIEWS.map((v) => {
                const on = v.value === view;
                const n = v.value === "new" ? waiting.data : undefined;
                return (
                  <button
                    key={v.value}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() =>
                      navigate({ to: "/staff/investors", search: v.value === "new" ? {} : { view: v.value }, replace: true })
                    }
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
                          on ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {formatNumber(n, lang)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">{t("investorsHow")}</p>

            {list.isPending ? (
              <CardSkeleton count={3} />
            ) : list.isError ? (
              <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} retryLabel={t("retry")} />
            ) : list.data.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-surface px-4 py-8 text-center sm:rounded-2xl sm:py-10">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 sm:h-11 sm:w-11">
                  {view === "new" ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  ) : (
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  )}
                </span>
                <p className="text-[13px] font-medium text-slate-700 sm:text-sm">{t(current.empty)}</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  {t("investorsCountLine", { count: formatNumber(list.data.total, lang) })}
                </p>
                <ul className={cn("grid gap-2.5 sm:gap-3 lg:grid-cols-2", list.isPlaceholderData && "opacity-60")}>
                  {list.data.rows.map((row) => (
                    <InvestorCard key={row.id} row={row} />
                  ))}
                </ul>
                <Pager page={page} pageSize={INVESTORS_PAGE} total={list.data.total} onChange={setPage} />
              </>
            )}
          </>
        )}
      </PageContainer>
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

function InvestorCard({ row }: { row: InvestorInterestRow }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const replied = Boolean(row.replied_at);
  const mark = useMutation({
    mutationFn: (next: boolean) => markInvestorInterestReplied(row.id, next),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff-investor-interests"] });
      void queryClient.invalidateQueries({ queryKey: ["investor-interests-new"] });
    },
  });
  // Reply in their own language: the subject line follows the form's.
  const subject = translateIn(row.lang, "investorsReplySubject");
  const mailto = `mailto:${row.email}?subject=${encodeURIComponent(subject)}`;

  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-3 shadow-sm sm:rounded-2xl sm:p-3.5",
        replied ? "border-slate-200" : "border-amber-200",
      )}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 sm:h-9 sm:w-9">
          <TrendingUp className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug text-slate-900 sm:text-sm">{row.full_name}</p>
          <a href={mailto} className="block truncate text-[11px] text-brand-700 hover:underline sm:text-xs">
            {row.email}
          </a>
        </div>
        <Badge tone={replied ? "success" : "warning"} className="px-1.5 text-[10px] sm:px-2 sm:text-[11px]">
          {t(replied ? "investorsReplied" : "investorsNew")}
        </Badge>
      </div>

      <p className="mt-2 flex gap-1.5 text-[11px] text-slate-600 sm:text-xs">
        <MapPin className="mt-px h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" aria-hidden />
        <span className="break-words">{row.address}</span>
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-700 sm:mt-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-[13px]">
        {row.message}
      </p>

      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 sm:mt-2.5 sm:text-xs">
        <Clock className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" aria-hidden />
        {replied
          ? t("investorsRepliedLine", { name: row.replied_by_name ?? "-", when: relativeTime(row.replied_at!, lang) })
          : relativeTime(row.created_at, lang)}
        {row.profile_id && (
          <Link
            to="/worker/$workerId"
            params={{ workerId: row.profile_id }}
            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
          >
            · <UserRound className="h-3 w-3" aria-hidden />
            {t("investorsMember")}
          </Link>
        )}
      </p>

      {mark.isError && <p className="mt-1.5 text-[11px] text-red-600 sm:text-xs">{errorMessage(mark.error)}</p>}

      <div className="mt-auto flex items-center gap-1.5 pt-2.5 sm:gap-2 sm:pt-3">
        <Button size="sm" className={ACTION} onClick={() => window.open(mailto, "_self")}>
          <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          {t("investorsReply")}
        </Button>
        {replied ? (
          <Button size="sm" variant="outline" className={ACTION} disabled={mark.isPending} onClick={() => mark.mutate(false)}>
            <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            {t("investorsUndo")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className={ACTION} disabled={mark.isPending} onClick={() => mark.mutate(true)}>
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            {t("investorsMarkReplied")}
          </Button>
        )}
      </div>
    </li>
  );
}
