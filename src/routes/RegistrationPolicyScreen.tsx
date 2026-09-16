import { ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
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

export function RegistrationPolicyScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("registrationPolicyTitle")} subtitle={t("registrationPolicyLastUpdated")} icon={ShieldCheck}>
      <p className="text-sm leading-relaxed text-slate-700">
        {t("registrationPolicyIntro")}
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <CollapsibleSection title={t("regPolicyGenuineInfo").split(".")[0] + "."} defaultOpen={true}>
          <p>{t("regPolicyGenuineInfo")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyPhoneVerification").split(".")[0] + "."}>
          <p>{t("regPolicyPhoneVerification")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyResponsibleUse").split(".")[0] + "."}>
          <p>{t("regPolicyResponsibleUse")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyTruthfulSkills").split(".")[0] + "."}>
          <p>{t("regPolicyTruthfulSkills")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyRespectOthers").split(".")[0] + "."}>
          <p>{t("regPolicyRespectOthers")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyProtectInfo").split(".")[0] + "."}>
          <p>{t("regPolicyProtectInfo")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyWorkPayment").split(".")[0] + "."}>
          <p>{t("regPolicyWorkPayment")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicySafetyFirst").split(".")[0] + "."}>
          <p>{t("regPolicySafetyFirst")}</p>
        </CollapsibleSection>

        <CollapsibleSection title={t("regPolicyAccountAction").split(".")[0] + "."}>
          <p>{t("regPolicyAccountAction")}</p>
        </CollapsibleSection>
      </div>

      <StaticSection title={t("registrationAgreement")}>
        <p className="text-sm text-slate-700">{t("registrationAgreementIntro")}</p>
        <div className="mt-3 flex items-start gap-2">
          <input type="checkbox" id="agree-policies" className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          <label htmlFor="agree-policies" className="text-sm text-slate-700">
            {t("registrationAgreePolicies")}
          </label>
        </div>
      </StaticSection>
    </StaticPage>
  );
}
