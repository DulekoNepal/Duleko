import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  Eye,
  Handshake,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserCircle,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import {
  CONTACT_EMAIL,
  ChipList,
  Eyebrow,
  FinalCta,
  IconBadge,
  IconCard,
  Journey,
  Lead,
  PageHero,
  Prose,
  SectionHeading,
  SectionIntro,
  SiteButton,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  reveal,
  siteCard,
  useSiteActions,
} from "@/components/duleko/Site";
import { SkillIcon } from "@/components/duleko/SkillIcon";
import {
  SITE_SKILLS,
  SKILL_CATEGORIES,
  siteSkill,
  siteSkillName,
  type SiteSkill,
} from "@/components/duleko/site/skills";
import { RidgeLines } from "@/components/duleko/site/ui";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import type { Lang, SkillCategory } from "@/lib/types";
import dulekoMark from "@/assets/duleko-mark.webp";

const TILE_WASH: Record<SkillCategory, string> = {
  trades: "bg-accent-50",
  professional: "bg-navy-50",
  personal: "bg-brand-50",
};

const CATEGORY_LABEL: Record<SkillCategory, StringKey> = {
  trades: "catTrades",
  professional: "catProfessional",
  personal: "catPersonal",
};

const CATEGORY_RULE: Record<SkillCategory, string> = {
  trades: "bg-accent-500",
  professional: "bg-navy-500",
  personal: "bg-brand-600",
};

/** A skill as a small labelled pill, with its icon in the category colour. */
function SkillPill({ skill, lang }: { skill: SiteSkill; lang: Lang }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-surface py-1 pl-1 pr-3 text-sm font-medium text-slate-700">
      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full", TILE_WASH[skill.category])}>
        <SkillIcon skillId={skill.id} category={skill.category} className="h-4 w-4" />
      </span>
      {siteSkillName(skill, lang)}
    </span>
  );
}

// ---- For Individuals -----------------------------------------------------------

const INDIVIDUAL_STEPS: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: UserCircle, titleKey: "stepCreateProfile", bodyKey: "stepCreateProfileBody" },
  { icon: Sparkles, titleKey: "stepShowcase", bodyKey: "stepShowcaseBody" },
  { icon: CalendarDays, titleKey: "indStepAvailability", bodyKey: "indStepAvailabilityBody" },
  { icon: Eye, titleKey: "indStepDiscovered", bodyKey: "stepDiscoveredBody" },
  { icon: Handshake, titleKey: "indStepConnect", bodyKey: "stepConnectBody" },
  { icon: Star, titleKey: "stepReputation", bodyKey: "stepReputationBody" },
];

const PEOPLE: StringKey[] = [
  "peopleStudents",
  "peopleProfessionals",
  "peopleTrained",
  "peopleFarmers",
  "peopleTrades",
  "peopleOwners",
  "peopleExperience",
];

/**
 * What your Duleko profile looks like to the people who find you - laid out
 * like the app's own card (Membership ID in the band, skills, the week's
 * free and busy days, Request work / Chat), filled with "yours" rather than
 * an invented person.
 */
function ProfilePreview() {
  const { t, lang } = useI18n();
  const skills = ["electrician", "mobile_repair"].map(siteSkill);
  const days = t("previewWeekdays").split(",");
  const free = [false, true, true, false, true, true, false];
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="pointer-events-none absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-brand-300/45 via-brand-100/30 to-accent-500/15 blur-2xl"
        aria-hidden
      />
      <article className="relative overflow-hidden rounded-[1.75rem] bg-surface shadow-[0_40px_80px_-40px_rgb(12_60_72/0.55)] ring-1 ring-slate-200/80">
        {/* The band, as on the Duleko ID card: brand on the left, Membership ID on the right. */}
        <div className="band relative h-28 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-teal-800 px-5 pt-4 text-white">
          <RidgeLines className="text-white/10" seed={4} lines={8} />
          <div className="relative flex items-start justify-between gap-3">
            <span className="flex items-center gap-2">
              <img src={dulekoMark} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/30" />
              <span className="font-display text-[15px] font-semibold">Duleko</span>
            </span>
            <span className="text-right leading-tight">
              <span className="eyebrow-track block text-[10px] font-semibold uppercase text-white/65">
                {t("previewMemberId")}
              </span>
              {/* The real format (migration 5100); the number is theirs once they join. */}
              <span className="mt-0.5 block font-mono text-[13px] font-semibold tracking-wider">DLK-26-•••••</span>
            </span>
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* Positioned, so the photo paints over the band it overlaps. */}
          <div className="relative z-10 -mt-10 flex items-end justify-between gap-3">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-md ring-4 ring-surface">
              <UserRound className="h-9 w-9" aria-hidden />
            </span>
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {t("demoPhoneVerified")}
            </span>
          </div>

          <p className="font-display mt-3 text-xl font-semibold text-slate-900">{t("previewYourName")}</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-4 w-4 text-accent-600" aria-hidden />
            {t("previewYourPlace")}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <SkillPill key={skill.id} skill={skill} lang={lang} />
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm font-medium text-slate-500">
              <Plus className="h-4 w-4" aria-hidden />
              {t("skillAddYours")}
            </span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">{t("previewAvailable")}</span>
              <span className="flex items-center gap-3 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                  {t("previewFree")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
                  {t("previewBusy")}
                </span>
              </span>
            </div>
            <ol className="mt-2.5 grid grid-cols-7 gap-1">
              {days.map((day, i) => (
                <li
                  key={day}
                  aria-label={`${day}: ${free[i] ? t("previewFree") : t("previewBusy")}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold",
                    free[i] ? "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {day}
                  <span className={cn("h-1.5 w-1.5 rounded-full", free[i] ? "bg-brand-500" : "bg-slate-300")} aria-hidden />
                </li>
              ))}
            </ol>
          </div>

          {/* How people reach you - shown, not clickable. */}
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2" aria-hidden>
            <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white">
              <Send className="h-4 w-4" />
              {t("requestWork")}
            </span>
            <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              <MessageCircle className="h-4 w-4" />
              {t("chat")}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}

export function ForIndividualsPage() {
  const { createProfile } = useSiteActions();
  const { t, lang } = useI18n();
  const tiers: { labelKey: StringKey; percent: number }[] = [
    { labelKey: "pricingTier1", percent: 5 },
    { labelKey: "pricingTier2", percent: 4 },
    { labelKey: "pricingTier3", percent: 3 },
  ];

  return (
    <SiteLayout title={t("navForIndividuals")}>
      <PageHero story="individuals" eyebrow={t("navForIndividuals")} title={t("indTitle")} aside={<ProfilePreview />}>
        <Lead>
          <p>{t("indBody")}</p>
        </Lead>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <SiteButton size="lg" onClick={createProfile}>
            <UserPlus className="h-5 w-5" aria-hidden />
            {t("indCta")}
          </SiteButton>
          <StoryLink to="/safety">{t("howWeKeepItSafe")}</StoryLink>
        </div>
      </PageHero>

      {/* Who */}
      <SiteSection>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <SectionIntro eyebrow={t("navWhoFor")} title={t("indWhoTitle")} />
          <ChipList items={PEOPLE.map((key) => t(key))} />
        </div>
      </SiteSection>

      {/* Steps */}
      <SiteSection tone="paper">
        <SectionIntro eyebrow={t("homeHowEyebrow")} title={t("indStepsTitle")} />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDIVIDUAL_STEPS.map(({ icon, titleKey, bodyKey }, i) => (
            <li key={titleKey} {...reveal(i * 60)}>
              <IconCard icon={icon} index={i + 1} title={t(titleKey)} tone={i === INDIVIDUAL_STEPS.length - 1 ? "accent" : "brand"}>
                {t(bodyKey)}
              </IconCard>
            </li>
          ))}
        </ol>
      </SiteSection>

      {/* Skills */}
      <SiteSection>
        <SectionIntro eyebrow={t("skillsEyebrow")} title={t("skillsTitle")}>
          <p>{t("skillsBody")}</p>
        </SectionIntro>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {SKILL_CATEGORIES.map((category, i) => (
            <div key={category} className={cn(siteCard, "overflow-hidden")} {...reveal(i * 80)}>
              <div className={cn("h-1", CATEGORY_RULE[category])} aria-hidden />
              <div className="p-5 sm:p-6">
                <p className="font-display text-lg font-semibold text-slate-900">{t(CATEGORY_LABEL[category])}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {SITE_SKILLS.filter((s) => s.category === category).map((skill) => (
                    <li key={skill.id}>
                      <SkillPill skill={skill} lang={lang} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* What it costs */}
      <SiteSection tone="paper" id="pricing">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionIntro eyebrow={t("pricingEyebrow")} title={t("pricingTitle")}>
              <p>{t("pricingBody")}</p>
            </SectionIntro>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-[15px] font-semibold text-brand-800 ring-1 ring-brand-200">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
              {t("pricingEmployers")}
            </p>
          </div>

          <div className={cn(siteCard, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-4 bg-brand-700 px-5 py-4 text-white sm:px-6">
              <span className="text-[15px] font-medium text-white/85">{t("pricingFreeLabel")}</span>
              <span className="font-display text-2xl font-semibold">{t("pricingFreeValue")}</span>
            </div>
            <dl className="divide-y divide-slate-100">
              {tiers.map(({ labelKey, percent }) => (
                <div key={labelKey} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <dt className="text-[15px] text-slate-600">{t(labelKey)}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums text-teal-800">
                    {formatNumber(percent, lang)}%
                  </dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2 border-t border-slate-100 bg-paper px-5 py-4 text-sm leading-relaxed text-slate-600 sm:px-6">
              <p className="font-semibold text-slate-800">{t("pricingExample")}</p>
              <p>{t("pricingNote")}</p>
              <StoryLink to="/terms" hash="rates" className="text-sm sm:text-sm">
                {t("termsOfService")}
              </StoryLink>
            </div>
          </div>
        </div>
      </SiteSection>

      <StoryNav current="individuals" />
      <FinalCta />
    </SiteLayout>
  );
}

// ---- For Businesses ------------------------------------------------------------

const USE_CASES: { titleKey: StringKey; bodyKey: StringKey; skills: string[] }[] = [
  { titleKey: "caseShop", bodyKey: "caseShopBody", skills: ["electrician", "carpenter"] },
  { titleKey: "caseBooks", bodyKey: "caseBooksBody", skills: ["accountant"] },
  { titleKey: "caseEvent", bodyKey: "caseEventBody", skills: ["photographer", "cook", "makeup"] },
  { titleKey: "caseRush", bodyKey: "caseRushBody", skills: ["delivery", "cleaner"] },
  { titleKey: "caseHome", bodyKey: "caseHomeBody", skills: ["plumber", "mechanic"] },
  { titleKey: "caseOnline", bodyKey: "caseOnlineBody", skills: ["it_computer", "designer"] },
];

const HIRE_STEPS: { titleKey: StringKey; bodyKey: StringKey }[] = [
  { titleKey: "hire1", bodyKey: "hire1Body" },
  { titleKey: "hire2", bodyKey: "hire2Body" },
  { titleKey: "hire3", bodyKey: "hire3Body" },
  { titleKey: "hire4", bodyKey: "hire4Body" },
  { titleKey: "hire5", bodyKey: "hire5Body" },
];

export function ForBusinessesPage() {
  const { explore } = useSiteActions();
  const { t, lang } = useI18n();
  const showcase = ["electrician", "plumber", "accountant", "photographer", "designer", "delivery"].map(siteSkill);

  return (
    <SiteLayout title={t("navForBusinesses")}>
      <PageHero
        story="businesses"
        eyebrow={t("navForBusinesses")}
        title={t("bizTitle")}
        aside={
          <div className={cn(siteCard, "p-5 shadow-[0_40px_80px_-40px_rgb(12_60_72/0.5)] sm:p-6")}>
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/80">
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <span className="text-[15px] font-medium text-slate-500">{t("bizFindTitle")}</span>
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {showcase.map((skill) => (
                <li
                  key={skill.id}
                  className={cn("flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center", TILE_WASH[skill.category])}
                >
                  <SkillIcon skillId={skill.id} category={skill.category} className="h-6 w-6" />
                  <span className="text-xs font-medium leading-tight text-slate-700">{siteSkillName(skill, lang)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-brand-800">
              <Check className="h-4 w-4 text-brand-600" strokeWidth={3} aria-hidden />
              {t("pricingEmployers")}
            </p>
          </div>
        }
      >
        <Lead>
          <p>{t("bizP1")}</p>
        </Lead>
        <div className="mt-8">
          <SiteButton size="lg" onClick={() => explore("/search")}>
            <Search className="h-5 w-5" aria-hidden />
            {t("bizCta")}
          </SiteButton>
        </div>
      </PageHero>

      {/* When it helps */}
      <SiteSection>
        <SectionIntro eyebrow={t("bizUseEyebrow")} title={t("bizUseTitle")} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ titleKey, bodyKey, skills }, i) => (
            <li key={titleKey} className={cn(siteCard, "flex flex-col p-5 sm:p-6")} {...reveal(i * 60)}>
              <div className="flex -space-x-1.5">
                {skills.map(siteSkill).map((skill) => (
                  <span
                    key={skill.id}
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-surface",
                      TILE_WASH[skill.category],
                    )}
                    title={siteSkillName(skill, lang)}
                  >
                    <SkillIcon skillId={skill.id} category={skill.category} className="h-5 w-5" />
                  </span>
                ))}
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold text-slate-900 sm:text-xl">{t(titleKey)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{t(bodyKey)}</p>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* How hiring works */}
      <SiteSection tone="ink">
        <SectionIntro tone="light" eyebrow={t("hireEyebrow")} title={t("hireTitle")} />
        <Journey
          tone="light"
          className="mt-12"
          steps={HIRE_STEPS.map(({ titleKey, bodyKey }) => ({ title: t(titleKey), body: t(bodyKey) }))}
        />
      </SiteSection>

      {/* What it costs */}
      <SiteSection tone="paper">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <SectionIntro eyebrow={t("pricingEyebrow")} title={t("bizCostTitle")}>
            <p>{t("bizCostBody")}</p>
          </SectionIntro>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <p className="font-display text-6xl font-semibold text-teal-800 sm:text-7xl">{t("factFreeValue")}</p>
            <SiteButton size="lg" onClick={() => explore("/search")}>
              <Search className="h-5 w-5" aria-hidden />
              {t("bizCta")}
            </SiteButton>
          </div>
        </div>
      </SiteSection>

      <StoryNav current="businesses" />
      <FinalCta />
    </SiteLayout>
  );
}

// ---- For Municipalities & Training Providers -------------------------------

const PIPELINE: { titleKey: StringKey; bodyKey: StringKey }[] = [
  { titleKey: "stageTraining", bodyKey: "pipeTrainingBody" },
  { titleKey: "stageSkills", bodyKey: "pipeSkillsBody" },
  { titleKey: "stageDuleko", bodyKey: "pipeDulekoBody" },
  { titleKey: "stageWork", bodyKey: "pipeWorkBody" },
  { titleKey: "stageIncome", bodyKey: "pipeIncomeBody" },
];

const OFFERS: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Users, titleKey: "offerProfiles", bodyKey: "offerProfilesBody" },
  { icon: BadgeCheck, titleKey: "offerVerified", bodyKey: "offerVerifiedBody" },
  { icon: BarChart3, titleKey: "offerReports", bodyKey: "offerReportsBody" },
];

/** The privacy policy's own example of an aggregated report, drawn as a funnel. */
function ExampleReport() {
  const { t } = useI18n();
  const lines = t("privacyAggregatedExample").split("\n");
  const widths = ["100%", "66%", "37%"];
  return (
    <div className={cn(siteCard, "p-5 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow-track text-xs font-bold uppercase text-slate-400">{t("reportExample")}</p>
        <BarChart3 className="h-5 w-5 text-brand-600" aria-hidden />
      </div>
      <ul className="mt-5 space-y-4">
        {lines.map((line, i) => (
          <li key={line}>
            <p className="text-[15px] font-medium text-slate-800">{line}</p>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full", i === lines.length - 1 ? "bg-accent-500" : "bg-brand-600")}
                style={{ width: widths[i] ?? "30%" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-slate-400">{t("reportExampleNote")}</p>
    </div>
  );
}

export function PartnersPage() {
  const { t } = useI18n();
  const partnerMail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Partnering with Duleko")}`;
  return (
    <SiteLayout title={t("partnersTitle")}>
      <PageHero
        story="partners"
        eyebrow={t("partnersTitle")}
        title={t("partnersHeroTitle")}
        aside={
          <div className="band relative overflow-hidden rounded-3xl bg-teal-800 p-6 text-white shadow-[0_40px_80px_-40px_rgb(12_60_72/0.6)] sm:p-8">
            <RidgeLines className="text-white/[0.07]" seed={6} lines={9} />
            <p className="eyebrow-track relative text-xs font-bold uppercase text-brand-300">{t("partnersNextQuestion")}</p>
            <p className="font-quote relative mt-4 text-balance text-3xl italic leading-tight sm:text-[2.1rem]">
              {t("partnersWhere")}
            </p>
          </div>
        }
      >
        <Lead>
          <p>{t("partnersBody")}</p>
        </Lead>
        <a
          href={partnerMail}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-12px_rgb(21_128_61/0.7)] transition-colors hover:bg-brand-800 sm:text-base"
        >
          <Mail className="h-5 w-5" aria-hidden />
          {t("partnerWithDuleko")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </PageHero>

      {/* The pipeline */}
      <SiteSection>
        <div className="max-w-3xl">
          <Eyebrow>{t("missionBeyondCert")}</Eyebrow>
          <SectionHeading>{t("partnersCertTitle")}</SectionHeading>
        </div>
        <div className="mt-12 rounded-3xl bg-paper p-6 ring-1 ring-slate-200/70 sm:p-8 lg:p-10" {...reveal()}>
          <Journey steps={PIPELINE.map(({ titleKey, bodyKey }) => ({ title: t(titleKey), body: t(bodyKey) }))} />
        </div>
      </SiteSection>

      {/* What partnering looks like */}
      <SiteSection tone="paper">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <SectionIntro eyebrow={t("partnerOfferEyebrow")} title={t("partnerOfferTitle")} />
            <ul className="mt-8 space-y-5">
              {OFFERS.map(({ icon, titleKey, bodyKey }, i) => (
                <li key={titleKey} className="flex gap-4" {...reveal(i * 80)}>
                  <IconBadge icon={icon} tone={i === 2 ? "navy" : "brand"} />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">{t(titleKey)}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{t(bodyKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 lg:pt-6">
            <ExampleReport />
            <p className="flex gap-3 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200/80">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1">{t("partnersPrivacyNote")}</span>
            </p>
          </div>
        </div>
      </SiteSection>

      {/* Get in touch */}
      <SiteSection>
        <div className={cn(siteCard, "flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8")}>
          <div className="flex items-start gap-4">
            <IconBadge icon={MessageCircle} tone="accent" />
            <div>
              <h2 className="font-display text-2xl font-semibold text-teal-800 sm:text-[1.75rem]">{t("partnerContactTitle")}</h2>
              <Prose className="mt-1.5">
                <p>{t("partnerContactBody")}</p>
              </Prose>
            </div>
          </div>
          <a
            href={partnerMail}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Mail className="h-5 w-5" aria-hidden />
            {t("emailUs")}
          </a>
        </div>
      </SiteSection>

      <StoryNav current="partners" />
      <FinalCta />
    </SiteLayout>
  );
}
