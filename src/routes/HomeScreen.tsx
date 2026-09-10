import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, LogIn, MapPin, Search, Users } from "lucide-react";
import { EmergencyContactsSection } from "@/components/duleko/EmergencyContacts";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { RatingStars } from "@/components/duleko/Rating";
import { SKILL_CATEGORY_ORDER, SkillCategorySection, groupSkillsByCategory } from "@/components/duleko/SkillGrid";
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
import { formatNumber, todayKey } from "@/lib/utils";
import dulekoMark from "@/assets/duleko-mark.png";

// Same "there's more" treatment the skill-category cards use for their own
// see-all/show-less action - one orange accent for "tap for more", used
// nowhere else on the page, so every such affordance reads as one family.
const seeAllLinkClass =
  "inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-accent-600 hover:text-accent-700";

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { isGuest, requestSignIn } = useGuestMode();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  const skillsByCategory = groupSkillsByCategory(skills.data ?? []);

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

  return (
    <>
      {/* Plain chrome, same as every other screen - the brand mark and
          nothing else competing for attention. The greeting itself is
          the first thing in the page below, where it can be a proper
          card rather than squeezed into a sticky bar. */}
      <AppHeader title={t("appName")} logo />

      <PageContainer>
        {profile ? (
          <Link to="/profile" aria-label={t("myProfile")} className="animate-in-up mb-4 block">
            <Card
              tone="primary"
              interactive
              className="overflow-hidden bg-gradient-to-br from-brand-50 via-white to-white"
            >
              <CardBody className="flex items-center gap-4">
                <Avatar
                  name={profile.full_name}
                  src={profile.avatar_url}
                  size={60}
                  className="shrink-0 shadow-sm ring-4 ring-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold leading-tight text-slate-900">
                    {t("greeting", { name: firstName })}
                  </p>
                  {profile.district ? (
                    <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {districtLabel(profile.district, lang)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">{t("tagline")}</p>
                  )}
                  {profile.rating_count > 0 && (
                    <div className="mt-1.5">
                      <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-brand-300" aria-hidden />
              </CardBody>
            </Card>
          </Link>
        ) : (
          <Card
            tone="primary"
            className="animate-in-up mb-4 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-white"
          >
            {/* Stacks on a phone - a fixed-width logo, a fixed-width
                button and flexible text in between only works once
                there is enough row to give the text real room, which a
                375px screen does not have. */}
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <img
                  src={dulekoMark}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm ring-4 ring-white"
                />
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{t("appName")}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{t("tagline")}</p>
                </div>
              </div>
              {isGuest && (
                <Button onClick={requestSignIn} className="w-full sm:ml-auto sm:w-auto sm:shrink-0">
                  <LogIn className="h-4 w-4" aria-hidden />
                  {t("signUpOrLogIn")}
                </Button>
              )}
            </CardBody>
          </Card>
        )}

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

        {/* Each category is its own card - the page background does the
            separating, the same way it does between every other section
            here, instead of three headings running together with nothing
            between them. */}
        <section
          className="animate-in-up mb-7 space-y-4"
          aria-label={t("browseSkills")}
          style={{ "--delay": "60ms" } as CSSProperties}
        >
          {skills.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="skeleton h-7 w-7 rounded-lg" />
                    <div className="skeleton h-4 w-36" />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex flex-col items-center gap-1.5 py-3">
                        <div className="skeleton h-6 w-6 rounded-md" />
                        <div className="skeleton h-2.5 w-10 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : SKILL_CATEGORY_ORDER.map((category) => (
                <SkillCategorySection
                  key={category}
                  category={category}
                  skills={skillsByCategory[category]}
                  counts={counts.data}
                />
              ))}
        </section>

        {/* Same "own card" treatment as the skill categories above, so this
            reads as one more category in that stack rather than a bolted-on
            banner - just tinted red, since it's safety information rather
            than browsing. */}
        <section className="animate-in-up mb-7" style={{ "--delay": "90ms" } as CSSProperties}>
          <EmergencyContactsSection />
        </section>

        {/* No outer card here, unlike the skill categories above - these
            rows are each already their own interactive card, and nesting
            a card of cards just doubles the borders. The section title
            alone is enough to separate it from what came before. */}
        <section className="animate-in-up" style={{ "--delay": "120ms" } as CSSProperties}>
          <SectionTitle
            action={
              (nearby.data?.length ?? 0) > 0 && (
                <Link to="/search" search={{ available: true }} className={seeAllLinkClass}>
                  {t("seeAll")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )
            }
          >
            <span className="inline-flex items-center gap-2">
              <SectionIcon icon={Users} />
              {t("availableToday")}
            </span>
          </SectionTitle>

          {nearby.isLoading ? (
            <CardSkeleton count={2} />
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
            // Two columns is the cap on desktop too - a home preview reads
            // as a short, curated handful, not a full results grid, and it
            // keeps every card wide enough for the rating/place line to sit
            // on one row instead of wrapping.
            <div className="grid gap-4 md:grid-cols-2">
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
