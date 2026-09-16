import { Lightbulb, Quote, Sparkles } from "lucide-react";
import { StaticIntro, StaticPage, StaticSection } from "@/components/duleko/StaticPage";
import { useI18n } from "@/lib/i18n";

function FounderQuote({ name, role, quote }: { name: string; role: string; quote: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5">
      <Quote className="mb-2.5 h-5 w-5 text-brand-400" aria-hidden />
      <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px] sm:leading-7">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="mt-3 text-xs font-medium text-slate-500 sm:mt-4">
        <span className="text-slate-700">{name}</span>
        <span className="mx-1.5 text-slate-300" aria-hidden>
          ·
        </span>
        <span>{role}</span>
      </p>
    </div>
  );
}

export function MotivationScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("motivationTitle")} subtitle={t("motivationSubtitle")} icon={Lightbulb}>
      <StaticIntro>{t("motivationIntro")}</StaticIntro>

      <StaticSection title={t("straightFromTheTeam")} icon={Quote}>
        <div className="space-y-3 sm:space-y-4">
          <FounderQuote name={t("sunilName")} role={t("sunilRole")} quote={t("sunilQuote")} />
          <FounderQuote name={t("sanjayName")} role={t("sanjayRole")} quote={t("sanjayQuote")} />
          <FounderQuote name={t("dipendraName")} role={t("dipendraRole")} quote={t("dipendraQuote")} />
        </div>
      </StaticSection>

      <StaticSection title={t("whatKeepsUsBuilding")} icon={Sparkles}>
        <p className="sm:leading-7">{t("whatKeepsUsBuildingDesc")}</p>
      </StaticSection>
    </StaticPage>
  );
}
