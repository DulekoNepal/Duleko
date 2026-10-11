import { CalendarDays, GraduationCap, Send } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  IconBadge,
  Lead,
  PageHero,
  Prose,
  PullQuote,
  ReadNext,
  SectionHeading,
  SectionIntro,
  SiteLayout,
  SiteSection,
  StoryLink,
  NEPALI_TAGLINE,
  reveal,
  siteCard,
} from "@/components/duleko/Site";
import { TEAM } from "@/components/duleko/site/team";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const EXAMPLES: { icon: React.ComponentType<{ className?: string }>; key: StringKey }[] = [
  { icon: GraduationCap, key: "buildingExample1" },
  { icon: CalendarDays, key: "buildingExample2" },
  { icon: Send, key: "buildingExample3" },
];

export function MotivationPage() {
  const { t } = useI18n();

  return (
    <SiteLayout title={t("motivationEyebrow")}>
      <PageHero
        crumb={{ group: t("navAbout"), title: t("motivationEyebrow") }}
        eyebrow={t("motivationEyebrow")}
        title={t("motivationTitle")}
        aside={
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {TEAM.map((member, i) => (
              <img
                key={member.id}
                src={member.image}
                alt={t(member.nameKey)}
                className={cn(
                  "w-1/3 max-w-[10rem] rounded-3xl object-cover shadow-[0_30px_60px_-30px_rgb(12_60_72/0.55)] ring-4 ring-surface",
                  i === 1 ? "aspect-[3/4.4]" : "aspect-[3/4] translate-y-4",
                )}
              />
            ))}
          </div>
        }
      >
        <Lead>
          <p>{t("motivationIntro")}</p>
        </Lead>
      </PageHero>

      {/* In our own words */}
      <SiteSection>
        <div className="max-w-3xl">
          <Eyebrow>{t("straightFromTheTeam")}</Eyebrow>
          <SectionHeading>{t("motivationSubtitle")}</SectionHeading>
        </div>

        <ul className="mt-12 divide-y divide-slate-200/80 border-y border-slate-200/80">
          {TEAM.map((member, i) => (
            <li
              key={member.id}
              className={cn(
                "grid items-center gap-6 py-10 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10 lg:gap-14 lg:py-14",
                i % 2 === 1 ? "lg:grid-cols-[minmax(0,1fr)_240px]" : "lg:grid-cols-[240px_minmax(0,1fr)]",
              )}
              {...reveal()}
            >
              <img
                src={member.image}
                alt=""
                loading="lazy"
                className={cn(
                  "aspect-square w-28 rounded-3xl object-cover shadow-[0_24px_48px_-28px_rgb(12_60_72/0.55)] sm:aspect-[4/5] sm:w-full",
                  i % 2 === 1 && "lg:order-2",
                )}
              />
              <PullQuote
                className={cn(i % 2 === 1 && "lg:order-1")}
                quote={t(member.quoteKey)}
                name={t(member.nameKey)}
                role={t(member.roleKey)}
                to={{ slug: member.slug }}
              />
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* What keeps us building */}
      <SiteSection tone="paper">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionIntro eyebrow={t("motivationWhyItMatters")} title={t("whatKeepsUsBuilding")} />
            <Prose className="mt-5">
              <p>{t("whatKeepsUsBuildingDesc")}</p>
            </Prose>
            <StoryLink to="/mission" className="mt-5">
              {t("readOurMission")}
            </StoryLink>
          </div>
          <ul className="space-y-3 lg:pt-4">
            {EXAMPLES.map(({ icon, key }, i) => (
              <li key={key} className={cn(siteCard, "flex items-center gap-4 p-5")} {...reveal(i * 80)}>
                <IconBadge icon={icon} tone={i === 1 ? "navy" : i === 2 ? "accent" : "brand"} />
                <p className="font-display text-lg font-semibold leading-snug text-slate-900">{t(key)}</p>
              </li>
            ))}
          </ul>
        </div>
      </SiteSection>

      {/* What drives us */}
      <SiteSection tone="ink">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow tone="light" className="justify-center">
            {t("motivationWhatDrivesUs")}
          </Eyebrow>
          <p className="font-quote mt-2 text-balance text-3xl italic leading-tight sm:text-4xl lg:text-5xl">
            {t("siteTagline")}
          </p>
          <p lang="ne" className="mt-6 text-xl font-semibold text-brand-300 sm:text-2xl">
            {NEPALI_TAGLINE}
          </p>
        </div>
      </SiteSection>

      <ReadNext
        links={[
          { to: "/about", hash: "team", title: t("meetTheTeam"), teaser: t("meetTheTeamTeaser") },
          { to: "/mission", title: t("ourMission"), teaser: t("missionTeaser") },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
