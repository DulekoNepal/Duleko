import { Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, ChevronRight, HandCoins, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { JobCard, JobCardSkeleton, OFFER_STATUS, jobBudgetText, jobState } from "./JobParts";
import { useI18n } from "@/lib/i18n";
import { JOBS_PAGE, listMyJobPosts, listMyOffers } from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { dayLabel } from "@/lib/work";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import type { JobPost } from "@/lib/types";

/**
 * The job board as it concerns you, shown on My Work: the offers you sent
 * as a worker, and the posts you made as a hirer. The board itself (/jobs)
 * is for browsing and posting; once something is yours, it's tracked here
 * alongside the work it turns into.
 */

export function LoadMore({
  query,
}: {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}) {
  const { t } = useI18n();
  if (!query.hasNextPage) return null;
  return (
    <div className="flex justify-center pt-1">
      <Button variant="outline" size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
        {t("loadMore")}
      </Button>
    </div>
  );
}

/** The offers you sent on the board - waiting first, then what became of the rest. */
export function MyOffersList({ profileId, onOpenJob }: { profileId: string; onOpenJob: (engagementId: string) => void }) {
  const { t, lang } = useI18n();
  const offers = useInfiniteQuery({
    queryKey: ["jobs", "my-offers", profileId],
    queryFn: ({ pageParam }) => listMyOffers(profileId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < JOBS_PAGE ? undefined : all.length),
  });
  const items = (offers.data?.pages.flat() ?? []).filter((o) => o.post);

  if (offers.isLoading) return <JobCardSkeleton count={3} />;
  if (offers.isError) {
    return <ErrorState message={errorMessage(offers.error)} onRetry={() => offers.refetch()} retryLabel={t("retry")} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins />}
        title={t("jobsOffersEmpty")}
        hint={t("jobsOffersEmptyHint")}
        action={
          <Link
            to="/jobs"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-800"
          >
            {t("homeFindWork")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
    );
  }

  const rowClass =
    "group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:px-4";

  return (
    <>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
        {items.map((offer) => {
          const post = offer.post!;
          // A pending offer on a post that has since closed or run out of
          // days reads as what it is - not "waiting".
          const settled = offer.status === "pending" && jobState(post) !== "open";
          const status = OFFER_STATUS[offer.status];
          const faded = offer.status === "declined" || offer.status === "withdrawn" || settled;
          const body = (
            <>
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700",
                  faded && "opacity-60",
                )}
              >
                <SkillIcon skillId={post.skill_id ?? "other"} inherit className="h-5 w-5" />
              </span>
              <span className={cn("min-w-0 flex-1", faded && "opacity-70")}>
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{post.title}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {formatMoney(offer.amount, lang)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {post.poster?.full_name ? `${post.poster.full_name} · ` : ""}
                  {districtLabel(post.district, lang)} · {dayLabel(post.work_date, lang, t)}
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <Badge tone={settled ? "muted" : status.tone}>
                    {settled ? t(jobState(post) === "expired" ? "jobStatusExpired" : "jobStatusClosed") : t(status.key)}
                  </Badge>
                  {offer.status === "accepted" && post.engagement_id && (
                    <span className="text-xs font-medium text-brand-700">{t("workOpenJob")}</span>
                  )}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          );
          return (
            <li key={offer.id}>
              {offer.status === "accepted" && post.engagement_id ? (
                // Chosen: it's a job now - open that, not the closed post.
                <button type="button" className={rowClass} onClick={() => onOpenJob(post.engagement_id!)}>
                  {body}
                </button>
              ) : (
                <Link to="/jobs/$jobId" params={{ jobId: post.id }} className={rowClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <LoadMore query={offers} />
    </>
  );
}

/** The work you posted on the board, newest first, each with its offers count and state. */
export function MyPostsList({ profileId, onPost }: { profileId: string; onPost: () => void }) {
  const { t } = useI18n();
  const posts = useInfiniteQuery({
    queryKey: ["jobs", "mine", profileId],
    queryFn: ({ pageParam }) => listMyJobPosts(profileId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < JOBS_PAGE ? undefined : all.length),
  });
  const items = posts.data?.pages.flat() ?? [];

  if (posts.isLoading) return <JobCardSkeleton count={3} />;
  if (posts.isError) {
    return <ErrorState message={errorMessage(posts.error)} onRetry={() => posts.refetch()} retryLabel={t("retry")} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase />}
        title={t("jobsMineEmpty")}
        hint={t("jobsMineEmptyHint")}
        action={
          <Button size="sm" onClick={onPost}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("postJob")}
          </Button>
        }
      />
    );
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((post) => (
          <JobCard key={post.id} post={post} showStatus />
        ))}
      </div>
      <LoadMore query={posts} />
    </>
  );
}

/**
 * An open post of yours with offers waiting - on Work's "Needs you" list,
 * shaped like the job rows around it. Opens the post, where you choose.
 */
export function PostChoiceRow({ post }: { post: JobPost }) {
  const { t, lang } = useI18n();
  const budget = jobBudgetText(post, lang, t);
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: post.id }}
      className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:px-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <SkillIcon skillId={post.skill_id ?? "other"} inherit className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{post.title}</span>
          <span className={cn("shrink-0 text-sm font-semibold tabular-nums", budget ? "text-slate-900" : "text-slate-500")}>
            {budget ?? t("jobBudgetOpen")}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {t("jobYouPosted")} · {dayLabel(post.work_date, lang, t)}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <span className="truncate">
              {post.offer_count === 1
                ? t("workChooseOffersOne")
                : t("workChooseOffers", { count: formatNumber(post.offer_count, lang) })}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white transition-colors group-hover:bg-brand-800">
            {t("jobChoose")}
          </span>
        </span>
      </span>
    </Link>
  );
}
