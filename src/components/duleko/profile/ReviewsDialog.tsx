import { useInfiniteQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { ReviewsPanel } from "@/components/duleko/ReviewsPanel";
import { Dialog } from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { REVIEWS_PAGE, listReviewsFor } from "@/lib/queries";

/**
 * What others said about you. Kept off the Overview page; it opens from
 * the Rating and Reviews numbers in the header. Loads only once opened.
 */
export function ReviewsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { profile } = useSession();
  const id = profile?.id;
  const hasReviews = (profile?.rating_count ?? 0) > 0;
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", id],
    queryFn: ({ pageParam }) => listReviewsFor(id!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < REVIEWS_PAGE ? undefined : all.length),
    enabled: open && Boolean(id) && hasReviews,
  });
  if (!profile) return null;

  return (
    <Dialog open={open} onClose={onClose} title={t("reviews")}>
      {hasReviews ? (
        <ReviewsPanel
          bare
          reviews={reviews.data?.pages.flat() ?? []}
          isPending={reviews.isPending}
          hasMore={reviews.hasNextPage}
          loadingMore={reviews.isFetchingNextPage}
          onLoadMore={() => reviews.fetchNextPage()}
          rating={Number(profile.rating)}
          ratingCount={profile.rating_count}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-sun-500 ring-1 ring-slate-200">
            <Star className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">{t("noReviewsYet")}</span>
            <span className="block text-xs text-slate-500">{t("profileReviewsEmptyHint")}</span>
          </span>
        </div>
      )}
    </Dialog>
  );
}
