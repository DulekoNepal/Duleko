import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { WorkerList, WorkerListSkeleton, WorkerRow } from "@/components/duleko/WorkerList";
import { LocationConsentDialog } from "@/components/duleko/LocationConsentDialog";
import { RequestWorkDialog } from "@/components/duleko/RequestWorkDialog";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { usePresence } from "@/hooks/use-presence";
import { useToast } from "@/hooks/use-toast";
import { SEARCH_PAGE, listSkills, searchWorkers } from "@/lib/queries";
import { getCurrentPosition } from "@/lib/geolocation";
import { ALL_DISTRICTS, districtLabel } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { cn, formatDate, formatNumber, locationLine, skillName } from "@/lib/utils";
import type { Skill, WorkerCardData } from "@/lib/types";

export interface SearchFilters {
  skill?: string;
  q?: string;
  district?: string;
  day?: string;
  available?: boolean;
  sort?: "relevance" | "rating" | "newest" | "nearest";
}

type Sort = NonNullable<SearchFilters["sort"]>;

const SORTS: { value: Sort; labelKey: StringKey; icon: LucideIcon }[] = [
  { value: "relevance", labelKey: "sortRelevance", icon: Sparkles },
  { value: "rating", labelKey: "sortRating", icon: Star },
  { value: "newest", labelKey: "sortNewest", icon: Clock },
  { value: "nearest", labelKey: "nearestSort", icon: Navigation },
];

export function SearchScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { requestSignIn } = useGuestMode();
  const { toast } = useToast();
  const navigate = useNavigate();
  const filters = useSearch({ from: "/search" }) as SearchFilters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [queryText, setQueryText] = useState(filters.q ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [requestFor, setRequestFor] = useState<WorkerCardData | null>(null);

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  // Keep the box in step when the query changes from outside it (a chip,
  // "clear all", the browser's back button).
  useEffect(() => {
    setQueryText(filters.q ?? "");
  }, [filters.q]);

  // Search is nationwide by default, same as any real search - a district
  // filter only applies once the user explicitly picks one.
  const district = filters.district;

  function requestNearest(silent = false) {
    setLocating(true);
    getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        update({ sort: "nearest" });
      },
      () => {
        setLocating(false);
        // A silent attempt (arriving from a skill tile) should quietly fall
        // back to relevance rather than nag with an error toast.
        if (!silent) toast(t("locationPermissionDenied"), "error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // Coming in from "browse by skill" on Home: try to sort nearest-first
  // automatically, using an already-shared location or a quiet GPS prompt.
  // If neither works out, results just stay in relevance order.
  useEffect(() => {
    if (!filters.skill || filters.sort) return;
    if (profile?.lat != null && profile?.lng != null) {
      setCoords({ lat: profile.lat, lng: profile.lng });
      update({ sort: "nearest" });
      return;
    }
    requestNearest(true);
    // Only meant to run once, right when a skill-only link is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.skill]);

  // search_workers already took a limit and an offset; nothing ever sent
  // an offset, so results were silently capped at the first page.
  const results = useInfiniteQuery({
    queryKey: ["workers", "search", filters, district, filters.sort === "nearest" ? coords : null],
    queryFn: ({ pageParam }) =>
      searchWorkers({
        skill: filters.skill ?? null,
        query: filters.q ?? null,
        district: district ?? null,
        day: filters.day ?? null,
        availableOnly: filters.available ?? false,
        sort: filters.sort ?? "relevance",
        limit: SEARCH_PAGE,
        offset: pageParam * SEARCH_PAGE,
        lat: filters.sort === "nearest" ? coords?.lat : null,
        lng: filters.sort === "nearest" ? coords?.lng : null,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length < SEARCH_PAGE ? undefined : all.length),
    enabled: filters.sort !== "nearest" || Boolean(coords),
  });

  const workers = results.data?.pages.flat() ?? [];
  const online = usePresence(workers.map((w) => w.id));

  function update(patch: Partial<SearchFilters>) {
    navigate({ to: "/search", search: { ...filters, ...patch } as SearchFilters });
  }

  function clearAll() {
    setQueryText("");
    navigate({ to: "/search", search: {} as SearchFilters });
  }

  function chooseSort(next: Sort) {
    // Duleko's own explanation first - the browser's native prompt follows
    // only after someone taps "Allow Location".
    if (next === "nearest") setLocationConsentOpen(true);
    else update({ sort: next });
  }

  const activeSkill = skills.data?.find((s) => s.id === filters.skill);
  const hasFilters = Boolean(filters.skill || filters.q || filters.district || filters.day || filters.available);
  // Counted on the Filters button - the refinements that live in the panel.
  const panelFilterCount = [filters.district, filters.day, filters.available].filter(Boolean).length;
  const waitingForLocation = filters.sort === "nearest" && !coords;

  const pills: { key: string; label: React.ReactNode; onRemove: () => void }[] = [
    filters.q && {
      key: "q",
      label: (
        <>
          <SearchIcon className="h-3.5 w-3.5" aria-hidden />
          {t("searchFor", { q: filters.q })}
        </>
      ),
      onRemove: () => update({ q: undefined }),
    },
    activeSkill && {
      key: "skill",
      label: (
        <>
          <SkillIcon skillId={activeSkill.id} className="h-3.5 w-3.5" />
          {skillName(activeSkill, lang)}
        </>
      ),
      onRemove: () => update({ skill: undefined }),
    },
    filters.district && {
      key: "district",
      label: (
        <>
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {districtLabel(filters.district, lang)}
        </>
      ),
      onRemove: () => update({ district: undefined }),
    },
    filters.day && {
      key: "day",
      label: (
        <>
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(filters.day, lang)}
        </>
      ),
      onRemove: () => update({ day: undefined }),
    },
    filters.available && {
      key: "available",
      label: (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
          {t("availableOnly")}
        </>
      ),
      onRemove: () => update({ available: undefined }),
    },
  ].filter(Boolean) as { key: string; label: React.ReactNode; onRemove: () => void }[];

  const countLabel = results.hasNextPage
    ? t("resultsCountMore", { count: formatNumber(workers.length, lang) })
    : t("resultsCount", { count: formatNumber(workers.length, lang) });

  const panelProps = {
    filters,
    skills: skills.data ?? [],
    locating,
    onUpdate: update,
    onSort: chooseSort,
  };

  return (
    <>
      <AppHeader
        title={activeSkill ? skillName(activeSkill, lang) : t("search")}
        subtitle={district ? districtLabel(district, lang) : undefined}
      />

      <PageContainer className="space-y-4 md:space-y-5">
        {/* ---- Search box ------------------------------------------------- */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: queryText.trim() || undefined });
          }}
        >
          <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <input
              type="search"
              enterKeyHint="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
              className="h-full min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {queryText && (
              <button
                type="button"
                onClick={() => {
                  setQueryText("");
                  if (filters.q) update({ q: undefined });
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={t("clearSearch")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </form>

        <SkillChips skills={skills.data ?? []} active={filters.skill} onPick={(id) => update({ skill: id })} />

        <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-5">
          {/* ---- Desktop: filters beside the results ---------------------- */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-brand-700" aria-hidden />
                {t("filters")}
              </h2>
              <FilterPanel {...panelProps} sortLayout="stack" />
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-1 w-full" onClick={clearAll}>
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          </aside>

          <div className="min-w-0 space-y-3">
            {/* ---- Count, and Filters below desktop ----------------------- */}
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {results.isLoading || waitingForLocation ? (
                  <span className="skeleton inline-block h-4 w-24" />
                ) : (
                  countLabel
                )}
                {locating && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {t("locatingYou")}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                {t("filters")}
                {panelFilterCount > 0 && (
                  <span className="min-w-5 rounded-full bg-brand-700 px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                    {formatNumber(panelFilterCount, lang)}
                  </span>
                )}
              </button>
            </div>

            {/* ---- What's applied, each removable ----------------------- */}
            {pills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {pills.map((pill) => (
                  <span
                    key={pill.key}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-sm text-slate-700"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">{pill.label}</span>
                    <button
                      type="button"
                      onClick={pill.onRemove}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label={t("clearFilters")}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
                {pills.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="px-1 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                  >
                    {t("clearAll")}
                  </button>
                )}
              </div>
            )}

            {/* ---- Results ------------------------------------------------ */}
            {results.isLoading || waitingForLocation ? (
              <WorkerListSkeleton rows={5} />
            ) : results.isError ? (
              <ErrorState
                message={errorMessage(results.error)}
                onRetry={() => results.refetch()}
                retryLabel={t("retry")}
              />
            ) : workers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title={t("noResults")}
                hint={t("noResultsHint")}
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      {t("clearFilters")}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <WorkerList
                footer={
                  results.hasNextPage ? (
                    <button
                      type="button"
                      onClick={() => results.fetchNextPage()}
                      disabled={results.isFetchingNextPage}
                      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800 disabled:opacity-60"
                    >
                      {results.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      {t("loadMore")}
                    </button>
                  ) : undefined
                }
              >
                {workers.map((worker) => (
                  <WorkerRow
                    key={worker.id}
                    worker={worker}
                    online={online[worker.id]}
                    showAvailability={!filters.available}
                    onRequest={
                      worker.id === profile?.id
                        ? undefined
                        : () => (profile ? setRequestFor(worker) : requestSignIn())
                    }
                  />
                ))}
              </WorkerList>
            )}
          </div>
        </div>
      </PageContainer>

      {/* ---- Phones & tablets: the same filters as a bottom sheet ------- */}
      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("filters")}
        footer={
          <div className="flex gap-2">
            {hasFilters && (
              <Button variant="outline" className="flex-1" onClick={clearAll}>
                {t("clearAll")}
              </Button>
            )}
            <Button className="flex-[2]" onClick={() => setFiltersOpen(false)}>
              {t("showResults")}
            </Button>
          </div>
        }
      >
        <FilterPanel {...panelProps} sortLayout="grid" />
      </Dialog>

      <LocationConsentDialog
        open={locationConsentOpen}
        onClose={() => setLocationConsentOpen(false)}
        onAllow={() => requestNearest()}
      />

      {profile && requestFor && (
        <RequestWorkDialog
          key={requestFor.id}
          open
          onClose={() => setRequestFor(null)}
          worker={{ id: requestFor.id, full_name: requestFor.full_name }}
          employerProfileId={profile.id}
          defaultLocation={locationLine(profile, lang)}
        />
      )}
    </>
  );
}

/** Every skill as a one-tap chip on one row that scrolls sideways - the
 * next chip peeking in says there is more. */
function SkillChips({
  skills,
  active,
  onPick,
}: {
  skills: Skill[];
  active?: string;
  onPick: (id: string | undefined) => void;
}) {
  const { t, lang } = useI18n();
  if (skills.length === 0) return null;

  const chip = (selected: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
      selected
        ? "border-brand-700 bg-brand-700 font-semibold text-white"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    );

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <button type="button" onClick={() => onPick(undefined)} className={chip(!active)} aria-pressed={!active}>
        {t("allSkills")}
      </button>
      {skills.map((skill) => {
        const selected = skill.id === active;
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => onPick(selected ? undefined : skill.id)}
            className={chip(selected)}
            aria-pressed={selected}
          >
            <SkillIcon skillId={skill.id} className="h-3.5 w-3.5" inherit={selected} />
            {skillName(skill, lang)}
          </button>
        );
      })}
    </div>
  );
}

/** Sort, skill, district, date and availability - shared by the desktop
 * sidebar and the phone bottom sheet. */
function FilterPanel({
  filters,
  skills,
  locating,
  onUpdate,
  onSort,
  sortLayout,
}: {
  filters: SearchFilters;
  skills: Skill[];
  locating: boolean;
  onUpdate: (patch: Partial<SearchFilters>) => void;
  onSort: (sort: Sort) => void;
  /** One per row in the narrow desktop sidebar, two across in the sheet. */
  sortLayout: "stack" | "grid";
}) {
  const { t, lang } = useI18n();
  const current = filters.sort ?? "relevance";

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{t("sortBy")}</p>
      <div className={cn("mb-5 grid gap-2", sortLayout === "grid" ? "grid-cols-2" : "grid-cols-1")}>
        {SORTS.map(({ value, labelKey, icon: Icon }) => {
          const selected = value === current;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSort(value)}
              disabled={locating}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-60",
                selected
                  ? "border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-brand-700" : "text-slate-400")} aria-hidden />
              <span className="truncate">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>

      <Field label={t("skills")}>
        <Select value={filters.skill ?? ""} onChange={(e) => onUpdate({ skill: e.target.value || undefined })}>
          <option value="">{t("allSkills")}</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {skillName(s, lang)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("district")}>
        <Select value={filters.district ?? ""} onChange={(e) => onUpdate({ district: e.target.value || undefined })}>
          <option value="">{t("anywhere")}</option>
          {ALL_DISTRICTS.map((d) => (
            <option key={d.en} value={d.en}>
              {lang === "ne" ? d.ne : d.en}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("onDate")}>
        <Input
          type="date"
          value={filters.day ?? ""}
          onChange={(e) => onUpdate({ day: e.target.value || undefined })}
        />
      </Field>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
          {t("availableOnly")}
        </span>
        <Switch
          size="sm"
          checked={filters.available ?? false}
          onChange={(next) => onUpdate({ available: next || undefined })}
          aria-label={t("availableOnly")}
        />
      </div>
    </div>
  );
}
