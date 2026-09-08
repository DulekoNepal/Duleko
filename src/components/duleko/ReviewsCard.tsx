import { useState } from "react";
import { ChevronRight, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { RatingStars } from "./Rating";
import { useI18n } from "@/lib/i18n";
import { formatNumber, relativeTime } from "@/lib/utils";
import type { Review } from "@/lib/types";

/**
 * On the profile this stays small - the score, how it is spread, and the
 * most recent thing anyone said. The whole run of reviews is a tap away
 * rather than pushing every other section off the screen.
 */
export function ReviewsCard({
  reviews,
  isPending,
  rating,
  ratingCount,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  reviews: Review[];
  isPending: boolean;
  rating: number;
  ratingCount: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const latest = reviews.find((r) => r.comment?.trim());

  return (
    <Card className="mb-4">
      <CardBody>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <SectionIcon icon={Star} />
            {t("reviews")}
          </span>
        </SectionTitle>

        {isPending ? (
          <p className="py-2 text-sm text-slate-400">{t("loading")}</p>
        ) : ratingCount === 0 ? (
          <p className="py-2 text-sm text-slate-500">{t("noReviewsYet")}</p>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("reviews")}
            className="-m-1 block w-full rounded-xl p-1 text-left transition-colors duration-200 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold leading-none text-slate-900">
                {formatNumber(Number(rating).toFixed(1), lang)}
              </span>
              <span className="min-w-0 flex-1">
                <RatingStars value={Number(rating)} count={ratingCount} showCount={false} showValue={false} />
                <span className="mt-0.5 block text-xs text-slate-500">
                  {t("reviewCount", { count: formatNumber(ratingCount, lang) })}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </div>

            {latest && (
              <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-sm text-slate-600">
                <span className="font-medium text-slate-700">
                  {latest.reviewer?.full_name ?? ""}
                </span>
                <span className="mt-0.5 line-clamp-2 block">{latest.comment}</span>
              </p>
            )}
          </button>
        )}
      </CardBody>

      <ReviewsDialog
        open={open}
        onClose={() => setOpen(false)}
        reviews={reviews}
        rating={rating}
        ratingCount={ratingCount}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
      />
    </Card>
  );
}

/** Every review, with the spread of scores above them. */
function ReviewsDialog({
  open,
  onClose,
  reviews,
  rating,
  ratingCount,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  open: boolean;
  onClose: () => void;
  reviews: Review[];
  rating: number;
  ratingCount: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const { t, lang } = useI18n();

  const spread = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const mostForOneStar = Math.max(1, ...spread.map((s) => s.count));

  return (
    <Dialog open={open} onClose={onClose} title={t("reviews")}>
      <div className="flex items-center gap-5 rounded-2xl bg-slate-50 px-4 py-3.5">
        <div className="shrink-0 text-center">
          <p className="text-3xl font-bold leading-none text-slate-900">
            {formatNumber(Number(rating).toFixed(1), lang)}
          </p>
          <div className="mt-1.5 flex justify-center">
            <RatingStars value={Number(rating)} count={ratingCount} showCount={false} showValue={false} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {t("reviewCount", { count: formatNumber(ratingCount, lang) })}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {spread.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-2 shrink-0 text-[11px] font-medium text-slate-500">{star}</span>
              <Star className="h-3 w-3 shrink-0 fill-sun-400 text-sun-400" aria-hidden />
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-sun-400"
                  style={{ width: `${(count / mostForOneStar) * 100}%` }}
                />
              </span>
              <span className="w-3 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                {formatNumber(count, lang)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-2 divide-y divide-slate-100">
        {reviews.map((r) => (
          <li key={r.id} className="flex gap-3 py-3.5">
            <Avatar
              name={r.reviewer?.full_name ?? "?"}
              src={r.reviewer?.avatar_url}
              size={36}
              profileId={r.reviewer?.id}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {r.reviewer?.full_name ?? ""}
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {relativeTime(r.created_at, lang)}
                </span>
              </div>
              <div className="mt-0.5">
                <RatingStars value={r.rating} size={12} showCount={false} showValue={false} />
              </div>
              {r.comment && (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {r.comment}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-1">
          <Button variant="outline" size="sm" loading={loadingMore} onClick={onLoadMore}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
