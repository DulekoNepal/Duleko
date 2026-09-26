import { CalendarDays, CheckCircle2 } from "lucide-react";
import { FinalCta, PageHero, Prose, ReadNext, SiteLayout, SiteSection, StoryLink } from "@/components/duleko/Site";
import { PolicyMeta, PolicySections, type PolicySection } from "@/components/duleko/site/policy";
import { useI18n, type StringKey } from "@/lib/i18n";

const RULES: { id: string; key: StringKey }[] = [
  { id: "genuine", key: "regPolicyGenuineInfo" },
  { id: "phone", key: "regPolicyPhoneVerification" },
  { id: "responsible", key: "regPolicyResponsibleUse" },
  { id: "skills", key: "regPolicyTruthfulSkills" },
  { id: "respect", key: "regPolicyRespectOthers" },
  { id: "personal-info", key: "regPolicyProtectInfo" },
  { id: "work-payment", key: "regPolicyWorkPayment" },
  { id: "safety", key: "regPolicySafetyFirst" },
  { id: "account-action", key: "regPolicyAccountAction" },
];

/** Each rule opens with a one-sentence heading ("Provide genuine information."), then the detail. */
function splitRule(text: string): { title: string; body: string } {
  const match = text.match(/^(.+?[.।])\s+([\s\S]*)$/);
  return match ? { title: match[1].replace(/[.।]$/, ""), body: match[2] } : { title: text, body: "" };
}

export function RegistrationPolicyPage() {
  const { t } = useI18n();

  const sections: PolicySection[] = RULES.map(({ id, key }) => {
    const { title, body } = splitRule(t(key));
    return { id, title, body: <p>{body}</p> };
  });

  return (
    <SiteLayout title={t("registrationPolicyShort")}>
      <PageHero
        crumb={{ group: t("siteTrust"), title: t("registrationPolicyShort") }}
        eyebrow={t("registrationPolicyShort")}
        title={t("registrationPolicyTitle")}
      >
        <Prose>
          <p>{t("registrationPolicyIntro")}</p>
        </Prose>
        <div className="mt-6">
          <PolicyMeta icon={CalendarDays}>{t("registrationPolicyLastUpdated")}</PolicyMeta>
        </div>
      </PageHero>

      <SiteSection>
        <PolicySections sections={sections} />
      </SiteSection>

      <SiteSection className="pt-0 sm:pt-0">
        <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-teal-800">{t("registrationAgreement")}</h2>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">{t("registrationAgreementIntro")}</p>
          <p className="mt-4 flex gap-3 rounded-2xl bg-white p-4 text-base font-medium leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
            <span className="min-w-0 flex-1">{t("registrationAgreePolicies")}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            <StoryLink to="/terms">{t("termsOfService")}</StoryLink>
            <StoryLink to="/privacy">{t("privacyPolicy")}</StoryLink>
          </div>
        </div>
      </SiteSection>

      <ReadNext
        links={[
          { to: "/safety", title: t("trustAndSafety"), teaser: t("safetyTeaser") },
          { to: "/about", title: t("navAboutDuleko"), teaser: t("aboutTeaser") },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
