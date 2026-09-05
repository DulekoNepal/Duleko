import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, Users } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { WorkerCard } from "@/components/duleko/WorkerCard";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { listSkills, searchWorkers } from "@/lib/queries";
import { ALL_DISTRICTS } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { formatNumber, skillName } from "@/lib/utils";

export interface SearchFilters {
  skill?: string;
  q?: string;
  district?: string;
  day?: string;
  available?: boolean;
  sort?: "relevance" | "rating" | "newest";
}

export function SearchScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const filters = useSearch({ from: "/search" }) as SearchFilters;
  const [showFilters, setShowFilters] = useState(false);
  const [queryText, setQueryText] = useState(filters.q ?? "");

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  // District defaults to the user's own so "nearby" means something on day one.
  const district = filters.district ?? profile?.district ?? undefined;

  const results = useQuery({
    queryKey: ["workers", "search", filters, district],
    queryFn: () =>
      searchWorkers({
        skill: filters.skill ?? null,
        query: filters.q ?? null,
        district: district ?? null,
        day: filters.day ?? null,
        availableOnly: filters.available ?? false,
        sort: filters.sort ?? "relevance",
        limit: 50,
      }),
    enabled: Boolean(profile),
  });

  function update(patch: Partial<SearchFilters>) {
    navigate({ to: "/search", search: { ...filters, ...patch } as SearchFilters });
  }

  const activeSkill = skills.data?.find((s) => s.id === filters.skill);
  const hasFilters = Boolean(filters.skill || filters.q || filters.district || filters.day || filters.available);

  return (
    <>
      <AppHeader
        title={activeSkill ? skillName(activeSkill, lang) : t("search")}
        subtitle={district}
        right={
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-label={t("filters")}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        }
      />

      <PageContainer>
        <form
          className="relative mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: queryText || undefined });
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            aria-label={t("search")}
          />
        </form>

        {showFilters && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <Field label={t("allSkills")}>
              <Select
                value={filters.skill ?? ""}
                onChange={(e) => update({ skill: e.target.value || undefined })}
              >
                <option value="">{t("allSkills")}</option>
                {(skills.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {skillName(s, lang)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("district")}>
              <Select
                value={filters.district ?? district ?? ""}
                onChange={(e) => update({ district: e.target.value || undefined })}
              >
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
                onChange={(e) => update({ day: e.target.value || undefined })}
              />
            </Field>

            <Field label={t("sortBy")}>
              <Select
                value={filters.sort ?? "relevance"}
                onChange={(e) => update({ sort: e.target.value as SearchFilters["sort"] })}
              >
                <option value="relevance">{t("sortRelevance")}</option>
                <option value="rating">{t("sortRating")}</option>
                <option value="newest">{t("sortNewest")}</option>
              </Select>
            </Field>

            <label className="mb-4 flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                checked={filters.available ?? false}
                onChange={(e) => update({ available: e.target.checked || undefined })}
              />
              {t("availableOnly")}
            </label>

            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setQueryText("");
                  navigate({ to: "/search", search: {} as SearchFilters });
                }}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        )}

        {results.isLoading ? (
          <CardSkeleton count={4} />
        ) : results.isError ? (
          <ErrorState
            message={errorMessage(results.error)}
            onRetry={() => results.refetch()}
            retryLabel={t("retry")}
          />
        ) : (results.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t("noResults")}
            hint={t("noResultsHint")}
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={() => navigate({ to: "/search", search: {} as SearchFilters })}>
                  {t("clearFilters")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              <Badge tone="neutral">
                {t("resultsCount", { count: formatNumber(results.data?.length ?? 0, lang) })}
              </Badge>
            </p>
            <div className="space-y-3">
              {(results.data ?? []).map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}
