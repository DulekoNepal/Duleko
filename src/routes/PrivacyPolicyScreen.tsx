import { Mail, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import { StaticIntro, StaticPage, StaticSection } from "@/components/duleko/StaticPage";
import { Card, CardBody } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { cn } from "@/lib/utils";

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors hover:text-brand-700 sm:py-4"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 text-sm font-medium text-slate-900 sm:text-[15px]">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        )}
      </button>
      {isOpen && (
        <div className={cn("space-y-2.5 pb-4 text-sm leading-relaxed text-slate-700 sm:pb-5 sm:leading-7")}>
          {children}
        </div>
      )}
    </div>
  );
}

export function PrivacyPolicyScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("privacyTitle")} subtitle={t("privacyLastUpdated")} icon={ShieldCheck}>
      <StaticIntro>{t("privacyIntro")}</StaticIntro>

      <Card>
        <CardBody className="p-4 sm:p-5">
          <CollapsibleSection title={t("privacyInfoCollectTitle")} defaultOpen={true}>
            <p>{t("privacyInfoCollectIntro")}</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{t("privacyAccountInfo")}</li>
              <li>{t("privacyProfileInfo")}</li>
              <li>{t("privacyWorkInfo")}</li>
              <li>{t("privacyVerificationInfo")}</li>
              <li>{t("privacyLocationInfo")}</li>
              <li>{t("privacyTechnicalInfo")}</li>
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:mt-3">{t("privacyNepalAct")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyWhyUseTitle")}>
            <p>{t("privacyWhyUseIntro")}</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{t("privacyUseCreateAccount")}</li>
              <li>{t("privacyUseShowWorkers")}</li>
              <li>{t("privacyUseConnect")}</li>
              <li>{t("privacyUseLocation")}</li>
              <li>{t("privacyUseVerify")}</li>
              <li>{t("privacyUseProcessRequests")}</li>
              <li>{t("privacyUseDisplayReviews")}</li>
              <li>{t("privacyUsePreventFraud")}</li>
              <li>{t("privacyUseImprove")}</li>
              <li>{t("privacyUseComply")}</li>
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:mt-3">{t("privacyNoFutureCollection")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyPublicProfileTitle")}>
            <p>{t("privacyPublicProfileIntro")}</p>
            <p className="font-medium text-slate-800">{t("privacyPublicProfileItems")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyPublicProfileNotice")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyPhoneTitle")}>
            <p>{t("privacyPhoneIntro")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyPhoneNotPublic")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyPhoneAccess")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyLocationTitle")}>
            <p className="font-medium text-brand-700">{t("privacyLocationImportant")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyLocationNotPublic")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyLocationPermission")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyLocationLiveSharing")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyCertificatesTitle")}>
            <p className="text-xs leading-relaxed text-slate-500">{t("privacyCertificatesNotPublic")}</p>
            <p className="mt-2">{t("privacyCertificatesDisplay")}</p>
            <p className="font-medium text-slate-800">{t("privacyVerified")}</p>
            <p className="font-medium text-slate-800">{t("privacyVerifiedBy")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyCertificatesCollect")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacySharingTitle")}>
            <p className="font-medium text-slate-800">{t("privacyNoSell")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacySharingConditions")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyMunicipality")}</p>
            <p className="mt-2">{t("privacyAggregated")}</p>
            <p className="whitespace-pre-line font-medium text-slate-800">{t("privacyAggregatedExample")}</p>
            <p className="text-xs leading-relaxed text-slate-500">{t("privacyNoIndividualDisclosure")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacySecurityTitle")}>
            <p>{t("privacySecurityDesc")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyNoAbsoluteSecurity")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyChoicesTitle")}>
            <p>{t("privacyChoicesIntro")}</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{t("privacyChoiceEdit")}</li>
              <li>{t("privacyChoiceVisibility")}</li>
              <li>{t("privacyChoiceStopLocation")}</li>
              <li>{t("privacyChoiceLogout")}</li>
              <li>{t("privacyChoiceDelete")}</li>
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyChoicesImplementation")}</p>
          </CollapsibleSection>

          <CollapsibleSection title={t("privacyChangesTitle")}>
            <p>{t("privacyChangesDesc")}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("privacyChangesNotice")}</p>
          </CollapsibleSection>
        </CardBody>
      </Card>

      <StaticSection title={t("contactUs")} icon={Mail}>
        <p>
          {t("privacyContactQuestion")}{" "}
          <a href="mailto:dulekonepal@gmail.com" className="font-medium text-brand-700 hover:underline">
            {t("contactEmail")}
          </a>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
