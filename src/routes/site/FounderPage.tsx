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
import { BrandWatermark, RidgeLines } from "@/components/duleko/site/ui";
import dulekoMark from "@/assets/duleko-mark.webp";
import { TEAM, bioParagraphs, telHref } from "@/components/duleko/site/team";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The small-caps label above each fact in the side card. */
const factLabel = "eyebrow-track text-[11px] font-bold uppercase text-slate-400";

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
  const firstName = name.split(" ")[0];
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
          // The portrait framed like a Duleko member card: a white mat over a
          // tilted brand card (ridge lines + watermark), the mark pinned on top.
          <div className="relative mx-auto mb-6 mt-4 w-full max-w-[13.5rem] sm:max-w-[15rem]">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-300/35 to-accent-500/15 blur-2xl"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-[radial-gradient(circle,var(--color-accent-500)_1.5px,transparent_1.6px)] bg-[length:10px_10px] opacity-50"
              aria-hidden
            />
            <div
              className="band absolute inset-0 translate-x-5 translate-y-2 rotate-[7deg] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-600 via-brand-700 to-teal-800 shadow-[0_30px_60px_-30px_rgb(12_60_72/0.6)]"
              aria-hidden
            >
              <RidgeLines className="text-white/20" seed={12} lines={9} />
              <BrandWatermark className="-bottom-8 -right-8 h-32 w-32" />
            </div>
            <figure className="relative rounded-[1.75rem] bg-surface p-2 shadow-[0_30px_60px_-30px_rgb(12_60_72/0.55)] ring-1 ring-slate-200/80">
              <div className="relative overflow-hidden rounded-[1.35rem] bg-teal-800">
                <img src={member.image} alt={name} className="aspect-[4/5] w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3.5 pt-12 text-white">
                  <p className="inline-flex items-start gap-1.5 text-[13px] font-medium leading-snug text-white/90">
                    <AffiliationIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden />
                    {t(member.affiliationKey)}
                  </p>
                </figcaption>
              </div>
            </figure>
            <span className="absolute -left-4 -top-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface shadow-lg ring-1 ring-slate-200/80">
              <img src={dulekoMark} alt="Duleko" className="h-10 w-10 rounded-xl object-cover" />
            </span>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-700 px-4 py-1.5 text-xs font-bold text-white shadow-lg ring-4 ring-paper">
              {t(member.roleKey)}
            </span>
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
            <h2 className="font-display mt-2 text-2xl font-semibold text-teal-800 sm:text-3xl">
              {t("founderStoryTitle", { name: firstName })}
            </h2>
            {opening && (
              <Lead className="mt-5 font-medium text-slate-800 sm:text-lg sm:leading-8">
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
                  <dt className={factLabel}>{t("teamRole")}</dt>
                  <dd className="font-display mt-1 text-lg font-semibold text-slate-900">{t(member.roleKey)}</dd>
                </div>
                <div>
                  <dt className={factLabel}>{t("teamAffiliation")}</dt>
                  <dd className="mt-1 font-semibold leading-snug text-slate-900">{t(member.affiliationKey)}</dd>
                </div>
                <div>
                  <dt className={factLabel}>{t("aboutFocusAreas")}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {member.skillKeys.map((key) => (
                      <span
                        key={key}
                        className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-800 ring-1 ring-brand-200"
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
                        <span className="eyebrow-track block text-[11px] font-bold uppercase text-white/55">{label}</span>
                        <span className="mt-0.5 block truncate font-semibold">{value}</span>
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
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold text-slate-900 sm:text-xl">{t(other.nameKey)}</p>
                  <p className="text-sm font-medium text-slate-500">{t(other.roleKey)}</p>
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
