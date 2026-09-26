import { CalendarDays, Lock, MapPin, Phone } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
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

export function PrivacyPage() {
  const { t } = useI18n();

  const sections: PolicySection[] = [
    {
      id: "collect",
      title: t("privacyInfoCollectTitle"),
      body: (
        <>
          <p>{t("privacyInfoCollectIntro")}</p>
          <PolicyBullets
            keys={[
              "privacyAccountInfo",
              "privacyProfileInfo",
              "privacyWorkInfo",
              "privacyVerificationInfo",
              "privacyLocationInfo",
              "privacyTechnicalInfo",
            ]}
          />
          <PolicyNote>{t("privacyNepalAct")}</PolicyNote>
        </>
      ),
    },
    {
      id: "use",
      title: t("privacyWhyUseTitle"),
      body: (
        <>
          <p>{t("privacyWhyUseIntro")}</p>
          <PolicyBullets
            keys={[
              "privacyUseCreateAccount",
              "privacyUseShowWorkers",
              "privacyUseConnect",
              "privacyUseLocation",
              "privacyUseVerify",
              "privacyUseProcessRequests",
              "privacyUseDisplayReviews",
              "privacyUsePreventFraud",
              "privacyUseImprove",
              "privacyUseComply",
            ]}
          />
          <PolicyNote>{t("privacyNoFutureCollection")}</PolicyNote>
        </>
      ),
    },
    {
      id: "public-profile",
      title: t("privacyPublicProfileTitle"),
      body: (
        <>
          <p>{t("privacyPublicProfileIntro")}</p>
          <PolicyStrong>{t("privacyPublicProfileItems")}</PolicyStrong>
          <PolicyNote>{t("privacyPublicProfileNotice")}</PolicyNote>
        </>
      ),
    },
    {
      id: "phone",
      title: t("privacyPhoneTitle"),
      body: (
        <>
          <p>{t("privacyPhoneIntro")}</p>
          <p>{t("privacyPhoneNotPublic")}</p>
          <p>{t("privacyPhoneAccess")}</p>
        </>
      ),
    },
    {
      id: "location",
      title: t("privacyLocationTitle"),
      body: (
        <>
          <p className="font-semibold text-brand-700">{t("privacyLocationImportant")}</p>
          <p>{t("privacyLocationNotPublic")}</p>
          <p>{t("privacyLocationPermission")}</p>
          <p>{t("privacyLocationLiveSharing")}</p>
        </>
      ),
    },
    {
      id: "certificates",
      title: t("privacyCertificatesTitle"),
      body: (
        <>
          <p>{t("privacyCertificatesNotPublic")}</p>
          <p>{t("privacyCertificatesDisplay")}</p>
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
            <PolicyStrong>{t("privacyVerified")}</PolicyStrong>
            <p className="text-sm text-slate-600">{t("privacyVerifiedBy")}</p>
          </div>
          <PolicyNote>{t("privacyCertificatesCollect")}</PolicyNote>
        </>
      ),
    },
    {
      id: "sharing",
      title: t("privacySharingTitle"),
      body: (
        <>
          <PolicyStrong>{t("privacyNoSell")}</PolicyStrong>
          <p>{t("privacySharingConditions")}</p>
          <p>{t("privacyMunicipality")}</p>
          <p>{t("privacyAggregated")}</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {t("privacyAggregatedExample")
              .split("\n")
              .map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-teal-800 shadow-sm"
                >
                  {line}
                </li>
              ))}
          </ul>
          <p>{t("privacyNoIndividualDisclosure")}</p>
        </>
      ),
    },
    {
      id: "security",
      title: t("privacySecurityTitle"),
      body: (
        <>
          <p>{t("privacySecurityDesc")}</p>
          <PolicyNote>{t("privacyNoAbsoluteSecurity")}</PolicyNote>
        </>
      ),
    },
    {
      id: "choices",
      title: t("privacyChoicesTitle"),
      body: (
        <>
          <p>{t("privacyChoicesIntro")}</p>
          <PolicyBullets
            keys={[
              "privacyChoiceEdit",
              "privacyChoiceVisibility",
              "privacyChoiceStopLocation",
              "privacyChoiceLogout",
              "privacyChoiceDelete",
            ]}
          />
          <PolicyNote>{t("privacyChoicesImplementation")}</PolicyNote>
        </>
      ),
    },
    {
      id: "changes",
      title: t("privacyChangesTitle"),
      body: (
        <>
          <p>{t("privacyChangesDesc")}</p>
          <PolicyNote>{t("privacyChangesNotice")}</PolicyNote>
        </>
      ),
    },
  ];

  return (
    <SiteLayout title={t("privacyPolicy")}>
      <PageHero
        crumb={{ group: t("siteTrust"), title: t("privacyPolicy") }}
        eyebrow={t("privacyPolicy")}
        title={t("privacyPolicy")}
      >
        <Prose>
          <p>{t("privacyIntro")}</p>
        </Prose>
        <div className="mt-6">
          <PolicyMeta icon={CalendarDays}>{t("privacyLastUpdated")}</PolicyMeta>
        </div>
      </PageHero>

      <SiteSection tone="cream">
        <Eyebrow>{t("atAGlance")}</Eyebrow>
        <SectionHeading>{t("privacyGlanceTitle")}</SectionHeading>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IconCard icon={Lock} title={t("privacyGlanceNeverSold")}>
            {t("privacyNoSell")}
          </IconCard>
          <IconCard icon={Phone} title={t("privacyGlancePhone")}>
            {t("privacyPhoneNotPublic")}
          </IconCard>
          <IconCard icon={MapPin} title={t("privacyGlanceLocation")}>
            {t("privacyLocationNotPublic")}
          </IconCard>
        </div>
      </SiteSection>

      <SiteSection>
        <PolicySections sections={sections} />
      </SiteSection>

      <SiteSection id="contact" className="pt-0 sm:pt-0">
        <PolicyContact questionKey="privacyContactQuestion" />
      </SiteSection>

      <ReadNext
        links={[
          { to: "/safety", title: t("trustAndSafety"), teaser: t("safetyTeaser") },
          { to: "/terms", title: t("termsOfService"), teaser: t("termsTeaser") },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
