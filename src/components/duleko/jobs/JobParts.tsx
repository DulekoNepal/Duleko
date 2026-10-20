import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Globe, MapPin, Megaphone, Search, UserSearch } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { useI18n, type StringKey } from "@/lib/i18n";
import { ALL_DISTRICTS, districtLabel } from "@/lib/nepal";
import { PRICE_UNIT_SUFFIX } from "@/lib/price-units";
import { cn, formatMoney, formatNumber, todayKey } from "@/lib/utils";
import type { JobOfferStatus, JobPost, JobPostKind, Lang } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * "Rs 1,000 – 1,500", "Rs 500 / hr", or null when the poster left it open.
 * Pass `t` to add what the price is for (8000); without it, just the amount.
 */
export function jobBudgetText(
  post: Pick<JobPost, "budget_min" | "budget_max"> & { price_unit?: JobPost["price_unit"] },
  lang: Lang,
  t?: (key: StringKey) => string,
): string | null {
  const { budget_min: lo, budget_max: hi } = post;
  if (lo == null && hi == null) return null;
  const amount =
    lo != null && hi != null && lo !== hi
      ? `${formatMoney(lo, lang)} – ${formatNumber(Math.round(hi).toLocaleString("en-IN"), lang)}`
      : formatMoney(lo ?? hi, lang);
  const unit = post.price_unit ? (t ?? defaultUnitText(lang))(PRICE_UNIT_SUFFIX[post.price_unit]) : "";
  return `${amount}${unit}`;
}

/** The unit's words when a caller didn't hand its own `t` in. */
function defaultUnitText(lang: Lang) {
  return (key: StringKey) => {
    const pair = UNIT_FALLBACK[key];
    return pair ? pair[lang === "ne" ? 1 : 0] : "";
  };
}
const UNIT_FALLBACK: Partial<Record<StringKey, [string, string]>> = {
  priceUnitPerHour: [" / hr", " / घण्टा"],
  priceUnitPerDay: [" / day", " / दिन"],
  priceUnitPerMonth: [" / month", " / महिना"],
  priceUnitPerKm: [" / km", " / कि.मि."],
  priceUnitPerLitre: [" / litre", " / लिटर"],
  priceUnitPerKg: [" / kg", " / के.जी."],
  priceUnitPerPiece: [" / piece", " / थान"],
  priceUnitPerSqft: [" / sq ft", " / वर्ग फिट"],
};

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

/** An offer post (6700) takes no offers: it is simply up, or not any more. */
const OFFER_STATE_LABEL: Record<JobState, StringKey> = {
  open: "jobStatusListed",
  assigned: "jobStatusClosed",
  closed: "jobStatusClosed",
  expired: "jobStatusEnded",
};

export function JobStateBadge({
  post,
  className,
}: {
  post: Pick<JobPost, "status" | "work_date" | "kind">;
  className?: string;
}) {
  const { t } = useI18n();
  const state = jobState(post);
  const label = post.kind === "offer" ? OFFER_STATE_LABEL[state] : STATE_LABEL[state];
  return (
    <Badge tone={state === "open" ? "brand" : state === "assigned" ? "success" : "muted"} className={className}>
      {state === "open" && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />}
      {t(label)}
    </Badge>
  );
}

/**
 * Which way round a post is, at a glance - and the same everywhere: blue
 * with a searching person for someone hiring, orange with a megaphone for
 * someone offering their service. The post form's two choices match.
 */
export const JOB_KIND_LOOK: Record<JobPostKind, { icon: typeof UserSearch; tag: string }> = {
  hire: { icon: UserSearch, tag: "bg-navy-50 text-navy-700" },
  offer: { icon: Megaphone, tag: "bg-accent-50 text-accent-600" },
};

export function JobKindTag({ kind, className }: { kind: JobPostKind; className?: string }) {
  const { t } = useI18n();
  const { icon: Icon, tag } = JOB_KIND_LOOK[kind];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tag,
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      {t(kind === "offer" ? "jobKindOffer" : "jobKindHire")}
    </span>
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
 * One post in a list (Home, the board, My posts), in rows: Hiring or
 * Offering and where, the title in full, what's needed, then the budget or
 * rate beside View. The whole card opens the post; "View" is only the cue.
 */
export function JobCard({ post, showStatus = false }: { post: JobPost; showStatus?: boolean }) {
  const { t, lang } = useI18n();
  const budget = jobBudgetText(post, lang, t);
  const offering = post.kind === "offer";
  const place = districtLabel(post.district, lang);
  // The exact place is private (6100); the card shows the district and what's needed.
  const summary = post.details;

  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: post.id }}
      className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <SkillIcon skillId={post.skill_id ?? "other"} inherit className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <JobKindTag kind={post.kind} />
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{place}</span>
            </span>
          </span>
          <span className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{post.title}</span>
        </span>
      </span>

      {summary && <span className="mt-2 line-clamp-2 text-[13px] leading-snug text-slate-500">{summary}</span>}

      {/* Pinned to the bottom, so cards side by side on the board line up. */}
      <span className="mt-auto pt-3" />
      <span className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-sm font-bold", budget ? "text-slate-900" : "font-semibold text-slate-500")}>
            {budget ?? t(offering ? "serviceRateOpen" : "jobBudgetOpen")}
          </span>
          {showStatus && <JobStateBadge post={post} />}
          {showStatus && !offering && (
            <span className="text-xs text-slate-500">{offerCountText(post.offer_count, t, lang)}</span>
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-700">
          {t("view")}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

export function JobCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-surface p-3.5">
          <div className="flex items-start gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-16" />
              </div>
              <div className="skeleton mt-2 h-4 w-44 max-w-full" />
            </div>
          </div>
          <div className="skeleton mt-3 h-3 w-full" />
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-2.5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-12" />
          </div>
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
