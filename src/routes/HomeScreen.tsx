import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Clock, LayoutGrid, LogIn, MapPin, Search, Users } from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { RatingStars } from "@/components/duleko/Rating";
import { SkillGrid } from "@/components/duleko/SkillGrid";
import { WorkerCard } from "@/components/duleko/WorkerCard";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useGuestMode } from "@/hooks/use-guest-mode";
import { usePresence } from "@/hooks/use-presence";
import { countPendingForMe, listSkills, searchWorkers, skillCounts } from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { cn, formatNumber, skillName, todayKey } from "@/lib/utils";

const seeAllLinkClass =
  "inline-flex items-center gap-0.5 text-sm font-medium text-brand-700 hover:text-brand-800";

// A glanceable preview, not the full directory - "See all" is what surfaces the rest.
const SKILL_PREVIEW_COUNT = 8;

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { isGuest, requestSignIn } = useGuestMode();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  // Total workers per skill across the whole database, not just this district
  // - a district filter only makes sense once someone actually opens the list.
  // Available to guests too - browsing the directory needs no account.
  const counts = useQuery({ queryKey: ["skill-counts"], queryFn: () => skillCounts(null) });

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
  });

  const online = usePresence((nearby.data ?? []).map((w) => w.id));

  const pending = useQuery({
    queryKey: ["pending-for-me", profile?.id],
    queryFn: () => countPendingForMe(profile!.id),
    enabled: Boolean(profile?.id),
    refetchInterval: 120_000,
  });

  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "";

  // Top few skills by how many workers list them - a data-driven starting
  // point for someone who hasn't typed anything yet, instead of a guess.
  const popularSkills = [...(skills.data ?? [])]
    .filter((s) => (counts.data?.[s.id] ?? 0) > 0)
    .sort((a, b) => (counts.data?.[b.id] ?? 0) - (counts.data?.[a.id] ?? 0))
    .slice(0, 4);

  return (
    <>
      <AppHeader
        gradient
        title={profile ? t("greeting", { name: firstName }) : t("appName")}
        subtitle={
          profile?.district ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {districtLabel(profile.district, lang)}
            </span>
          ) : (
            t("tagline")
          )
        }
        below={
          profile && profile.rating_count > 0 ? (
            <div className="mt-2 pl-[68px]">
              <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
            </div>
          ) : undefined
        }
        leading={
          profile ? (
            <Link to="/profile" aria-label={t("myProfile")} className="shrink-0">
              <Avatar
                name={profile.full_name}
                src={profile.avatar_url}
                size={56}
                className="shadow-sm ring-2 ring-white"
              />
            </Link>
          ) : isGuest ? (
            <button
              type="button"
              onClick={requestSignIn}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors duration-200 hover:bg-brand-100"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              {t("signUpOrLogIn")}
            </button>
          ) : undefined
        }
        right={<LanguageToggle />}
      />

      <PageContainer>
        <form
          className="animate-in-up relative mb-3"
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
            className="h-14 rounded-2xl border-slate-200 pl-11 shadow-sm transition-shadow duration-200 hover:shadow-md focus:shadow-md"
            aria-label={t("search")}
          />
        </form>

        {query === "" && popularSkills.length > 0 && (
          <div className="animate-in-up mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{t("popularSkills")}:</span>
            {popularSkills.map((skill) => (
              <Link
                key={skill.id}
                to="/search"
                search={{ skill: skill.id }}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 hover:bg-brand-100 hover:text-brand-800"
              >
                <span aria-hidden>{skill.emoji}</span>
                {skillName(skill, lang)}
              </Link>
            ))}
          </div>
        )}

        {(pending.data ?? 0) > 0 && (
          <Link to="/work" className="group animate-in-up mb-6 block">
            <Card
              tone="warning"
              interactive
              className="bg-gradient-to-r from-amber-50 to-orange-50 hover:border-amber-300"
            >
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
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-amber-600 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </CardBody>
            </Card>
          </Link>
        )}

        <section className="animate-in-up mb-7" style={{ "--delay": "60ms" } as CSSProperties}>
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

        <section className="animate-in-up" style={{ "--delay": "120ms" } as CSSProperties}>
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
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" onClick={() => (profile ? navigate({ to: "/profile" }) : requestSignIn())}>
                    {t("addYourSkills")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/search" })}>
                    {t("browseWorkers")}
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(nearby.data ?? []).map((worker) => (
                <WorkerCard key={worker.id} worker={worker} online={online[worker.id]} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </>
  );
}
