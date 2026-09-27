import { Link, Navigate, useParams } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Eyebrow, FinalCta, PageHero, SectionHeading, SiteLayout, SiteSection } from "@/components/duleko/Site";
import { useI18n } from "@/lib/i18n";
import { TEAM, TeamProfileCard } from "./AboutPage";

/**
 * One team member's own page (/about/<slug>) - the About page's card with the
 * full story, so each of them can be found and shared on their own.
 */
export function FounderPage() {
  const { slug } = useParams({ from: "/about/$slug" });
  const { t } = useI18n();
  const member = TEAM.find((m) => m.slug === slug);
  if (!member) return <Navigate to="/about" hash="team" replace />;

  const name = t(member.nameKey);
  const others = TEAM.filter((m) => m.id !== member.id);

  return (
    <SiteLayout title={name}>
      <PageHero crumb={{ group: t("navAboutDuleko"), title: name }} eyebrow={t(member.roleKey)} title={name}>
        <p className="text-balance text-xl font-semibold leading-snug text-brand-700 sm:text-2xl">
          {t(member.quoteKey)}
        </p>
      </PageHero>

      <SiteSection tone="cream">
        <TeamProfileCard member={member} reversed={false} standalone />
      </SiteSection>

      <SiteSection>
        <div className="max-w-3xl">
          <Eyebrow>{t("navOurTeam")}</Eyebrow>
          <SectionHeading>{t("founderOtherFounders")}</SectionHeading>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{t("aboutFoundedBy")}</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {others.map((other) => (
            <li key={other.id}>
              <Link
                to="/about/$slug"
                params={{ slug: other.slug }}
                className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-teal-900/5 sm:p-5"
              >
                <img
                  src={other.image}
                  alt={t(other.nameKey)}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-brand-100"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-slate-900">{t(other.nameKey)}</p>
                  <p className="text-sm text-slate-500">{t(other.roleKey)}</p>
                </div>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-brand-700 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/about"
          hash="team"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {t("meetTheTeam")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </SiteSection>

      <FinalCta />
    </SiteLayout>
  );
}
