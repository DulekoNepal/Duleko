import { CheckCircle2, ClipboardList, Flag, Lock, MapPin, Phone, ShieldAlert, ShieldCheck, Smartphone, Star, UserCheck } from "lucide-react";
import {
  FinalCta,
  IconCard,
  Lead,
  PageHero,
  SectionIntro,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  reveal,
  siteCard,
} from "@/components/duleko/Site";
import { mailto } from "@/components/duleko/site/actions";
import { RidgeLines } from "@/components/duleko/site/ui";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

const FEATURES: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Smartphone, titleKey: "safetyPhone", bodyKey: "safetyPhoneBody" },
  { icon: UserCheck, titleKey: "safetyAge", bodyKey: "safetyAgeBody" },
  { icon: ClipboardList, titleKey: "safetyRequests", bodyKey: "safetyRequestsBody" },
  { icon: Star, titleKey: "safetyReviews", bodyKey: "safetyReviewsBody" },
  { icon: ShieldAlert, titleKey: "safetyReport", bodyKey: "safetyReportBody" },
  { icon: Lock, titleKey: "safetyPrivacy", bodyKey: "safetyPrivacyBody" },
];

const COMMITMENTS: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Lock, titleKey: "privacyGlanceNeverSold", bodyKey: "privacyNoSell" },
  { icon: Phone, titleKey: "privacyGlancePhone", bodyKey: "privacyPhoneNotPublic" },
  { icon: MapPin, titleKey: "privacyGlanceLocation", bodyKey: "privacyLocationNotPublic" },
];

const GUIDE: { titleKey: StringKey; items: StringKey[] }[] = [
  { titleKey: "guideBefore", items: ["guideBefore1", "guideBefore2", "guideBefore3"] },
  { titleKey: "guideDuring", items: ["guideDuring1", "guideDuring2", "guideDuring3"] },
  { titleKey: "guideAfter", items: ["guideAfter1", "guideAfter2", "guideAfter3"] },
];

export function SafetyPage() {
  const { t, lang } = useI18n();
  return (
    <SiteLayout title={t("trustAndSafety")}>
      <PageHero
        story="safety"
        eyebrow={t("trustAndSafety")}
        title={t("safetyTeaser")}
        aside={
          <div className="band relative overflow-hidden rounded-3xl bg-teal-800 p-6 text-white shadow-[0_40px_80px_-40px_rgb(12_60_72/0.6)] sm:p-7">
            <RidgeLines className="text-white/[0.07]" seed={8} lines={9} />
            <div className="relative flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-300 ring-1 ring-white/15">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <p className="font-display text-xl font-semibold">{t("safetyCommitments")}</p>
            </div>
            <ul className="relative mt-5 space-y-4">
              {COMMITMENTS.map(({ icon: Icon, titleKey, bodyKey }) => (
                <li key={titleKey} className="flex gap-3 border-t border-white/10 pt-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" aria-hidden />
                  <div>
                    <p className="font-semibold">{t(titleKey)}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/70">{t(bodyKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <Lead>
          <p>{t("safetyBody")}</p>
        </Lead>
      </PageHero>

      {/* What's built in */}
      <SiteSection>
        <SectionIntro eyebrow={t("trustAndSafety")} title={t("safetyFeaturesTitle")} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, titleKey, bodyKey }, i) => (
            <li key={titleKey} {...reveal(i * 60)}>
              <IconCard icon={icon} index={i + 1} title={t(titleKey)}>
                {t(bodyKey)}
              </IconCard>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* Before, during, after */}
      <SiteSection tone="paper">
        <SectionIntro eyebrow={t("guideEyebrow")} title={t("guideTitle")} />
        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {GUIDE.map(({ titleKey, items }, i) => (
            <li key={titleKey} className={cn(siteCard, "p-6 sm:p-7")} {...reveal(i * 80)}>
              <p className="flex items-center gap-3">
                <span className="font-display inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-800 text-sm font-semibold text-white">
                  {formatNumber(i + 1, lang)}
                </span>
                <span className="font-display text-2xl font-semibold text-teal-800">{t(titleKey)}</span>
              </p>
              <ul className="mt-5 space-y-3.5">
                {items.map((key) => (
                  <li key={key} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    <span className="min-w-0 flex-1">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </SiteSection>

      {/* Report */}
      <SiteSection>
        <div className="grid gap-6 rounded-3xl border border-accent-500/30 bg-accent-50 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-[0_10px_24px_-10px_rgb(249_115_22/0.8)]">
            <Flag className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">{t("safetyReportTitle")}</h2>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-slate-700 sm:text-base">{t("safetyReportText")}</p>
          </div>
          <a
            href={mailto("Report an issue")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-accent-500 dark:hover:bg-accent-600"
          >
            <Flag className="h-4 w-4" aria-hidden />
            {t("footerReportIssue")}
          </a>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <StoryLink to="/privacy">{t("privacyPolicy")}</StoryLink>
          <StoryLink to="/terms">{t("termsOfService")}</StoryLink>
          <StoryLink to="/registration-policy">{t("registrationPolicyShort")}</StoryLink>
        </div>
      </SiteSection>

      <StoryNav current="safety" />
      <FinalCta />
    </SiteLayout>
  );
}
