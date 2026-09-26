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
import sunilImage from "@/assets/sunil.jpg";
import sanjayImage from "@/assets/sanjay.png";
import dipendraImage from "@/assets/dipendra.jpg";

const FOUNDERS: { id: string; nameKey: StringKey; roleKey: StringKey; quoteKey: StringKey; image: string }[] = [
  { id: "sunil", nameKey: "sunilName", roleKey: "sunilRole", quoteKey: "sunilQuote", image: sunilImage },
  { id: "sanjay", nameKey: "sanjayName", roleKey: "sanjayRole", quoteKey: "sanjayQuote", image: sanjayImage },
  {
    id: "dipendra",
    nameKey: "dipendraName",
    roleKey: "dipendraRole",
    quoteKey: "dipendraQuote",
    image: dipendraImage,
  },
];

export function MotivationPage() {
  // Like About, the motivation copy predates the English website and stays
  // bilingual through i18n.
  const { t } = useI18n();

  return (
    <SiteLayout title="Our Motivation">
      <PageHero
        crumb={{ group: "About", title: "Our Motivation" }}
        eyebrow="Our Motivation"
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

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {FOUNDERS.map((founder) => (
            <li key={founder.id}>
              <figure className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-teal-900/5 sm:p-7">
                <Quote className="h-8 w-8 text-accent-500" aria-hidden />
                <blockquote className="mt-4 flex-1">
                  <p className="text-balance text-lg font-semibold leading-snug text-teal-800 sm:text-xl">
                    {t(founder.quoteKey)}
                  </p>
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <img
                    src={founder.image}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-brand-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t(founder.nameKey)}</p>
                    <p className="text-sm text-slate-500">{t(founder.roleKey)}</p>
                  </div>
                  <Link
                    to="/about"
                    hash={founder.id}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-700 transition-colors hover:bg-brand-50"
                    aria-label={`Read ${t(founder.nameKey)}'s story`}
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
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <Eyebrow>Why it matters</Eyebrow>
            <SectionHeading>{t("whatKeepsUsBuilding")}</SectionHeading>
          </div>
          <div>
            <Prose>
              <p>{t("whatKeepsUsBuildingDesc")}</p>
            </Prose>
            <StoryLink to="/mission" className="mt-6">
              Read our mission
            </StoryLink>
          </div>
        </div>
      </SiteSection>

      <SiteSection tone="brand">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>What drives us</Eyebrow>
          <p className="text-balance text-2xl font-semibold leading-snug text-teal-800 sm:text-3xl sm:leading-snug">
            Connecting local skills with local opportunities.
          </p>
        </div>
      </SiteSection>

      <ReadNext
        links={[
          { to: "/about", hash: "team", title: "Meet the team", teaser: "The people behind Duleko, in full." },
          { to: "/mission", title: "Our Mission", teaser: "A skill should not need a shop to become a business." },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
