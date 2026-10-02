import { ArrowRight, CheckCircle2, Mail, Search, UserPlus } from "lucide-react";
import {
  CONTACT_EMAIL,
  FinalCta,
  Flow,
  PageHero,
  Prose,
  SectionHeading,
  SiteButton,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  useSiteActions,
} from "@/components/duleko/Site";
import { useI18n, type StringKey } from "@/lib/i18n";

const INDIVIDUAL_STEPS: StringKey[] = [
  "stepCreateProfile",
  "stepShowcase",
  "indStepAvailability",
  "indStepDiscovered",
  "indStepConnect",
  "stepReputation",
];

export function ForIndividualsPage() {
  const { createProfile } = useSiteActions();
  const { t } = useI18n();
  return (
    <SiteLayout title={t("navForIndividuals")}>
      <PageHero story="individuals" eyebrow={t("navForIndividuals")} title={t("indTitle")}>
        <Prose>
          <p>{t("indBody")}</p>
        </Prose>
      </PageHero>

      <SiteSection>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {INDIVIDUAL_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              <span className="text-[15px] font-medium text-slate-800 sm:text-base">{t(step)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <SiteButton size="lg" onClick={createProfile}>
            <UserPlus className="h-5 w-5" aria-hidden />
            {t("indCta")}
          </SiteButton>
          <StoryLink to="/safety">{t("howWeKeepItSafe")}</StoryLink>
        </div>
      </SiteSection>
      <StoryNav current="individuals" />
      <FinalCta />
    </SiteLayout>
  );
}

export function ForBusinessesPage() {
  const { explore } = useSiteActions();
  const { t } = useI18n();
  return (
    <SiteLayout title={t("navForBusinesses")}>
      <PageHero story="businesses" eyebrow={t("navForBusinesses")} title={t("bizTitle")}>
        <Prose>
          <p>{t("bizP1")}</p>
          <p>{t("bizP2")}</p>
        </Prose>
        <div className="mt-6">
          <SiteButton size="lg" onClick={() => explore("/search")}>
            <Search className="h-5 w-5" aria-hidden />
            {t("bizCta")}
          </SiteButton>
        </div>
      </PageHero>
      <StoryNav current="businesses" />
      <FinalCta />
    </SiteLayout>
  );
}

export function PartnersPage() {
  const { t } = useI18n();
  const partnerMail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Partnering with Duleko")}`;
  return (
    <SiteLayout title={t("partnersTitle")}>
      <PageHero story="partners" eyebrow={t("partnersTitle")} title={t("partnersHeroTitle")}>
        <Prose>
          <p>{t("partnersBody")}</p>
        </Prose>
      </PageHero>

      <SiteSection>
        <Flow
          steps={[t("stageTraining"), t("stageSkills"), t("stageDuleko"), t("stageWork"), t("stageIncome")]}
        />

        <div className="mt-10 max-w-3xl">
          <SectionHeading>{t("partnersCertTitle")}</SectionHeading>
          <div className="mt-5 rounded-2xl border border-accent-500/40 bg-accent-50 p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
              {t("partnersNextQuestion")}
            </p>
            <p className="mt-1.5 text-xl font-bold text-teal-800 sm:text-2xl">{t("partnersWhere")}</p>
          </div>
          <a
            href={partnerMail}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 text-[15px] sm:text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <Mail className="h-5 w-5" aria-hidden />
            {t("partnerWithDuleko")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </SiteSection>
      <StoryNav current="partners" />
      <FinalCta />
    </SiteLayout>
  );
}
