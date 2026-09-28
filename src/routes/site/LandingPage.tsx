import {
  ArrowRight,
  Briefcase,
  Building2,
  Eye,
  GraduationCap,
  Handshake,
  Landmark,
  Link2Off,
  Search,
  Sparkles,
  Star,
  UserCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  BrandWatermark,
  Container,
  Eyebrow,
  FinalCta,
  IconCard,
  NEPALI_TAGLINE,
  PrimaryCtas,
  Prose,
  SectionHeading,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";
import { Link } from "@tanstack/react-router";
import { useI18n, type StringKey } from "@/lib/i18n";
import dulekoMark from "@/assets/duleko-mark.webp";

const STEPS: { icon: React.ComponentType<{ className?: string }>; labelKey: StringKey }[] = [
  { icon: UserCircle, labelKey: "stepCreateProfile" },
  { icon: Sparkles, labelKey: "stepShowcase" },
  { icon: Eye, labelKey: "stepDiscovered" },
  { icon: Handshake, labelKey: "stepConnect" },
  { icon: Wallet, labelKey: "stepWorkEarn" },
  { icon: Star, labelKey: "stepReputation" },
];

const AUDIENCES = [
  { icon: Wrench, titleKey: "audSkilled", bodyKey: "audSkilledBody", to: "/individuals" },
  { icon: Search, titleKey: "audJobSeekers", bodyKey: "audJobSeekersBody", to: "/individuals" },
  { icon: GraduationCap, titleKey: "audStudents", bodyKey: "audStudentsBody", to: "/individuals" },
  { icon: Briefcase, titleKey: "audProfessionals", bodyKey: "audProfessionalsBody", to: "/individuals" },
  { icon: Building2, titleKey: "audBusinesses", bodyKey: "audBusinessesBody", to: "/businesses" },
] as const;

const HERO_STAGES: StringKey[] = ["stageProfile", "stageDiscovery", "stageWork", "stageReputation"];

/** Home for signed-out web visitors - see AppShell. */
export function LandingPage() {
  const { t, lang } = useI18n();
  return (
    // English keeps index.html's own tab title; Nepali gets a translated one.
    <SiteLayout title={lang === "ne" ? t("homeHeroTitle") : undefined}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-teal-800 text-white">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl"
          aria-hidden
        />
        {/* Fills the open green beside the copy on phones and tablets, and
            sits behind the glass card on desktop. */}
        <BrandWatermark className="-bottom-6 -right-12 h-56 w-56 sm:-right-8 sm:h-72 sm:w-72 lg:-right-16 lg:bottom-auto lg:top-1/2 lg:h-[30rem] lg:w-[30rem] lg:-translate-y-1/2" />
        <Container className="relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.25fr_1fr] lg:py-20">
          <div className="animate-in-up">
            <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
              {t("homeHeroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
              {t("homeHeroBody")}
            </p>
            <div className="mt-6">
              <PrimaryCtas onDark />
            </div>
            <p lang="ne" className="mt-5 text-lg font-semibold text-brand-200">
              {NEPALI_TAGLINE}
            </p>
          </div>

          <div className="relative mx-auto hidden w-full max-w-sm lg:block" aria-hidden>
            <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
                <img src={dulekoMark} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div>
                  <p className="font-semibold">{t("homeCardSkill")}</p>
                  <p className="text-sm text-slate-500">{t("homeCardVisible")}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                {HERO_STAGES.map((item, i) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium">{t(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* The Problem */}
      <SiteSection>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-12">
          <div>
            <Eyebrow>{t("homeProblemEyebrow")}</Eyebrow>
            <SectionHeading>{t("homeProblemTitle")}</SectionHeading>
          </div>
          <Prose>
            <p>{t("homeProblemP1")}</p>
            <p>{t("homeProblemP2")}</p>
          </Prose>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 sm:p-5">
            <Users className="mb-2 h-6 w-6 text-brand-700" aria-hidden />
            <p className="text-base font-semibold text-slate-900 sm:text-lg">{t("homeSkillExists")}</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 sm:p-5">
            <Briefcase className="mb-2 h-6 w-6 text-brand-700" aria-hidden />
            <p className="text-base font-semibold text-slate-900 sm:text-lg">{t("homeOpportunityExists")}</p>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-accent-500 bg-accent-50 p-4 sm:p-5">
            <Link2Off className="mb-2 h-6 w-6 text-accent-600" aria-hidden />
            <p className="text-base font-semibold text-slate-900 sm:text-lg">{t("homeConnectionMissing")}</p>
          </div>
        </div>
      </SiteSection>

      {/* Our Solution */}
      <SiteSection tone="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{t("homeSolutionEyebrow")}</Eyebrow>
          <SectionHeading>{t("homeSolutionTitle")}</SectionHeading>
          <Prose className="mt-4">
            <p>{t("homeSolutionBody")}</p>
          </Prose>
          <p className="mt-6 inline-block rounded-2xl bg-white px-5 py-4 text-lg font-semibold text-teal-800 shadow-sm ring-1 ring-slate-200 sm:text-xl">
            {t("homeYouBring")} <span className="text-brand-700">{t("homeDulekoFinds")}</span>
          </p>
          <div className="mt-5">
            <StoryLink to="/mission">{t("readOurMission")}</StoryLink>
          </div>
        </div>
      </SiteSection>

      {/* How Duleko Works */}
      <SiteSection>
        <div className="max-w-2xl">
          <Eyebrow>{t("homeHowEyebrow")}</Eyebrow>
          <SectionHeading>{t("homeHowTitle")}</SectionHeading>
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, labelKey }, i) => (
            <li
              key={labelKey}
              className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-600">{t("homeStep", { n: i + 1 })}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">{t(labelKey)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <StoryLink to="/individuals">{t("homeStartProfile")}</StoryLink>
          <StoryLink to="/safety">{t("howWeKeepItSafe")}</StoryLink>
        </div>
      </SiteSection>

      {/* Who Is Duleko For? */}
      <SiteSection tone="brand">
        <div className="max-w-2xl">
          <Eyebrow>{t("homeWhoEyebrow")}</Eyebrow>
          <SectionHeading>{t("homeWhoTitle")}</SectionHeading>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {AUDIENCES.map(({ icon, titleKey, bodyKey, to }) => (
            <IconCard key={titleKey} icon={icon} title={t(titleKey)} to={to}>
              {t(bodyKey)}
            </IconCard>
          ))}
          <div className="relative flex items-center overflow-hidden rounded-2xl bg-teal-800 p-4 text-white shadow-sm sm:p-5">
            <BrandWatermark className="-bottom-5 -right-5 h-28 w-28" />
            <p className="relative text-base font-semibold leading-snug sm:text-lg">
              {t("serviceEitherWay")}
            </p>
          </div>
        </div>

        <Link
          to="/partners"
          className="group mt-3 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-sm sm:mt-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md sm:flex-row sm:items-center"
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <Landmark className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-slate-900 sm:text-lg">
              {t("partnersTitle")}
            </span>
            <span className="mt-0.5 block text-[15px] text-slate-600">{t("navForPartnersDesc")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
            {t("partnerWithDuleko")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>
      </SiteSection>

      <StoryNav current="home" />
      <FinalCta />
    </SiteLayout>
  );
}
