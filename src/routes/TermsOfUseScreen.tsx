import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { StaticPage, StaticSection } from "@/components/duleko/StaticPage";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-left font-medium text-slate-900 hover:text-brand-700 transition-colors"
      >
        {title}
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="mt-3 space-y-2 text-sm text-slate-700">{children}</div>}
    </div>
  );
}

export function TermsOfUseScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("termsTitle")} subtitle={`${t("termsEffectiveDate")} • ${t("termsJurisdiction")}`} icon={FileText}>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CollapsibleSection title={t("termsAboutTitle")} defaultOpen={true}>
          <p>{t("termsAboutDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsNotEmployer")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsCreatingAccountTitle")}>
          <p>{t("termsCreatingAccountDesc")}</p>
          <p className="mt-2 font-medium">{t("termsMustNot")}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("termsMustNotImpersonate")}</li>
            <li>{t("termsMustNotFraud")}</li>
            <li>{t("termsMustNotFalseInfo")}</li>
            <li>{t("termsMustNotFakeCerts")}</li>
            <li>{t("termsMustNotMisuseInfo")}</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsAccountResponsibility")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsSkillsTitle")}>
          <p>{t("termsSkillsDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsNotVerified")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsVerificationIndicator")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsNoFalseClaims")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsWorkArrangementsTitle")}>
          <p>{t("termsWorkArrangementsDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsUnlessStated")}</p>
          <p className="font-medium">{t("termsWorkAgreement")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsNoGuarantee")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsUseJudgment")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsRatesPaymentsTitle")}>
          <p>{t("termsRatesDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsNoIntegratedPayment")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsReviewsTitle")}>
          <p>{t("termsReviewsDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsReviewsGenuine")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsReviewsDistinction")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("termsSafetyTitle")}>
          <p className="text-xs text-slate-500 italic">{t("termsSafetyDesc")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsReportSuspicious")}</p>
          <p className="mt-2 text-xs text-slate-500 italic">{t("termsInvestigate")}</p>
        </CollapsibleSection>
      </div>
    </StaticPage>
  );
}
