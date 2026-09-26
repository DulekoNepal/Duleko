import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Globe,
  GraduationCap,
  Mail,
  Phone,
  Quote,
  UserRound,
} from "lucide-react";
import {
  CONTACT_EMAIL,
  Eyebrow,
  FinalCta,
  PageHero,
  Prose,
  SectionHeading,
  SiteLayout,
  SiteSection,
  StoryLink,
  StoryNav,
} from "@/components/duleko/Site";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import sunilImage from "@/assets/sunil.jpg";
import sanjayImage from "@/assets/sanjay.png";
import dipendraImage from "@/assets/dipendra.jpg";

const HOW_IT_WORKS_KEYS = [
  "walkthroughBody1",
  "walkthroughBody2",
  "walkthroughBody3",
  "walkthroughBody4",
] as const;

interface Member {
  id: string;
  nameKey: StringKey;
  roleKey: StringKey;
  affiliationKey: StringKey;
  affiliationIcon: React.ComponentType<{ className?: string }>;
  quoteKey: StringKey;
  bioKey: StringKey;
  skillKeys: StringKey[];
  phone: string;
  profileUrl: string;
  portfolioUrl?: string;
  image: string;
}

const TEAM: Member[] = [
  {
    id: "sunil",
    nameKey: "sunilName",
    roleKey: "sunilRole",
    affiliationKey: "sunilUniversity",
    affiliationIcon: GraduationCap,
    quoteKey: "sunilQuote",
    bioKey: "sunilBio",
    skillKeys: ["sunilSkill1", "sunilSkill2", "sunilSkill3"],
    phone: "+977 9819447220",
    profileUrl: "/worker/fc5757c4-cd73-4dc0-b3d6-441c4c1dad00",
    image: sunilImage,
  },
  {
    id: "sanjay",
    nameKey: "sanjayName",
    roleKey: "sanjayRole",
    affiliationKey: "sanjayLocation",
    affiliationIcon: GraduationCap,
    quoteKey: "sanjayQuote",
    bioKey: "sanjayBio",
    skillKeys: ["sanjaySkill1", "sanjaySkill2", "sanjaySkill3"],
    phone: "+977 9766382090",
    profileUrl: "/worker/b7bc1f68-7f04-4eb4-addd-df5d71db8e98",
    portfolioUrl: "https://guptasanjay.com.np",
    image: sanjayImage,
  },
  {
    id: "dipendra",
    nameKey: "dipendraName",
    roleKey: "dipendraRole",
    affiliationKey: "dipendraLocation",
    affiliationIcon: Building2,
    quoteKey: "dipendraQuote",
    bioKey: "dipendraBio",
    skillKeys: ["dipendraSkill1", "dipendraSkill2", "dipendraSkill3"],
    phone: "+977 9867503930",
    profileUrl: "/worker/541bf85d-3b39-465f-b14d-f0267ab09b10",
    image: dipendraImage,
  },
];

/** Bios open with the member's quote, which the card shows on its own. */
function bioParagraphs(bio: string): string[] {
  const parts = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return parts[0]?.startsWith('"') ? parts.slice(1) : parts;
}

function ContactPill({
  href,
  icon: Icon,
  children,
  external,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
    >
      <Icon className="h-4 w-4 shrink-0 text-brand-300" aria-hidden />
      <span className="truncate">{children}</span>
      {external && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
    </a>
  );
}

/**
 * Identity panel (photo, role, affiliation, contact) beside a story panel
 * (quote, bio, focus areas). Phones stack the two and fold the bio behind
 * "Read full story"; tablets put photo and name side by side; desktops
 * split the card and alternate sides down the page.
 */
function TeamProfileCard({ member, reversed }: { member: Member; reversed: boolean }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const AffiliationIcon = member.affiliationIcon;
  const name = t(member.nameKey);
  const paragraphs = bioParagraphs(t(member.bioKey));

  return (
    <article
      id={member.id}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-teal-900/5"
    >
      <div
        className={cn(
          "grid",
          reversed ? "lg:grid-cols-[1fr_minmax(300px,340px)]" : "lg:grid-cols-[minmax(300px,340px)_1fr]",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-teal-800 p-6 text-white sm:p-8",
            reversed && "lg:order-2",
          )}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-brand-400/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left lg:flex-col lg:items-start">
            <img
              src={member.image}
              alt={name}
              loading="lazy"
              className="h-32 w-32 shrink-0 rounded-3xl object-cover shadow-xl ring-4 ring-white/20 sm:h-36 sm:w-36 lg:h-44 lg:w-44"
            />
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-white/25">
                {t(member.roleKey)}
              </span>
              <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-[1.7rem]">{name}</h3>
              <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-brand-50/85">
                <AffiliationIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                {t(member.affiliationKey)}
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <ContactPill href={`tel:${member.phone.replace(/\s+/g, "")}`} icon={Phone}>
              {member.phone}
            </ContactPill>
            <ContactPill href={member.profileUrl} icon={UserRound}>
              {t("aboutDulekoProfile")}
            </ContactPill>
            {member.portfolioUrl && (
              <ContactPill href={member.portfolioUrl} icon={Globe} external>
                {member.portfolioUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </ContactPill>
            )}
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8 lg:p-10">
          <blockquote className="relative">
            <Quote className="mb-3 h-8 w-8 text-accent-500" aria-hidden />
            <p className="text-balance text-xl font-semibold leading-snug text-teal-800 sm:text-2xl">
              {t(member.quoteKey)}
            </p>
          </blockquote>

          <div className="relative mt-6">
            <div
              id={`${member.id}-bio`}
              className={cn(
                "space-y-4 overflow-hidden text-[15px] leading-relaxed text-slate-600 transition-[max-height] duration-500 sm:text-base sm:leading-7 lg:max-h-none",
                expanded ? "max-h-[2000px]" : "max-h-44",
              )}
            >
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
            {!expanded && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent lg:hidden"
                aria-hidden
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`${member.id}-bio`}
            className="mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-brand-700 hover:text-brand-800 lg:hidden"
          >
            {expanded ? t("showLess") : t("aboutReadFullStory")}
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
          </button>

          <div className="mt-auto pt-6">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t("aboutFocusAreas")}</p>
            <ul className="flex flex-wrap gap-2">
              {member.skillKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800"
                >
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AboutPage() {
  const { t } = useI18n();

  return (
    <SiteLayout title={t("navAboutDuleko")}>
      <PageHero story="about" eyebrow={t("navAboutDuleko")} title={t("aboutHeroTitle")}>
        <Prose>
          <p>{t("aboutHeroP1")}</p>
          <p>{t("aboutHeroP2")}</p>
          <p>{t("aboutHeroP3")}</p>
        </Prose>
        <p className="mt-8 text-xl font-semibold text-brand-700 sm:text-2xl">
          {t("siteTagline")}
        </p>
      </PageHero>

      <SiteSection>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>{t("howItWorks")}</Eyebrow>
            <Prose>
              <p>{t("aboutDescription")}</p>
            </Prose>
            <StoryLink to="/mission" className="mt-6">
              {t("readOurMission")}
            </StoryLink>
          </div>
          <ul className="space-y-3">
            {HOW_IT_WORKS_KEYS.map((key) => (
              <li
                key={key}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-relaxed text-slate-700 shadow-sm"
              >
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </SiteSection>

      <SiteSection id="team" tone="cream">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>{t("navOurTeam")}</Eyebrow>
            <SectionHeading>{t("aboutTeamTitle")}</SectionHeading>
          </div>
          {/* Quick jump to each profile - most useful on a phone, where the
              three cards run long. */}
          <ul className="flex flex-wrap gap-2" aria-label={t("aboutJumpToMember")}>
            {TEAM.map((member) => (
              <li key={member.id}>
                <a
                  href={`#${member.id}`}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-800"
                >
                  <img src={member.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                  {t(member.nameKey).split(" ")[0]}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 space-y-6 sm:space-y-8">
          {TEAM.map((member, i) => (
            <TeamProfileCard key={member.id} member={member} reversed={i % 2 === 1} />
          ))}
        </div>
      </SiteSection>

      <SiteSection id="contact">
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-teal-800">{t("contactUs")}</h2>
                <p className="mt-1.5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {t("contactQuestion")}{" "}
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
              {t("emailUs")}
            </a>
          </div>
        </div>
      </SiteSection>

      <StoryNav current="about" />
      <FinalCta />
    </SiteLayout>
  );
}
