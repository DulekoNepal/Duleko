import { CheckCircle2, Mail, Users } from "lucide-react";
import { StaticIntro, StaticPage, StaticSection, TeamMemberCard } from "@/components/duleko/StaticPage";
import { useI18n } from "@/lib/i18n";
import sunilImage from "@/assets/sunil.jpg";
import dipendraImage from "@/assets/dipendra.jpg";
import sanjayImage from "@/assets/sanjay.png";

const HOW_IT_WORKS_KEYS = [
  "walkthroughBody1",
  "walkthroughBody2",
  "walkthroughBody3",
  "walkthroughBody4",
] as const;

export function AboutScreen() {
  const { t } = useI18n();
  return (
    <StaticPage title={t("aboutTitle")} subtitle={t("aboutSubtitle")} icon={Users}>
      <StaticIntro>{t("aboutDescription")}</StaticIntro>

      <StaticSection title={t("howItWorks")} icon={CheckCircle2}>
        <ul className="space-y-3">
          {HOW_IT_WORKS_KEYS.map((key) => (
            <li
              key={key}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:px-3.5 sm:py-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1">{t(key)}</span>
            </li>
          ))}
        </ul>
      </StaticSection>

      <section className="space-y-3 sm:space-y-4">
        <h2 className="px-0.5 text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          {t("meetTheTeam")}
        </h2>
        <div className="space-y-3 sm:space-y-4">
          <TeamMemberCard
            name={t("sunilName")}
            role={t("sunilRole")}
            university={t("sunilUniversity")}
            bio={t("sunilBio")}
            skills={[t("sunilSkill1"), t("sunilSkill2"), t("sunilSkill3")]}
            phone="+977 9819447220"
            profileUrl="https://duleko.com/worker/fc5757c4-cd73-4dc0-b3d6-441c4c1dad00"
            imageSrc={sunilImage}
          />

          <TeamMemberCard
            name={t("sanjayName")}
            role={t("sanjayRole")}
            location={t("sanjayLocation")}
            bio={t("sanjayBio")}
            skills={[t("sanjaySkill1"), t("sanjaySkill2"), t("sanjaySkill3")]}
            phone="+977 9766382090"
            profileUrl="https://duleko.com/worker/b7bc1f68-7f04-4eb4-addd-df5d71db8e98"
            imageSrc={sanjayImage}
          />

          <TeamMemberCard
            name={t("dipendraName")}
            role={t("dipendraRole")}
            location={t("dipendraLocation")}
            bio={t("dipendraBio")}
            skills={[t("dipendraSkill1"), t("dipendraSkill2"), t("dipendraSkill3")]}
            phone="+977 9867503930"
            profileUrl="https://duleko.com/worker"
            imageSrc={dipendraImage}
          />
        </div>
      </section>

      <StaticSection title={t("contactUs")} icon={Mail}>
        <p>
          {t("contactQuestion")}{" "}
          <a href="mailto:dulekonepal@gmail.com" className="font-medium text-brand-700 hover:underline">
            {t("contactEmail")}
          </a>
          .
        </p>
      </StaticSection>
    </StaticPage>
  );
}
