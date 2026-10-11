import { Link, Navigate, useParams } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Globe, Phone, UserRound } from "lucide-react";
import {
  Eyebrow,
  FinalCta,
  Lead,
  PageHero,
  Prose,
  QuoteMark,
  SectionIntro,
  SiteLayout,
  SiteSection,
  siteCard,
  siteCardHover,
} from "@/components/duleko/Site";
import { RidgeLines } from "@/components/duleko/site/ui";
import { TEAM, bioParagraphs, telHref } from "@/components/duleko/site/team";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * One team member's own page (/about/<slug>): their portrait and words up
 * top, the full story beside the facts and ways to reach them, then the
 * rest of the team - so each of them can be found and shared on their own.
 */
export function FounderPage() {
  const { slug } = useParams({ from: "/about/$slug" });
  const { t } = useI18n();
  const member = TEAM.find((m) => m.slug === slug);
  if (!member) return <Navigate to="/about" hash="team" replace />;

  const name = t(member.nameKey);
  const others = TEAM.filter((m) => m.id !== member.id);
  const [opening, ...rest] = bioParagraphs(t(member.bioKey));
  const AffiliationIcon = member.affiliationIcon;

  const contacts: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; value: string; external?: boolean }[] = [
    { href: telHref(member.phone), icon: Phone, label: t("phoneNumber"), value: member.phone },
    { href: member.profileUrl, icon: UserRound, label: t("aboutDulekoProfile"), value: "duleko.com" },
    ...(member.portfolioUrl
      ? [
          {
            href: member.portfolioUrl,
            icon: Globe,
            label: t("teamPortfolio"),
            value: member.portfolioUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            external: true,
          },
        ]
      : []),
  ];

  return (
    <SiteLayout title={name}>
      <PageHero
        crumb={{ group: t("navAboutDuleko"), title: name }}
        eyebrow={t(member.roleKey)}
        title={name}
        aside={
          <div className="relative mx-auto w-full max-w-sm">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-300/40 to-accent-500/15 blur-2xl"
              aria-hidden
            />
            <div className="band relative overflow-hidden rounded-[2rem] bg-teal-800 shadow-[0_40px_80px_-40px_rgb(12_60_72/0.6)]">
              <img src={member.image} alt={name} className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-20 text-white">
                <p className="inline-flex items-start gap-1.5 text-sm text-white/85">
                  <AffiliationIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                  {t(member.affiliationKey)}
                </p>
              </div>
            </div>
          </div>
        }
      >
        <QuoteMark className="mt-2" />
        <p className="font-quote mt-3 text-balance text-2xl italic leading-snug text-teal-800 sm:text-[1.75rem]">
          {t(member.quoteKey)}
        </p>
      </PageHero>

      <SiteSection>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <article>
            <Eyebrow>{t("motivationSubtitle")}</Eyebrow>
            {opening && (
              <Lead className="text-slate-700">
                <p>{opening}</p>
              </Lead>
            )}
            {rest.length > 0 && (
              <Prose className="mt-6">
                {rest.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </Prose>
            )}
          </article>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className={cn(siteCard, "p-5 sm:p-6")}>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-slate-500">{t("teamRole")}</dt>
                  <dd className="font-display mt-0.5 text-lg font-semibold text-slate-900">{t(member.roleKey)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{t("teamAffiliation")}</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{t(member.affiliationKey)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">{t("aboutFocusAreas")}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {member.skillKeys.map((key) => (
                      <span
                        key={key}
                        className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200"
                      >
                        {t(key)}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="band relative overflow-hidden rounded-2xl bg-teal-800 p-2 text-white">
              <RidgeLines className="text-white/[0.06]" seed={12} lines={6} />
              <ul className="relative">
                {contacts.map(({ href, icon: Icon, label, value, external }) => (
                  <li key={href}>
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/10"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-white/60">{label}</span>
                        <span className="block truncate font-medium">{value}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </SiteSection>

      <SiteSection tone="paper">
        <SectionIntro eyebrow={t("navOurTeam")} title={t("founderOtherFounders")}>
          <p>{t("aboutFoundedBy")}</p>
        </SectionIntro>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {others.map((other) => (
            <li key={other.id}>
              <Link
                to="/about/$slug"
                params={{ slug: other.slug }}
                className={cn(siteCard, siteCardHover, "group flex items-center gap-4 p-4 sm:gap-5 sm:p-5")}
              >
                <img
                  src={other.image}
                  alt={t(other.nameKey)}
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold text-slate-900 sm:text-xl">{t(other.nameKey)}</p>
                  <p className="text-sm text-slate-500">{t(other.roleKey)}</p>
                  <p className="font-quote mt-2 line-clamp-2 text-[15px] italic leading-snug text-teal-800">
                    “{t(other.quoteKey)}”
                  </p>
                </div>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-brand-700 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/about"
          hash="team"
          className="group mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-700 underline-offset-[6px] hover:underline"
        >
          {t("meetTheTeam")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </SiteSection>

      <FinalCta />
    </SiteLayout>
  );
}
