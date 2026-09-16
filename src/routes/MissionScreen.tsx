import { Heart, Target } from "lucide-react";
import { CreedCallout, StaticPage, StaticSection } from "@/components/duleko/StaticPage";
import { useI18n } from "@/lib/i18n";

const PRINCIPLES_KEYS = [
  "missionPrinciple1",
  "missionPrinciple2",
  "missionPrinciple3",
  "missionPrinciple4",
  "missionPrinciple5",
] as const;

export function MissionScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("missionTitle")} subtitle={t("missionSubtitle")} icon={Target}>
      <CreedCallout statement={t("missionStatement")} description={t("missionStatementDesc")} />

      <StaticSection title={t("whatWereBuildingToward")}>
        <ul className="space-y-3">
          {PRINCIPLES_KEYS.map((key, index) => (
            <li
              key={key}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:px-3.5 sm:py-3"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-semibold text-brand-700">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">{t(key)}</span>
            </li>
          ))}
        </ul>
      </StaticSection>

      <StaticSection title={t("yourSkillsOurCommunity")} icon={Heart}>
        <p className="sm:leading-7">{t("yourSkillsOurCommunityDesc")}</p>
      </StaticSection>
    </StaticPage>
  );
}
