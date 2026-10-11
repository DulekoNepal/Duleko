import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Globe, MapPin, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { useI18n, type StringKey } from "@/lib/i18n";
import { ALL_DISTRICTS, districtLabel } from "@/lib/nepal";
import { cn, formatMoney, formatNumber, todayKey } from "@/lib/utils";
import type { JobOfferStatus, JobPost, Lang } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/** "Rs 1,000 – 1,500", "Rs 1,000", or null when the poster left it open. */
export function jobBudgetText(post: Pick<JobPost, "budget_min" | "budget_max">, lang: Lang): string | null {
  const { budget_min: lo, budget_max: hi } = post;
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null && lo !== hi) {
    return `${formatMoney(lo, lang)} – ${formatNumber(Math.round(hi).toLocaleString("en-IN"), lang)}`;
  }
  return formatMoney(lo ?? hi, lang);
}

export type JobState = "open" | "assigned" | "closed" | "expired";

/** Open posts whose day has gone by stop taking offers, so they read as such. */
export function jobState(post: Pick<JobPost, "status" | "work_date">): JobState {
  if (post.status === "open" && post.work_date < todayKey()) return "expired";
  return post.status;
}

const STATE_LABEL: Record<JobState, StringKey> = {
  open: "jobStatusOpen",
  assigned: "jobStatusAssigned",
  closed: "jobStatusClosed",
  expired: "jobStatusExpired",
};

export function JobStateBadge({ post, className }: { post: Pick<JobPost, "status" | "work_date">; className?: string }) {
  const { t } = useI18n();
  const state = jobState(post);
  return (
    <Badge tone={state === "open" ? "brand" : state === "assigned" ? "success" : "muted"} className={className}>
      {state === "open" && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />}
      {t(STATE_LABEL[state])}
    </Badge>
  );
}

/** What became of an offer a worker sent, as a short badge. */
export const OFFER_STATUS: Record<JobOfferStatus, { key: StringKey; tone: "warning" | "success" | "muted" }> = {
  pending: { key: "jobOfferWaitingShort", tone: "warning" },
  accepted: { key: "jobOfferChosenShort", tone: "success" },
  declined: { key: "jobOfferNotChosenShort", tone: "muted" },
  withdrawn: { key: "jobOfferWithdrawnShort", tone: "muted" },
};

export function offerCountText(count: number, t: ReturnType<typeof useI18n>["t"], lang: Lang): string {
  if (count <= 0) return t("jobNoOffersYet");
  if (count === 1) return t("jobOffersCountOne");
  return t("jobOffersCount", { count: formatNumber(count, lang) });
}

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

/**
 * One work request in a list (Home's "Recent work requests", the board):
 * what it is, where, and the budget, with View. The whole card opens the
 * request; "View" is the visible cue for that, not a second control.
 */
export function JobCard({ post, showStatus = false }: { post: JobPost; showStatus?: boolean }) {
  const { t, lang } = useI18n();
  const budget = jobBudgetText(post, lang);
  const place = districtLabel(post.district, lang);
  // The exact place is private (6100); the card shows the district and what's needed.
  const summary = post.details;

  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: post.id }}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:p-3.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <SkillIcon skillId={post.skill_id ?? "other"} inherit className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{post.title}</span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
          {place}
          {summary && (
            <>
              <span className="text-slate-300" aria-hidden>
                {" · "}
              </span>
              {summary}
            </>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-sm font-semibold", budget ? "text-slate-900" : "text-slate-500")}>
            {budget ?? t("jobBudgetOpen")}
          </span>
          {showStatus && <JobStateBadge post={post} />}
          {showStatus && (
            <span className="text-xs text-slate-500">{offerCountText(post.offer_count, t, lang)}</span>
          )}
        </span>
      </span>

      <span className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white transition-colors group-hover:bg-brand-800">
        {t("view")}
      </span>
    </Link>
  );
}

export function JobCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3.5">
          <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton mt-2 h-3 w-52 max-w-full" />
            <div className="skeleton mt-2 h-4 w-28" />
          </div>
          <div className="skeleton h-8 w-14 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Choosing an area                                                    */
/* ------------------------------------------------------------------ */

/**
 * A sheet of Nepal's 77 districts with a search box, "All Nepal" and the
 * person's own district on top.
 */
export function AreaPickerDialog({
  open,
  onClose,
  value,
  onChange,
  myDistrict,
}: {
  open: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (district: string | null) => void;
  myDistrict?: string | null;
}) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  const districts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_DISTRICTS;
    return ALL_DISTRICTS.filter((d) => d.en.toLowerCase().includes(q) || d.ne.includes(query.trim()));
  }, [query]);

  function pick(district: string | null) {
    onChange(district);
    setQuery("");
    onClose();
  }

  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
      selected ? "bg-brand-50 font-semibold text-brand-800" : "text-slate-800 hover:bg-slate-50",
    );

  return (
    <Dialog open={open} onClose={onClose} title={t("homeLocationTitle")}>
      <p className="-mt-1 mb-3 text-xs text-slate-500">{t("homeLocationHint")}</p>
      <label className="mb-2 flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-surface px-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/25">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="sr-only">{t("homeLocationSearch")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("homeLocationSearch")}
          className="h-full min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </label>

      <ul className="space-y-0.5" role="listbox" aria-label={t("homeLocationTitle")}>
        {!query && (
          <>
            <li>
              <button type="button" role="option" aria-selected={value === null} onClick={() => pick(null)} className={optionClass(value === null)}>
                <Globe className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span className="flex-1">{t("homeLocationAll")}</span>
                {value === null && <Check className="h-4 w-4 text-brand-700" aria-hidden />}
              </button>
            </li>
            {myDistrict && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === myDistrict}
                  onClick={() => pick(myDistrict)}
                  className={optionClass(value === myDistrict)}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  <span className="flex-1">
                    {districtLabel(myDistrict, lang)}
                    <span className="ml-1.5 text-xs font-normal text-slate-500">{t("homeLocationMine")}</span>
                  </span>
                  {value === myDistrict && <Check className="h-4 w-4 text-brand-700" aria-hidden />}
                </button>
              </li>
            )}
            <li className="mx-3 my-1.5 border-t border-slate-100" aria-hidden />
          </>
        )}
        {districts.map((d) => (
          <li key={d.en}>
            <button type="button" role="option" aria-selected={value === d.en} onClick={() => pick(d.en)} className={optionClass(value === d.en)}>
              <span className="w-4 shrink-0" aria-hidden />
              <span className="flex-1">{lang === "ne" ? d.ne : d.en}</span>
              {value === d.en && <Check className="h-4 w-4 text-brand-700" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
