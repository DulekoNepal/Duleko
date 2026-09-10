import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Briefcase, Wrench } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { EngagementRow } from "@/components/duleko/EngagementRow";
import { STATUS_ACCENT, STATUS_KEY } from "@/components/duleko/EngagementProgress";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { ENGAGEMENTS_PAGE, listMyEngagements } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";
import type { EngagementStatus } from "@/lib/types";

type Role = "worker" | "employer";

const STATUS_GROUP_ORDER: EngagementStatus[] = [
  "pending",
  "accepted",
  "confirmed",
  "completed",
  "declined",
  "cancelled",
];

// A cancelled/declined group is over, not one more section competing for
// attention at full strength - it steps back visually instead of needing
// its own loud marker to say so (same reasoning the row itself used to
// carry before status grouping made it redundant there).
function isOffRampStatus(status: EngagementStatus): boolean {
  return status === "declined" || status === "cancelled";
}

export function WorkScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const [role, setRole] = useState<Role>("worker");

  // This was unbounded: every job either side had ever had, fetched on
  // every visit to the tab.
  const engagements = useInfiniteQuery({
    queryKey: ["engagements", role, profile?.id],
    queryFn: ({ pageParam }) => listMyEngagements(profile!.id, role, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < ENGAGEMENTS_PAGE ? undefined : all.length),
    enabled: Boolean(profile?.id),
  });

  const loaded = engagements.data?.pages.flat() ?? [];

  // Grouped by status rather than one flat list of cards - the group you
  // are looking at already says the status, so nothing inside it has to
  // repeat that on every row.
  const groups = STATUS_GROUP_ORDER.map((status) => ({
    status,
    items: loaded.filter((e) => e.status === status),
  })).filter((g) => g.items.length > 0);

  if (!profile) return <SignInRequiredScreen title={t("myWork")} />;

  return (
    <>
      <AppHeader title={t("myWork")} />
      <PageContainer>
        <div className="mb-4 inline-flex w-full gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {(["worker", "employer"] as const).map((r) => {
            const Icon = r === "worker" ? Wrench : Briefcase;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  role === r
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Icon className={cn("h-4 w-4", role === r ? "text-brand-600" : "text-slate-400")} aria-hidden />
                {r === "worker" ? t("asWorker") : t("asEmployer")}
              </button>
            );
          })}
        </div>

        {engagements.isLoading ? (
          <CardSkeleton count={3} />
        ) : engagements.isError ? (
          <ErrorState
            message={errorMessage(engagements.error)}
            onRetry={() => engagements.refetch()}
            retryLabel={t("retry")}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title={t("noWorkYet")}
            hint={t("noWorkYetHint")}
          />
        ) : (
          <>
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.status}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_ACCENT[g.status])} aria-hidden />
                    {t(STATUS_KEY[g.status])}
                    <span className="font-normal text-slate-400">{formatNumber(g.items.length, lang)}</span>
                  </p>
                  <div
                    className={cn(
                      "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                      isOffRampStatus(g.status) && "opacity-70",
                    )}
                  >
                    {g.items.map((e) => (
                      <EngagementRow key={e.id} engagement={e} myProfileId={profile!.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {engagements.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  loading={engagements.isFetchingNextPage}
                  onClick={() => engagements.fetchNextPage()}
                >
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
