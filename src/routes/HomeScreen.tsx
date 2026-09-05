import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { SkillGrid } from "@/components/duleko/SkillGrid";
import { WorkerCard } from "@/components/duleko/WorkerCard";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { countPendingForMe, listSkills, searchWorkers, skillCounts } from "@/lib/queries";
import { districtLabel } from "@/lib/nepal";
import { formatNumber, todayKey } from "@/lib/utils";

export function HomeScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-12 pl-10"
            aria-label={t("search")}
          />
        </form>

        {(pending.data ?? 0) > 0 && (
          <Link to="/work" className="mb-5 block">
            <Card className="border-amber-200 bg-amber-50">
              <CardBody className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-amber-900">{t("yourWorkToday")}</p>
                  <p className="text-sm text-amber-800">
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
              <Link to="/search" className="text-sm font-medium text-brand-700">
                {t("seeAll")}
              </Link>
            }
          >
            {t("browseSkills")}
          </SectionTitle>
          {skills.isLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <SkillGrid skills={skills.data ?? []} counts={counts.data} />
          )}
        </section>

        <section>
          <SectionTitle
            action={
              <Link to="/search" search={{ available: true }} className="text-sm font-medium text-brand-700">
                {t("seeAll")}
              </Link>
            }
          >
            {t("availableToday")}
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
