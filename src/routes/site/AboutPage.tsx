import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Code2,
  Layers,
  MapPin,
  Map as MapIcon,
  MessagesSquare,
  Search,
  Send,
  Smartphone,
  Sprout,
  Users,
} from "lucide-react";
import {
  FinalCta,
  IconBadge,
  Lead,
  PageHero,
  SectionIntro,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
  reveal,
  siteCard,
  siteCardHover,
} from "@/components/duleko/Site";
import { PolicyContact } from "@/components/duleko/site/policy";
import { TEAM, type Member } from "@/components/duleko/site/team";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const WHAT_IT_DOES: { icon: React.ComponentType<{ className?: string }>; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: Search, titleKey: "walkthroughTitle1", bodyKey: "walkthroughBody1" },
  { icon: Send, titleKey: "walkthroughTitle2", bodyKey: "walkthroughBody2" },
  { icon: Users, titleKey: "walkthroughTitle3", bodyKey: "walkthroughBody3" },
  { icon: CalendarDays, titleKey: "walkthroughTitle4", bodyKey: "walkthroughBody4" },
];

/**
 * How Duleko got here, from the project's own history (git log, migrations):
 * first commit 4 Sep 2026; chat, friends and bidding 6 Sep; Android 11 Sep;
 * the website 26-27 Sep; dark mode, notice board, Membership IDs and phone
 * alerts 2-3 Oct; job board and map 11 Oct, ID checks 13 Oct. "Now" is the
 * work in progress.
 */
const TIMELINE: {
  icon: React.ComponentType<{ className?: string }>;
  dateKey: StringKey;
  titleKey: StringKey;
  bodyKey: StringKey;
  upcoming?: boolean;
}[] = [
  { icon: Sprout, dateKey: "timelineSep", titleKey: "timeline1Title", bodyKey: "timeline1Body" },
  { icon: MessagesSquare, dateKey: "timelineSep", titleKey: "timeline2Title", bodyKey: "timeline2Body" },
  { icon: Smartphone, dateKey: "timelineSep", titleKey: "timeline3Title", bodyKey: "timeline3Body" },
  { icon: BadgeCheck, dateKey: "timelineOct", titleKey: "timeline4Title", bodyKey: "timeline4Body" },
  { icon: MapIcon, dateKey: "timelineOct", titleKey: "timeline5Title", bodyKey: "timeline5Body" },
  { icon: Layers, dateKey: "timelineNow", titleKey: "timeline6Title", bodyKey: "timeline6Body", upcoming: true },
];

/** A team member as a portrait card - the whole card opens their page. */
export function TeamCard({ member }: { member: Member }) {
  const { t } = useI18n();
  const AffiliationIcon = member.affiliationIcon;
  const name = t(member.nameKey);
  return (
    <Link
      to="/about/$slug"
      params={{ slug: member.slug }}
      id={member.id}
      className={cn(siteCard, siteCardHover, "group flex h-full scroll-mt-28 flex-col overflow-hidden")}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-teal-800 sm:aspect-[4/4.4]">
        <img
          src={member.image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />
        <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm backdrop-blur">
          {t(member.roleKey)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">{name}</h3>
        <p className="mt-1.5 inline-flex items-start gap-1.5 text-sm text-slate-500">
          <AffiliationIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          {t(member.affiliationKey)}
        </p>
        <p className="font-quote mt-4 flex-1 text-lg italic leading-snug text-teal-800">“{t(member.quoteKey)}”</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          {t("founderFullProfile", { name: name.split(" ")[0] })}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function AboutPage() {
  const { t } = useI18n();

  const facts: { icon: React.ComponentType<{ className?: string }>; labelKey: StringKey; value: string }[] = [
    { icon: MapPin, labelKey: "aboutFactFounded", value: t("sunilLocation") },
    { icon: Users, labelKey: "aboutFactTeam", value: t("aboutFactTeamValue") },
    { icon: Code2, labelKey: "aboutFactStarted", value: t("aboutFactStartedValue") },
    { icon: Smartphone, labelKey: "aboutFactOn", value: t("heroTrustApp") },
  ];

  return (
    <SiteLayout title={t("navAboutDuleko")}>
      <PageHero
        story="about"
        eyebrow={t("navAboutDuleko")}
        title={t("aboutHeroTitle")}
        aside={
          <dl className={cn(siteCard, "divide-y divide-slate-100 p-2 shadow-[0_40px_80px_-40px_rgb(12_60_72/0.45)]")}>
            {facts.map(({ icon: Icon, labelKey, value }) => (
              <div key={labelKey} className="flex items-center gap-4 px-4 py-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="text-sm text-slate-500">{t(labelKey)}</dt>
                  <dd className="font-display text-lg font-semibold text-slate-900">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        }
      >
        <Lead>
          <p>{t("aboutHeroP1")}</p>
          <p className="font-semibold text-slate-900">{t("aboutHeroP2")}</p>
        </Lead>
        <p className="font-display mt-6 text-xl font-semibold text-brand-700 sm:text-2xl">{t("siteTagline")}</p>
      </PageHero>

      {/* What Duleko is */}
      <SiteSection>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionIntro eyebrow={t("howItWorks")} title={t("aboutWhatTitle")}>
              <p>{t("aboutDescription")}</p>
            </SectionIntro>
            <StoryLink to="/mission" className="mt-5">
              {t("readOurMission")}
            </StoryLink>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WHAT_IT_DOES.map(({ icon, titleKey, bodyKey }, i) => (
              <li key={titleKey} className={cn(siteCard, "p-5")} {...reveal(i * 60)}>
                <IconBadge icon={icon} />
                <p className="font-display mt-4 text-lg font-semibold leading-snug text-slate-900">{t(titleKey)}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{t(bodyKey)}</p>
              </li>
            ))}
          </ul>
        </div>
      </SiteSection>

      {/* The story so far */}
      <SiteSection tone="paper">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionIntro eyebrow={t("timelineEyebrow")} title={t("timelineTitle")}>
              <p>{t("timelineIntro")}</p>
            </SectionIntro>
          </div>
          <ol>
            {TIMELINE.map(({ icon: Icon, dateKey, titleKey, bodyKey, upcoming }, i) => {
              const last = i === TIMELINE.length - 1;
              return (
                <li key={titleKey} className="flex gap-4 sm:gap-5" {...reveal(i * 40)}>
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                        upcoming
                          ? "border-2 border-dashed border-accent-500 bg-accent-50 text-accent-600"
                          : "bg-surface text-brand-700 ring-2 ring-brand-200",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    {!last && <span className="my-1 w-px flex-1 bg-brand-200" aria-hidden />}
                  </div>
                  <div className={cn("min-w-0 flex-1", !last && "pb-8")}>
                    <p className="flex items-center gap-2 pt-2.5">
                      <span className="font-display text-sm font-semibold text-accent-600">{t(dateKey)}</span>
                      {upcoming && (
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-600 ring-1 ring-accent-500/30">
                          {t("timelineInProgress")}
                        </span>
                      )}
                    </p>
                    <h3 className="font-display mt-1 text-xl font-semibold text-slate-900">{t(titleKey)}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-600 sm:text-base">{t(bodyKey)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </SiteSection>

      {/* The team */}
      <SiteSection id="team">
        <SectionIntro eyebrow={t("navOurTeam")} title={t("aboutTeamTitle")}>
          <p>{t("aboutFoundedBy")}</p>
        </SectionIntro>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {TEAM.map((member, i) => (
            <li key={member.id} {...reveal(i * 80)}>
              <TeamCard member={member} />
            </li>
          ))}
        </ul>
        <StoryLink to="/motivation" className="mt-8">
          {t("motivationTitle")}
        </StoryLink>
      </SiteSection>

      <SiteSection id="contact" className="pt-0 sm:pt-0 lg:pt-0">
        <PolicyContact questionKey="contactQuestion" />
      </SiteSection>

      <StoryNav current="about" />
      <FinalCta />
    </SiteLayout>
  );
}
