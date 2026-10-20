import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Eye,
  GraduationCap,
  Handshake,
  Landmark,
  Link2Off,
  MapPin,
  Minus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  BrandWatermark,
  CheckList,
  Container,
  Eyebrow,
  FactGrid,
  FinalCta,
  IconCard,
  PrimaryCtas,
  Prose,
  RidgeLines,
  SectionHeading,
  SectionIntro,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  reveal,
  siteCard,
  siteCardHover,
} from "@/components/duleko/Site";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import { SITE_SKILLS, siteSkill, siteSkillName, type SiteSkill } from "@/components/duleko/site/skills";
import { useI18n, type StringKey } from "@/lib/i18n";
import { getPublicActivityStats } from "@/lib/queries";
import { ACTIVITY_ROWS } from "@/lib/activity";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import type { SkillCategory } from "@/lib/types";

const STEPS: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: UserCircle, titleKey: "stepCreateProfile", bodyKey: "stepCreateProfileBody" },
  { icon: Sparkles, titleKey: "stepShowcase", bodyKey: "stepShowcaseBody" },
  { icon: Eye, titleKey: "stepDiscovered", bodyKey: "stepDiscoveredBody" },
  { icon: Handshake, titleKey: "stepConnect", bodyKey: "stepConnectBody" },
  { icon: Wallet, titleKey: "stepWorkEarn", bodyKey: "stepWorkEarnBody" },
  { icon: Star, titleKey: "stepReputation", bodyKey: "stepReputationBody" },
];

const AUDIENCES = [
  { icon: Wrench, titleKey: "audSkilled", bodyKey: "audSkilledBody", to: "/individuals" },
  { icon: Search, titleKey: "audJobSeekers", bodyKey: "audJobSeekersBody", to: "/individuals" },
  { icon: GraduationCap, titleKey: "audStudents", bodyKey: "audStudentsBody", to: "/individuals" },
  { icon: Briefcase, titleKey: "audProfessionals", bodyKey: "audProfessionalsBody", to: "/individuals" },
  { icon: Building2, titleKey: "audBusinesses", bodyKey: "audBusinessesBody", to: "/businesses" },
] as const;

const SHOP_COSTS: StringKey[] = ["shopRent", "shopLocation", "shopEquipment", "shopBills", "shopMarketing"];
const PROFILE_NEEDS: StringKey[] = ["profileNeedSkill", "profileNeedPhone", "profileNeedFree", "profileNeedNearby"];

/** The pale wash behind a skill icon, in its category's colour (as on the app's Home). */
const TILE_WASH: Record<SkillCategory, string> = {
  trades: "bg-accent-50",
  professional: "bg-navy-50",
  personal: "bg-brand-50",
};

const CATEGORY_DOT: Record<SkillCategory, string> = {
  trades: "bg-accent-500",
  professional: "bg-navy-500",
  personal: "bg-brand-600",
};

const CATEGORY_LABEL: Record<SkillCategory, StringKey> = {
  trades: "catTrades",
  professional: "catProfessional",
  personal: "catPersonal",
};

/** Home for signed-out web visitors - see AppShell. */
export function LandingPage() {
  const { t, lang } = useI18n();

  return (
    // English keeps index.html's own tab title; Nepali gets a translated one.
    <SiteLayout title={lang === "ne" ? t("homeHeroTitle") : undefined}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <RidgeLines className="text-teal-800/[0.08]" seed={1} lines={16} />
        <div
          className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-200/50 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl"
          aria-hidden
        />
        <Container className="relative grid items-center gap-14 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 lg:pb-24 lg:pt-16">
          <div className="animate-in-up">
            <p className="inline-flex items-center gap-2.5 rounded-full bg-surface/80 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur sm:text-sm">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              {t("heroKicker")}
            </p>
            <h1 className="font-display mt-6 text-balance text-[2.9rem] font-semibold leading-[0.98] text-teal-800 sm:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]">
              {t("homeHeroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">{t("homeHeroBody")}</p>
            <div className="mt-8">
              <PrimaryCtas />
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200/80 pt-5 text-sm font-medium text-slate-600">
              {(["heroTrustFree", "heroTrustLangs", "heroTrustApp"] as const).map((key) => (
                <li key={key} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand-600" strokeWidth={2.5} aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <HeroDemo />
        </Container>
      </section>

      <SkillsShowcase />

      <ActivityNumbers />

      {/* The Problem */}
      <SiteSection>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>{t("homeProblemEyebrow")}</Eyebrow>
            <SectionHeading className="lg:text-5xl">{t("homeProblemTitle")}</SectionHeading>
          </div>
          <Prose className="lg:pt-10">
            <p>{t("homeProblemP1")}</p>
            <p>{t("homeProblemP2")}</p>
          </Prose>
        </div>

        <div className="mt-12 grid items-center gap-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <GapCard icon={Users} tone="brand">
            {t("homeSkillExists")}
          </GapCard>
          <div className="flex flex-col items-center md:flex-row">
            <span className="h-6 border-l-2 border-dashed border-accent-500/60 md:h-0 md:w-8 md:border-l-0 md:border-t-2 lg:w-12" aria-hidden />
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-accent-500 bg-accent-50 px-4 py-2 text-center text-[15px] font-semibold text-accent-600">
              <Link2Off className="h-4 w-4 shrink-0" aria-hidden />
              {t("homeConnectionMissing")}
            </p>
            <span className="h-6 border-l-2 border-dashed border-accent-500/60 md:h-0 md:w-8 md:border-l-0 md:border-t-2 lg:w-12" aria-hidden />
          </div>
          <GapCard icon={Briefcase} tone="navy">
            {t("homeOpportunityExists")}
          </GapCard>
        </div>
      </SiteSection>

      {/* Our Solution */}
      <SiteSection tone="ink">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
          <div>
            <SectionIntro tone="light" eyebrow={t("homeSolutionEyebrow")} title={t("homeSolutionTitle")}>
              <p>{t("homeSolutionBody")}</p>
            </SectionIntro>
            <p className="font-display mt-8 text-2xl font-semibold leading-snug sm:text-[1.75rem]">
              {t("homeYouBring")} <span className="text-brand-300">{t("homeDulekoFinds")}</span>
            </p>
            <StoryLink to="/mission" tone="light" className="mt-5">
              {t("readOurMission")}
            </StoryLink>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 sm:p-6">
              <p className="eyebrow-track text-xs font-bold uppercase text-white/50">{t("shopNeedsTitle")}</p>
              <ul className="mt-4 space-y-3">
                {SHOP_COSTS.map((key) => (
                  <li key={key} className="flex items-center gap-3 text-white/55">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="line-through decoration-white/30">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-surface p-5 text-slate-900 shadow-2xl shadow-black/20 sm:-my-4 sm:p-6">
              <p className="eyebrow-track text-xs font-bold uppercase text-brand-700">{t("profileNeedsTitle")}</p>
              <CheckList className="mt-4" items={PROFILE_NEEDS.map((key) => t(key))} />
            </div>
          </div>
        </div>
      </SiteSection>

      {/* How Duleko Works */}
      <SiteSection tone="paper">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionIntro eyebrow={t("homeHowEyebrow")} title={t("homeHowTitle")} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 lg:pb-1">
            <StoryLink to="/individuals">{t("homeStartProfile")}</StoryLink>
            <StoryLink to="/safety">{t("howWeKeepItSafe")}</StoryLink>
          </div>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ icon, titleKey, bodyKey }, i) => (
            <li key={titleKey} {...reveal(i * 60)}>
              <IconCard icon={icon} index={i + 1} title={t(titleKey)} tone={i === STEPS.length - 1 ? "accent" : "brand"}>
                {t(bodyKey)}
              </IconCard>
            </li>
          ))}
        </ol>
      </SiteSection>

      {/* Who Is Duleko For? */}
      <SiteSection>
        <SectionIntro eyebrow={t("homeWhoEyebrow")} title={t("homeWhoTitle")} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map(({ icon, titleKey, bodyKey, to }) => (
            <IconCard key={titleKey} icon={icon} title={t(titleKey)} to={to} tone={to === "/businesses" ? "navy" : "brand"}>
              {t(bodyKey)}
            </IconCard>
          ))}
          <div className="band relative flex min-h-44 items-end overflow-hidden rounded-2xl bg-teal-800 p-5 text-white sm:p-6">
            <RidgeLines className="text-white/[0.07]" seed={9} lines={8} />
            <BrandWatermark className="-right-6 -top-6 h-32 w-32" />
            <p className="font-display relative text-xl font-semibold leading-snug sm:text-2xl">{t("serviceEitherWay")}</p>
          </div>
        </div>

        <Link
          to="/partners"
          className={cn(
            siteCard,
            siteCardHover,
            "group mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6",
          )}
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-inset ring-accent-500/20">
            <Landmark className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display block text-lg font-semibold text-slate-900 sm:text-xl">{t("partnersTitle")}</span>
            <span className="mt-1 block text-[15px] text-slate-600">{t("navForPartnersDesc")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
            {t("partnerWithDuleko")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>
      </SiteSection>

      {/* Duleko at a glance */}
      <SiteSection tone="paper">
        <Eyebrow>{t("factsEyebrow")}</Eyebrow>
        <FactGrid
          className="mt-2"
          facts={[
            { value: t("factSkillsValue"), label: t("factSkillsLabel") },
            { value: t("factLangValue"), label: t("factLangLabel") },
            { value: t("factFreeValue"), label: t("factFreeLabel") },
            { value: t("factAppValue"), label: t("factAppLabel") },
          ]}
        />
      </SiteSection>

      <StoryNav current="home" />
      <FinalCta />
    </SiteLayout>
  );
}

/** One side of "the skill exists / the opportunity exists". */
function GapCard({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "navy";
  children: React.ReactNode;
}) {
  return (
    <div className={cn(siteCard, "flex items-center gap-4 p-5 sm:p-6")}>
      <span
        className={cn(
          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
          tone === "brand" ? "bg-brand-50 text-brand-700 ring-brand-200/70" : "bg-navy-50 text-navy-700 ring-navy-500/15",
        )}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">{children}</p>
    </div>
  );
}

/**
 * The hero's picture of the product: a search, a work request whose price
 * was negotiated, and the trust signals around it - the real flow, drawn
 * with the app's own skill icons and its Nepali (BS) dates.
 */
function HeroDemo() {
  const { t, lang } = useI18n();
  const tiles = ["electrician", "tutor", "barber"].map(siteSkill);

  return (
    <figure className="relative mx-auto w-full max-w-md animate-in-up lg:mx-0 lg:ml-auto lg:max-w-[30rem]" style={{ "--delay": "120ms" } as React.CSSProperties}>
      <div
        className="pointer-events-none absolute inset-x-4 -bottom-8 top-12 rounded-[2.5rem] bg-gradient-to-br from-brand-300/40 via-brand-100/30 to-accent-500/20 blur-2xl"
        aria-hidden
      />

      {/* A search for a skill, nearby */}
      <div className="relative rounded-3xl bg-surface p-3.5 shadow-[0_30px_60px_-30px_rgb(12_60_72/0.45)] ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/80">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate text-[15px] font-medium text-slate-900">{t("demoSearchSkill")}</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            <MapPin className="h-3.5 w-3.5 text-accent-600" aria-hidden />
            {t("demoPlace")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {tiles.map((skill) => (
            <div
              key={skill.id}
              className={cn("flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center", TILE_WASH[skill.category])}
            >
              <SkillIcon skillId={skill.id} category={skill.category} className="h-6 w-6" />
              <span className="text-xs font-medium leading-tight text-slate-700">{siteSkillName(skill, lang)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The work request, with its price agreed */}
      <div className="relative -mt-3 ml-6 rounded-3xl bg-surface p-4 shadow-[0_40px_80px_-30px_rgb(12_60_72/0.55)] ring-1 ring-slate-200/80 sm:ml-16 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow-track text-[11px] font-bold uppercase text-slate-400">{t("demoRequest")}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            {t("demoAgreed")}
          </span>
        </div>
        <p className="font-display mt-2 text-lg font-semibold text-slate-900 sm:text-xl">{t("demoJob")}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatDate("2026-11-14", lang)}
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
            <span className="text-slate-500">{t("demoOffer")}</span>
            <span className="font-semibold tabular-nums text-slate-400 line-through">{formatMoney(1500, lang)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm ring-1 ring-brand-200">
            <span className="font-medium text-brand-800">{t("demoCounter")}</span>
            <span className="font-semibold tabular-nums text-brand-800">{formatMoney(1300, lang)}</span>
          </div>
        </div>
      </div>

      {/* Trust signals around it */}
      <div className="absolute -top-5 right-5 hidden items-center gap-2 rounded-full bg-surface py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-slate-700 shadow-xl ring-1 ring-slate-200/80 sm:flex">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-700">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        {t("demoPhoneVerified")}
      </div>
      <div className="relative -mt-4 ml-auto mr-4 flex w-fit items-center gap-2 rounded-full bg-surface py-2 pl-3 pr-4 shadow-xl ring-1 ring-slate-200/80 sm:mr-8">
        <span className="flex text-sun-500" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </span>
        <span className="text-sm font-medium text-slate-700">{t("demoReviewed")}</span>
      </div>
      <figcaption className="sr-only">{t("demoCaption")}</figcaption>
    </figure>
  );
}

/** Every skill on Duleko, sliding past in two rows, with the category key. */
function SkillsShowcase() {
  const { t, lang } = useI18n();
  const half = Math.ceil(SITE_SKILLS.length / 2);
  const rows = [SITE_SKILLS.slice(0, half), SITE_SKILLS.slice(half)];

  return (
    <section className="overflow-hidden border-y border-slate-200/70 bg-surface py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" {...reveal()}>
          <SectionIntro eyebrow={t("skillsEyebrow")} title={t("skillsTitle")}>
            <p>{t("skillsBody")}</p>
          </SectionIntro>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 lg:max-w-xs lg:flex-col lg:pb-1">
            {(Object.keys(CATEGORY_LABEL) as SkillCategory[]).map((category) => (
              <li key={category} className="inline-flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", CATEGORY_DOT[category])} aria-hidden />
                {t(CATEGORY_LABEL[category])}
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="marquee-pause fade-x mt-10 space-y-3">
        {rows.map((row, i) => (
          <SkillRow key={i} skills={row} reverse={i === 1} lang={lang} />
        ))}
      </div>
    </section>
  );
}

function SkillRow({ skills, reverse, lang }: { skills: SiteSkill[]; reverse: boolean; lang: "en" | "ne" }) {
  return (
    <div className="flex overflow-hidden">
      <ul
        className={cn("flex w-max shrink-0", reverse ? "animate-marquee-reverse" : "animate-marquee")}
        style={{ "--duration": `${skills.length * 4.5}s` } as React.CSSProperties}
      >
        {/* Two copies, so sliding by one copy's width loops seamlessly. */}
        {[...skills, ...skills].map((skill, i) => (
          <li
            key={`${skill.id}-${i}`}
            aria-hidden={i >= skills.length || undefined}
            className="mr-3 inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-surface py-2 pl-2 pr-4 text-[15px] font-medium text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04)]"
          >
            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", TILE_WASH[skill.category])}>
              <SkillIcon skillId={skill.id} category={skill.category} className="h-[18px] w-[18px]" />
            </span>
            {siteSkillName(skill, lang)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Activities made in Duleko": the rounded numbers (6900), only once
 * staff have switched them on - until then, and if they can't be loaded,
 * the section isn't there at all.
 */
function ActivityNumbers() {
  const { t, lang } = useI18n();
  const stats = useQuery({
    queryKey: ["public-activity"],
    queryFn: getPublicActivityStats,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const numbers = stats.data;
  if (!numbers) return null;

  // Not a SiteSection: its fade-in only picks up blocks present when the
  // page first renders, and this one arrives with its numbers a moment later.
  return (
    <section className="relative scroll-mt-20 py-14 sm:py-20 lg:py-24">
      <Container>
        <Eyebrow>{t("siteStatsEyebrow")}</Eyebrow>
        <SectionHeading>{t("siteStatsTitle")}</SectionHeading>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACTIVITY_ROWS.filter((row) => !row.staffOnly).map(({ key, label, icon: Icon, money }) => {
            const value = numbers[key] ?? 0;
            // Rounded down by the database, so anything past 10 reads "120+".
            const shown = `${money ? formatMoney(value, lang) : formatNumber(value, lang)}${value >= 10 ? "+" : ""}`;
            return (
              <div key={key} className={cn(siteCard, "flex flex-col gap-2 p-4", money && "col-span-2 sm:col-span-1")}>
                <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                <dd className="font-display text-2xl font-semibold tabular-nums text-teal-800 sm:text-3xl">{shown}</dd>
                <dt className="text-sm text-slate-600">{t(label)}</dt>
              </div>
            );
          })}
        </dl>
      </Container>
    </section>
  );
}
