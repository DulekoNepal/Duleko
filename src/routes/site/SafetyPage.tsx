import { ClipboardList, Lock, ShieldAlert, Smartphone, Star } from "lucide-react";
import {
  FinalCta,
  IconCard,
  PageHero,
  Prose,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";
import { useI18n, type StringKey } from "@/lib/i18n";

const FEATURES: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Smartphone, titleKey: "safetyPhone", bodyKey: "safetyPhoneBody" },
  { icon: ClipboardList, titleKey: "safetyRequests", bodyKey: "safetyRequestsBody" },
  { icon: Star, titleKey: "safetyReviews", bodyKey: "safetyReviewsBody" },
  { icon: ShieldAlert, titleKey: "safetyReport", bodyKey: "safetyReportBody" },
  { icon: Lock, titleKey: "safetyPrivacy", bodyKey: "safetyPrivacyBody" },
];

export function SafetyPage() {
  const { t } = useI18n();
  return (
    <SiteLayout title={t("trustAndSafety")}>
      <PageHero story="safety" eyebrow={t("trustAndSafety")} title={t("safetyTeaser")}>
        <Prose>
          <p>{t("safetyBody")}</p>
        </Prose>
      </PageHero>

      <SiteSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, titleKey, bodyKey }) => (
            <IconCard key={titleKey} icon={icon} title={t(titleKey)}>
              {t(bodyKey)}
            </IconCard>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
          <StoryLink to="/privacy">{t("privacyPolicy")}</StoryLink>
          <StoryLink to="/terms">{t("termsOfService")}</StoryLink>
        </div>
      </SiteSection>

      <StoryNav current="safety" />
      <FinalCta />
    </SiteLayout>
  );
}
