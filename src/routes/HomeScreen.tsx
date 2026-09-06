import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Clock, LayoutGrid, Search, Users } from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { SkillGrid } from "@/components/duleko/SkillGrid";
import { WorkerCard } from "@/components/duleko/WorkerCard";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { countPendingForMe, listSkills, searchWorkers, skillCounts } from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { cn, formatNumber, todayKey } from "@/lib/utils";

const seeAllLinkClass =
  "inline-flex items-center gap-0.5 text-sm font-medium text-brand-700 hover:text-brand-800";

// A glanceable preview, not the full directory — "See all" is what surfaces the rest.
const SKILL_PREVIEW_COUNT = 8;

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  const counts = useQuery({
    queryKey: ["skill-counts", profile?.district],
    queryFn: () => skillCounts(profile?.district),
    enabled: Boolean(profile),
  });

  const nearby = useQuery({
    queryKey: ["workers", "home", profile?.district, profile?.municipality],
    queryFn: () =>
      searchWorkers({
        district: profile?.district ?? null,
        municipality: null,
        day: todayKey(),
        availableOnly: true,
        sort: "relevance",
        limit: 6,
      }),
    enabled: Boolean(profile),
  });

  const pending = useQuery({
    queryKey: ["pending-for-me", profile?.id],
    queryFn: () => countPendingForMe(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 120_000,
  });

  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "";

  return (
    <>
      <AppHeader
        title={t("greeting", { name: firstName })}
        subtitle={districtLabel(profile?.district, lang) || t("tagline")}
        leading={
          profile && (
            <Link to="/profile" aria-label={t("myProfile")} className="shrink-0">
              <Avatar name={profile.full_name} src={profile.avatar_url} size={40} />
            </Link>
          )
        }
        right={<LanguageToggle />}
      />

      <PageContainer>
        <form
          className="relative mb-5"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: query || undefined } });
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-12 rounded-2xl border-slate-200 pl-11 shadow-sm"
            aria-label={t("search")}
          />
        </form>

        {(pending.data ?? 0) > 0 && (
          <Link to="/work" className="mb-6 block">
            <Card className="border-amber-200 bg-amber-50 transition-colors hover:border-amber-300">
              <CardBody className="flex items-center gap-3 py-3.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock className="h-4.5 w-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-amber-900">{t("yourWorkToday")}</p>
                  <p className="truncate text-sm text-amber-800">
                    {t("pendingRequests", { count: formatNumber(pending.data ?? 0, lang) })}
                  </p>
                </div>
                <Badge tone="warning">{formatNumber(pending.data ?? 0, lang)}</Badge>
              </CardBody>
            </Card>
          </Link>
        )}

        <section className="mb-7">
          <SectionTitle
            action={
              (skills.data?.length ?? 0) > SKILL_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllSkills((v) => !v)}
                  className={seeAllLinkClass}
                  aria-expanded={showAllSkills}
                >
                  {showAllSkills ? t("showLess") : t("seeAll")}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", showAllSkills && "rotate-180")}
                    aria-hidden
                  />
                </button>
              )
            }
          >
            <span className="inline-flex items-center gap-2">
              <SectionIcon icon={LayoutGrid} />
              {t("browseSkills")}
            </span>
          </SectionTitle>
          {skills.isLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: SKILL_PREVIEW_COUNT }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <SkillGrid
              skills={showAllSkills ? skills.data ?? [] : (skills.data ?? []).slice(0, SKILL_PREVIEW_COUNT)}
              counts={counts.data}
            />
          )}
        </section>

        <section>
          <SectionTitle
            action={
              <Link to="/search" search={{ available: true }} className={seeAllLinkClass}>
                {t("seeAll")}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <SectionIcon icon={Users} />
              {t("availableToday")}
            </span>
          </SectionTitle>

          {nearby.isLoading ? (
            <CardSkeleton count={3} />
          ) : (nearby.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={t("noWorkersYet")}
              hint={t("noWorkersHint")}
            />
          ) : (
            <div className="space-y-3">
              {(nearby.data ?? []).map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  );
}
