import { CalendarDays, Info, Lock, Mail, MapPin, Phone } from "lucide-react";
import {
  CONTACT_EMAIL,
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
import { useI18n, type StringKey } from "@/lib/i18n";

/** Section titles carry their number ("1. …" / "१. …"); the badge shows it instead. */
function stripNumber(title: string): string {
  return title.replace(/^[\d०-९]+\.\s*/, "");
}

function Bullets({ keys }: { keys: StringKey[] }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-2">
      {keys.map((key) => (
        <li key={key} className="flex gap-3">
          <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
          <span className="min-w-0 flex-1">{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-teal-800">{children}</p>;
}

export function PrivacyPage() {
  // The policy text is bilingual through i18n, like the rest of the in-app copy.
  const { t } = useI18n();

  const sections: { id: string; titleKey: StringKey; body: React.ReactNode }[] = [
    {
      id: "collect",
      titleKey: "privacyInfoCollectTitle",
      body: (
        <>
          <p>{t("privacyInfoCollectIntro")}</p>
          <Bullets
            keys={[
              "privacyAccountInfo",
              "privacyProfileInfo",
              "privacyWorkInfo",
              "privacyVerificationInfo",
              "privacyLocationInfo",
              "privacyTechnicalInfo",
            ]}
          />
          <Note>{t("privacyNepalAct")}</Note>
        </>
      ),
    },
    {
      id: "use",
      titleKey: "privacyWhyUseTitle",
      body: (
        <>
          <p>{t("privacyWhyUseIntro")}</p>
          <Bullets
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
          <Note>{t("privacyNoFutureCollection")}</Note>
        </>
      ),
    },
    {
      id: "public-profile",
      titleKey: "privacyPublicProfileTitle",
      body: (
        <>
          <p>{t("privacyPublicProfileIntro")}</p>
          <Strong>{t("privacyPublicProfileItems")}</Strong>
          <Note>{t("privacyPublicProfileNotice")}</Note>
        </>
      ),
    },
    {
      id: "phone",
      titleKey: "privacyPhoneTitle",
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
      titleKey: "privacyLocationTitle",
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
      titleKey: "privacyCertificatesTitle",
      body: (
        <>
          <p>{t("privacyCertificatesNotPublic")}</p>
          <p>{t("privacyCertificatesDisplay")}</p>
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
            <Strong>{t("privacyVerified")}</Strong>
            <p className="text-sm text-slate-600">{t("privacyVerifiedBy")}</p>
          </div>
          <Note>{t("privacyCertificatesCollect")}</Note>
        </>
      ),
    },
    {
      id: "sharing",
      titleKey: "privacySharingTitle",
      body: (
        <>
          <Strong>{t("privacyNoSell")}</Strong>
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
      titleKey: "privacySecurityTitle",
      body: (
        <>
          <p>{t("privacySecurityDesc")}</p>
          <Note>{t("privacyNoAbsoluteSecurity")}</Note>
        </>
      ),
    },
    {
      id: "choices",
      titleKey: "privacyChoicesTitle",
      body: (
        <>
          <p>{t("privacyChoicesIntro")}</p>
          <Bullets
            keys={[
              "privacyChoiceEdit",
              "privacyChoiceVisibility",
              "privacyChoiceStopLocation",
              "privacyChoiceLogout",
              "privacyChoiceDelete",
            ]}
          />
          <Note>{t("privacyChoicesImplementation")}</Note>
        </>
      ),
    },
    {
      id: "changes",
      titleKey: "privacyChangesTitle",
      body: (
        <>
          <p>{t("privacyChangesDesc")}</p>
          <Note>{t("privacyChangesNotice")}</Note>
        </>
      ),
    },
  ];

  return (
    <SiteLayout title="Privacy Policy">
      <PageHero crumb={{ group: "Trust", title: "Privacy Policy" }} eyebrow="Privacy Policy" title={t("privacyPolicy")}>
        <Prose>
          <p>{t("privacyIntro")}</p>
        </Prose>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays className="h-4 w-4 text-brand-600" aria-hidden />
          {t("privacyLastUpdated")}
        </p>
      </PageHero>

      <SiteSection tone="cream">
        <Eyebrow>At a glance</Eyebrow>
        <SectionHeading>Your information, handled with care</SectionHeading>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IconCard icon={Lock} title="Never sold">
            {t("privacyNoSell")}
          </IconCard>
          <IconCard icon={Phone} title="Your number stays private">
            {t("privacyPhoneNotPublic")}
          </IconCard>
          <IconCard icon={MapPin} title="Location on your terms">
            {t("privacyLocationNotPublic")}
          </IconCard>
        </div>
      </SiteSection>

      <SiteSection>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">On this page</p>
            <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
              {sections.map((section, i) => (
                <li key={section.id} className="shrink-0">
                  <a
                    href={`#${section.id}`}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-800 lg:whitespace-normal lg:rounded-lg lg:border-0 lg:px-2.5 lg:py-2 lg:hover:bg-brand-50"
                  >
                    <span className="text-xs font-semibold tabular-nums text-brand-600">{i + 1}</span>
                    {stripNumber(t(section.titleKey))}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="divide-y divide-slate-100">
            {sections.map((section, i) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24 py-8 first:pt-0 last:pb-0 sm:py-10"
              >
                <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-teal-800 sm:text-2xl">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold tabular-nums text-brand-700">
                    {i + 1}
                  </span>
                  {stripNumber(t(section.titleKey))}
                </h2>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600 sm:text-[17px] sm:leading-8">
                  {section.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </SiteSection>

      <SiteSection id="contact" className="pt-0 sm:pt-0">
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-teal-800">{t("contactUs")}</h2>
                <p className="mt-1.5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {t("privacyContactQuestion")}{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
                    {t("contactEmail")}
                  </a>
                  .
                </p>
              </div>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email us
            </a>
          </div>
        </div>
      </SiteSection>

      <ReadNext
        links={[
          { to: "/safety", title: "Trust & Safety", teaser: "Built for connection. Designed with safety in mind." },
          { to: "/terms", title: "Terms of Service", teaser: "The rules for using Duleko." },
        ]}
      />
      <FinalCta />
    </SiteLayout>
  );
}
