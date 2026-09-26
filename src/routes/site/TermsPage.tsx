import { BadgeCheck, CalendarDays, Handshake, Scale, ShieldAlert, Wallet } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  Flow,
  IconCard,
  PageHero,
  Prose,
  ReadNext,
  SectionHeading,
  SiteLayout,
  SiteSection,
} from "@/components/duleko/Site";
import {
  PolicyBullets,
  PolicyContact,
  PolicyMeta,
  PolicyNote,
  PolicySections,
  PolicyStrong,
  type PolicySection,
} from "@/components/duleko/site/policy";
import { useI18n } from "@/lib/i18n";

/** "the work → location → … ." becomes chips: "The work", "Location", … */
function agreementSteps(text: string): string[] {
  return text
    .split("→")
    .map((step) => step.trim().replace(/[.।]$/, ""))
    .filter(Boolean)
    .map((step) => step.charAt(0).toUpperCase() + step.slice(1));
}

export function TermsPage() {
  const { t } = useI18n();

  const sections: PolicySection[] = [
    {
      id: "about",
      title: t("termsAboutTitle"),
      body: (
        <>
          <p>{t("termsAboutDesc")}</p>
          <PolicyNote>{t("termsNotEmployer")}</PolicyNote>
        </>
      ),
    },
    {
      id: "account",
      title: t("termsCreatingAccountTitle"),
      body: (
        <>
          <p>{t("termsCreatingAccountDesc")}</p>
          <PolicyStrong>{t("termsMustNot")}</PolicyStrong>
          <PolicyBullets
            keys={[
              "termsMustNotImpersonate",
              "termsMustNotFraud",
              "termsMustNotFalseInfo",
              "termsMustNotFakeCerts",
              "termsMustNotMisuseInfo",
            ]}
          />
          <PolicyNote>{t("termsAccountResponsibility")}</PolicyNote>
        </>
      ),
    },
    {
      id: "skills",
      title: t("termsSkillsTitle"),
      body: (
        <>
          <p>{t("termsSkillsDesc")}</p>
          <p>{t("termsNotVerified")}</p>
          <p>{t("termsVerificationIndicator")}</p>
          <PolicyStrong>{t("termsNoFalseClaims")}</PolicyStrong>
        </>
      ),
    },
    {
      id: "work",
      title: t("termsWorkArrangementsTitle"),
      body: (
        <>
          <p>{t("termsWorkArrangementsDesc")}</p>
          <p>{t("termsUnlessStated")}</p>
          <Flow steps={agreementSteps(t("termsWorkAgreement"))} />
          <p>{t("termsNoGuarantee")}</p>
          <PolicyNote>{t("termsUseJudgment")}</PolicyNote>
        </>
      ),
    },
    {
      id: "rates",
      title: t("termsRatesPaymentsTitle"),
      body: (
        <>
          <p>{t("termsRatesDesc")}</p>
          <PolicyNote>{t("termsNoIntegratedPayment")}</PolicyNote>
        </>
      ),
    },
    {
      id: "reviews",
      title: t("termsReviewsTitle"),
      body: (
        <>
          <p>{t("termsReviewsDesc")}</p>
          <p>{t("termsReviewsGenuine")}</p>
          <PolicyNote>{t("termsReviewsDistinction")}</PolicyNote>
        </>
      ),
    },
    {
      id: "safety",
      title: t("termsSafetyTitle"),
      body: (
        <>
          <p className="flex gap-3 rounded-xl border border-accent-500/30 bg-accent-50 px-4 py-3 font-medium text-slate-800">
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-accent-600" aria-hidden />
            <span className="min-w-0 flex-1">{t("termsSafetyDesc")}</span>
          </p>
          <p>{t("termsReportSuspicious")}</p>
          <p>{t("termsInvestigate")}</p>
        </>
      ),
    },
  ];

  return (
    <SiteLayout title={t("termsOfService")}>
      <PageHero
        crumb={{ group: t("siteTrust"), title: t("termsOfService") }}
        eyebrow={t("termsOfService")}
        title={t("termsHeroTitle")}
      >
        <Prose>
          <p>{t("termsIntro")}</p>
        </Prose>
        <div className="mt-6 flex flex-wrap gap-2">
          <PolicyMeta icon={CalendarDays}>{t("termsEffectiveDate")}</PolicyMeta>
          <PolicyMeta icon={Scale}>{t("termsJurisdiction")}</PolicyMeta>
        </div>
      </PageHero>

      <SiteSection tone="cream">
        <Eyebrow>{t("atAGlance")}</Eyebrow>
        <SectionHeading>{t("termsGlanceTitle")}</SectionHeading>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IconCard icon={Handshake} title={t("termsGlanceEmployer")}>
            {t("termsAboutDesc")}
          </IconCard>
          <IconCard icon={Wallet} title={t("termsGlancePayments")}>
            {t("termsNoIntegratedPayment")}
          </IconCard>
          <IconCard icon={BadgeCheck} title={t("termsGlanceHonesty")}>
            {t("termsNoFalseClaims")}
          </IconCard>
        </div>
      </SiteSection>

      <SiteSection>
        <PolicySections sections={sections} />
      </SiteSection>

      <SiteSection id="contact" className="pt-0 sm:pt-0">
        <PolicyContact questionKey="termsContactQuestion" />
      </SiteSection>

      <ReadNext
        links={[
          { to: "/privacy", title: t("privacyPolicy"), teaser: t("privacyTeaser") },
          { to: "/safety", title: t("trustAndSafety"), teaser: t("safetyTeaser") },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
