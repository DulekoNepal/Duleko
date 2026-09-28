import { Link } from "@tanstack/react-router";
import { ArrowRight, Quote } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  PageHero,
  Prose,
  ReadNext,
  SectionHeading,
  SiteLayout,
  SiteSection,
  StoryLink,
} from "@/components/duleko/Site";
import { useI18n, type StringKey } from "@/lib/i18n";
import sunilImage from "@/assets/sunil.webp";
import sanjayImage from "@/assets/sanjay.webp";
import dipendraImage from "@/assets/dipendra.webp";

const FOUNDERS: {
  id: string;
  slug: string;
  nameKey: StringKey;
  roleKey: StringKey;
  quoteKey: StringKey;
  image: string;
}[] = [
  { id: "sunil", slug: "sunil-k-chaudhary", nameKey: "sunilName", roleKey: "sunilRole", quoteKey: "sunilQuote", image: sunilImage },
  { id: "sanjay", slug: "sanjay-gupta", nameKey: "sanjayName", roleKey: "sanjayRole", quoteKey: "sanjayQuote", image: sanjayImage },
  {
    id: "dipendra",
    slug: "dipendra-chaudhary",
    nameKey: "dipendraName",
    roleKey: "dipendraRole",
    quoteKey: "dipendraQuote",
    image: dipendraImage,
  },
];

export function MotivationPage() {
  const { t } = useI18n();

  return (
    <SiteLayout title={t("motivationEyebrow")}>
      <PageHero
        crumb={{ group: t("navAbout"), title: t("motivationEyebrow") }}
        eyebrow={t("motivationEyebrow")}
        title={t("motivationTitle")}
      >
        <Prose>
          <p>{t("motivationIntro")}</p>
        </Prose>
      </PageHero>

      <SiteSection tone="cream">
        <div className="max-w-3xl">
          <Eyebrow>{t("straightFromTheTeam")}</Eyebrow>
          <SectionHeading>{t("motivationSubtitle")}</SectionHeading>
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {FOUNDERS.map((founder) => (
            <li key={founder.id}>
              <figure className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-teal-900/5 sm:p-6">
                <Quote className="h-6 w-6 text-accent-500" aria-hidden />
                <blockquote className="mt-3 flex-1">
                  <p className="text-balance text-base font-semibold leading-snug text-teal-800 sm:text-lg">
                    {t(founder.quoteKey)}
                  </p>
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <img
                    src={founder.image}
                    alt=""
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-2 ring-brand-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t(founder.nameKey)}</p>
                    <p className="text-sm text-slate-500">{t(founder.roleKey)}</p>
                  </div>
                  <Link
                    to="/about/$slug"
                    params={{ slug: founder.slug }}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-50"
                    aria-label={t("readMemberStory", { name: t(founder.nameKey) })}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
          <div>
            <Eyebrow>{t("motivationWhyItMatters")}</Eyebrow>
            <SectionHeading>{t("whatKeepsUsBuilding")}</SectionHeading>
          </div>
          <div>
            <Prose>
              <p>{t("whatKeepsUsBuildingDesc")}</p>
            </Prose>
            <StoryLink to="/mission" className="mt-4">
              {t("readOurMission")}
            </StoryLink>
          </div>
        </div>
      </SiteSection>

      <SiteSection tone="brand">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{t("motivationWhatDrivesUs")}</Eyebrow>
          <p className="text-balance text-xl font-semibold leading-snug text-teal-800 sm:text-2xl sm:leading-snug">
            {t("siteTagline")}
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
