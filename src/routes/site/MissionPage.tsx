import { Check, Globe2, Languages, MapPinned, Minus, Sparkles, Wallet, Wifi } from "lucide-react";
import {
  ChipList,
  Eyebrow,
  FinalCta,
  IconCard,
  Journey,
  Lead,
  PageHero,
  Prose,
  PullQuote,
  SectionHeading,
  SectionIntro,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  reveal,
  siteCard,
} from "@/components/duleko/Site";
import { teamMember } from "@/components/duleko/site/team";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

const SHOP_COSTS: StringKey[] = ["shopRent", "shopLocation", "shopEquipment", "shopBills", "shopMarketing"];
const PROFILE_NEEDS: StringKey[] = ["profileNeedSkill", "profileNeedPhone", "profileNeedFree", "profileNeedNearby"];

const PEOPLE: StringKey[] = [
  "peopleStudents",
  "peopleProfessionals",
  "peopleTrained",
  "peopleFarmers",
  "peopleTrades",
  "peopleOwners",
  "peopleExperience",
];

const PRINCIPLES: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Sparkles, titleKey: "principleAnySkill", bodyKey: "missionPrinciple1" },
  { icon: MapPinned, titleKey: "principleNearest", bodyKey: "missionPrinciple2" },
  { icon: Wallet, titleKey: "principleFree", bodyKey: "principleFreeBody" },
  { icon: Languages, titleKey: "principleBilingual", bodyKey: "missionPrinciple4" },
  { icon: Wifi, titleKey: "principleRealPhones", bodyKey: "missionPrinciple5" },
];

export function MissionPage() {
  const { t, lang } = useI18n();
  const sanjay = teamMember("sanjay");
  const stages: StringKey[] = ["stageSkill", "stageVisibility", "stageOpportunity", "stageIncome"];

  return (
    <SiteLayout title={t("ourMission")}>
      <PageHero
        story="mission"
        eyebrow={t("ourMission")}
        title={t("missionTeaser")}
        aside={
          <div className={cn(siteCard, "relative p-6 sm:p-7")}>
            <p className="eyebrow-track text-xs font-bold uppercase text-slate-400">{t("missionWhatWeDo")}</p>
            <ol className="mt-5 space-y-0">
              {stages.map((key, i) => {
                const last = i === stages.length - 1;
                return (
                  <li key={key} className="relative flex items-center gap-4 pb-5 last:pb-0">
                    {!last && <span className="absolute bottom-0 left-[19px] top-10 w-px bg-brand-200" aria-hidden />}
                    <span
                      className={cn(
                        "font-display inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        last ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
                      )}
                    >
                      {formatNumber(i + 1, lang)}
                    </span>
                    <span className={cn("font-display text-xl font-semibold", last ? "text-brand-700" : "text-slate-900")}>
                      {t(key)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        }
      >
        <Lead>
          <p>{t("missionHeroBody")}</p>
        </Lead>
      </PageHero>

      {/* The real barrier: the cost of being seen */}
      <SiteSection>
        <SectionIntro eyebrow={t("missionBarrierEyebrow")} title={t("missionBarrierTitle")}>
          <p>{t("missionShopCosts")}</p>
        </SectionIntro>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-paper p-6 sm:p-7">
            <p className="eyebrow-track text-xs font-bold uppercase text-slate-400">{t("shopNeedsTitle")}</p>
            <ul className="mt-5 space-y-3.5">
              {SHOP_COSTS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-slate-400">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70">
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-lg line-through decoration-slate-300">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-surface p-6 sm:p-7">
            <p className="eyebrow-track text-xs font-bold uppercase text-brand-700">{t("profileNeedsTitle")}</p>
            <ul className="mt-5 space-y-3.5">
              {PROFILE_NEEDS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-slate-900">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-lg font-medium">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="text-lg text-slate-500">{t("missionDifferent")}</p>
            <p className="font-display mt-3 text-balance text-3xl font-semibold leading-[1.1] text-teal-800 sm:text-4xl">
              {t("missionWhatIf")}
            </p>
          </div>
          <Prose className="lg:pt-2">
            <p>{t("missionVirtualSpace")}</p>
          </Prose>
        </div>
      </SiteSection>

      {/* What we do */}
      <SiteSection tone="paper">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <div>
            <SectionIntro eyebrow={t("missionWhatWeDo")} title={t("missionDiscoverableTitle")} />
            <Prose className="mt-5">
              <p>{t("missionSkillsEverywhere")}</p>
            </Prose>
          </div>
          <div className={cn(siteCard, "p-6 sm:p-7")}>
            <Globe2 className="h-6 w-6 text-brand-700" aria-hidden />
            <ChipList className="mt-4" items={PEOPLE.map((key) => t(key))} />
            <p className="font-display mt-6 border-t border-slate-100 pt-5 text-xl font-semibold leading-snug text-teal-800">
              {t("missionOurMissionIs")}
            </p>
          </div>
        </div>
      </SiteSection>

      {/* Beyond the certificate */}
      <SiteSection>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionIntro eyebrow={t("missionBeyondCert")} title={t("missionTrainingTitle")} />
            <Prose className="mt-5">
              <p>{t("missionTrainingP1")}</p>
              <p className="font-semibold text-slate-900">{t("missionTrainingP2")}</p>
              <p>{t("missionTrainingP3")}</p>
            </Prose>
            <StoryLink to="/partners" className="mt-5">
              {t("partnersTitle")}
            </StoryLink>
          </div>
          <div className="lg:pt-4">
            <PullQuote quote={t("missionQuote")} name={t("teamAttribution")} size="md" />
          </div>
        </div>

        <div className="mt-14 rounded-3xl bg-paper p-6 ring-1 ring-slate-200/70 sm:p-8 lg:p-10" {...reveal()}>
          <Journey
            steps={(
              ["stageTraining", "stageProfile", "stageDiscovery", "stageWork", "stageReputation", "stageOpportunity"] as const
            ).map((key) => ({ title: t(key) }))}
          />
        </div>
      </SiteSection>

      {/* How we build */}
      <SiteSection tone="paper">
        <SectionIntro eyebrow={t("principlesEyebrow")} title={t("principlesTitle")} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon, titleKey, bodyKey }, i) => (
            <li key={titleKey} {...reveal(i * 60)}>
              <IconCard icon={icon} index={i + 1} title={t(titleKey)}>
                {t(bodyKey)}
              </IconCard>
            </li>
          ))}
          <li className="sm:col-span-2 lg:col-span-1" {...reveal(300)}>
            <div className="band flex h-full flex-col justify-between rounded-2xl bg-teal-800 p-6 text-white">
              <PullQuote
                tone="light"
                size="md"
                quote={t("missionStatement")}
                name={t(sanjay.nameKey)}
                role={t(sanjay.roleKey)}
                image={sanjay.image}
                to={{ slug: sanjay.slug }}
              />
            </div>
          </li>
        </ul>
        <Prose className="mt-10 max-w-3xl">
          <p>{t("missionStatementDesc")}</p>
        </Prose>
      </SiteSection>

      {/* Vision */}
      <SiteSection tone="ink">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow tone="light" className="justify-center">
            {t("missionVisionEyebrow")}
          </Eyebrow>
          <SectionHeading tone="light" className="font-quote mt-2 font-normal italic leading-[1.2] lg:text-5xl">
            {t("missionVision")}
          </SectionHeading>
        </div>
      </SiteSection>

      <StoryNav current="mission" />
      <FinalCta />
    </SiteLayout>
  );
}
