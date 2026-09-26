import { Navigation, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber, locationShort, skillName } from "@/lib/utils";
import type { WorkerCardData } from "@/lib/types";

/** "★ 4.8 · 5 reviews" - no brackets around the count. */
export function RatingLine({
  rating,
  count,
  className,
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  const { t, lang } = useI18n();
  if (count <= 0) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      <Star className="h-3.5 w-3.5 fill-sun-400 text-sun-400" aria-hidden />
      <span className="font-semibold text-slate-800">{formatNumber(Number(rating).toFixed(1), lang)}</span>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <span className="text-slate-500">
        {count === 1 ? t("reviewCountOne") : t("reviewCount", { count: formatNumber(count, lang) })}
      </span>
    </span>
  );
}

/**
 * One person in a list (Home's "Available today", search results) - kept
 * deliberately plain: photo, name, what they do, rating and where, and a
 * Request button. The whole row opens their profile; the button sits above
 * that link and opens the request instead.
 */
export function WorkerRow({
  worker,
  online,
  onRequest,
  showAvailability = false,
}: {
  worker: WorkerCardData;
  online?: boolean;
  /** Omitted for your own row - you can't send yourself a request. */
  onRequest?: () => void;
  /** For mixed lists (search): notes the people who aren't taking work. */
  showAvailability?: boolean;
}) {
  const { t, lang } = useI18n();
  const place = locationShort(worker, lang);
  const skills = (worker.skills ?? []).map((s) => skillName(s, lang));
  const unavailable = showAvailability && !worker.is_available;

  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-slate-50 sm:gap-4 sm:px-5">
      <Link
        to="/worker/$workerId"
        params={{ workerId: worker.id }}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
        aria-label={worker.full_name}
      />

      <Avatar name={worker.full_name} src={worker.avatar_url} size={48} online={online} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <h3 className="truncate font-semibold text-slate-900">{worker.full_name}</h3>
          <VerifiedBadge staffRole={worker.staff_role} verified={worker.is_verified} />
        </div>

        {skills.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-slate-600">{skills.slice(0, 3).join(" · ")}</p>
        )}

        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          {worker.rating_count > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Star className="h-3 w-3 fill-sun-400 text-sun-400" aria-hidden />
              <span className="font-semibold text-slate-700">
                {formatNumber(Number(worker.rating).toFixed(1), lang)}
              </span>
            </span>
          ) : (
            <span className="shrink-0 font-medium text-brand-700">{t("newShort")}</span>
          )}
          {place && (
            <>
              <span className="shrink-0 text-slate-300" aria-hidden>
                ·
              </span>
              <span className="truncate">{place}</span>
            </>
          )}
          {worker.distance_km != null && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-brand-700">
              <Navigation className="h-3 w-3" aria-hidden />
              {t("distanceAway", { km: formatNumber(worker.distance_km, lang) })}
            </span>
          )}
          {unavailable && (
            <>
              <span className="shrink-0 text-slate-300" aria-hidden>
                ·
              </span>
              <span className="shrink-0 text-slate-400">{t("notAvailable")}</span>
            </>
          )}
        </p>
      </div>

      {onRequest && (
        <button
          type="button"
          onClick={onRequest}
          className="relative z-10 h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          {t("requestShort")}
        </button>
      )}
    </li>
  );
}

/** The card the rows sit in, with an optional footer (see all, load more). */
export function WorkerList({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">{children}</ul>
      {footer && <div className="border-t border-slate-100 bg-slate-50/70">{footer}</div>}
    </div>
  );
}

export function WorkerListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
            <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-4 w-36" />
              <div className="skeleton mt-2 h-3 w-44 max-w-full" />
              <div className="skeleton mt-1.5 h-3 w-28" />
            </div>
            <div className="skeleton h-9 w-20 shrink-0 rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}
