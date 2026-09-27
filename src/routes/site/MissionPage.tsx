import { Store } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  Flow,
  PageHero,
  Prose,
  SectionHeading,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";
import { useI18n } from "@/lib/i18n";

export function MissionPage() {
  const { t } = useI18n();
  return (
    <SiteLayout title={t("ourMission")}>
      <PageHero story="mission" eyebrow={t("ourMission")} title={t("missionTeaser")}>
        <Prose>
          <p>{t("missionHeroBody")}</p>
        </Prose>
      </PageHero>

      <SiteSection>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-2xl border border-slate-200 bg-cream-50 p-5 sm:p-6">
            <Store className="mb-3 h-7 w-7 text-slate-400" aria-hidden />
            <p className="text-base leading-relaxed text-slate-700 sm:text-lg">
              {t("missionShopCosts")}
            </p>
          </div>
          <div>
            <Prose>
              <p>{t("missionDifferent")}</p>
            </Prose>
            <p className="mt-3 text-xl font-bold leading-snug text-teal-800 sm:text-2xl">
              {t("missionWhatIf")}
            </p>
            <Prose className="mt-4">
              <p>{t("missionVirtualSpace")}</p>
            </Prose>
          </div>
        </div>
      </SiteSection>

      <SiteSection tone="cream">
        <div className="max-w-3xl">
          <Eyebrow>{t("missionWhatWeDo")}</Eyebrow>
          <SectionHeading>{t("missionDiscoverableTitle")}</SectionHeading>
          <Prose className="mt-4">
            <p>{t("missionSkillsEverywhere")}</p>
            <p>{t("missionOurMissionIs")}</p>
          </Prose>
          <Flow
            className="mt-5"
            steps={[t("stageSkill"), t("stageVisibility"), t("stageOpportunity"), t("stageIncome")]}
          />
        </div>
      </SiteSection>

      <SiteSection>
        <div className="max-w-3xl">
          <Eyebrow>{t("missionBeyondCert")}</Eyebrow>
          <SectionHeading>{t("missionTrainingTitle")}</SectionHeading>
          <Prose className="mt-4">
            <p>{t("missionTrainingP1")}</p>
            <p>{t("missionTrainingP2")}</p>
            <p>{t("missionTrainingP3")}</p>
          </Prose>
          <Flow
            className="mt-5"
            steps={[
              t("stageTraining"),
              t("stageProfile"),
              t("stageDiscovery"),
              t("stageWork"),
              t("stageReputation"),
              t("stageOpportunity"),
            ]}
          />
          <blockquote className="mt-6 border-l-4 border-accent-500 pl-4 text-lg font-semibold leading-snug text-teal-800 sm:text-xl">
            {t("missionQuote")}
          </blockquote>
          <StoryLink to="/partners" className="mt-5">
            {t("partnersTitle")}
          </StoryLink>
        </div>
      </SiteSection>

      <SiteSection tone="brand">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{t("missionVisionEyebrow")}</Eyebrow>
          <p className="text-balance text-xl font-semibold leading-snug text-teal-800 sm:text-2xl sm:leading-snug">
            {t("missionVision")}
          </p>
        </div>
      </SiteSection>

      <StoryNav current="mission" />
      <FinalCta />
    </SiteLayout>
  );
}
