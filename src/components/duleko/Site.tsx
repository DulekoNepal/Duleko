import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronRight, Compass, LogIn, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import seo from "@/lib/seo-pages.json";
import { cn } from "@/lib/utils";
import { NEPALI_TAGLINE, useSiteActions } from "./site/actions";
import { STORY, type SitePath, type StoryKey } from "./site/nav";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";
import { Container, SiteButton } from "./site/ui";

/**
 * The public website (Home for signed-out visitors, Mission, About, the
 * audience pages, Trust & Safety, Motivation, Privacy, Terms). All of its
 * copy is bilingual: website strings live in lib/i18n-site.ts, and the
 * header carries the EN / नेपाली switch.
 */

export {
  CONTACT_EMAIL,
  NEPALI_TAGLINE,
  SiteActionsProvider,
  useSiteActions,
  type SiteActions,
} from "./site/actions";
export { Container, SiteButton } from "./site/ui";
export type { StoryKey } from "./site/nav";

export function SiteLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // In English, use the same search-friendly title the page's static HTML
  // carries (lib/seo-pages.json); in Nepali, the translated page name.
  const seoTitle = lang === "en" ? (seo.pages as Record<string, { title: string }>)[pathname]?.title : undefined;
  const fullTitle = seoTitle ?? (title ? `${title} | Duleko` : undefined);

  // The app's own screens don't set a title, so hand back whatever was there.
  useEffect(() => {
    if (!fullTitle) return;
    const previous = document.title;
    document.title = fullTitle;
    return () => {
      document.title = previous;
    };
  }, [fullTitle]);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/**
 * The site's main actions. The hero offers Explore + Create profile, with a
 * quiet "Log in" link for returning people; the closing band at the foot of
 * every page offers Explore + Log in, so Create profile isn't repeated down
 * the page (the header keeps it one tap away throughout). Members just get
 * "Open Duleko".
 */
export function PrimaryCtas({ onDark = false, closing = false }: { onDark?: boolean; closing?: boolean }) {
  const { explore, createProfile, signIn, signedIn } = useSiteActions();
  const { t } = useI18n();

  if (signedIn) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <SiteButton size="lg" variant={onDark ? "light" : "primary"} onClick={() => explore("/")}>
          <Compass className="h-5 w-5" aria-hidden />
          {t("headerOpenDuleko")}
        </SiteButton>
      </div>
    );
  }

  return (
    <div>
      <div className={cn("flex flex-col gap-3 sm:flex-row", closing && "sm:justify-center")}>
        <SiteButton size="lg" variant={onDark ? "light" : "primary"} onClick={() => explore("/")}>
          <Compass className="h-5 w-5" aria-hidden />
          {t("exploreDuleko")}
        </SiteButton>
        {closing ? (
          <SiteButton size="lg" variant={onDark ? "ghostLight" : "outline"} onClick={signIn}>
            <LogIn className="h-5 w-5" aria-hidden />
            {t("siteLogIn")}
          </SiteButton>
        ) : (
          <SiteButton size="lg" variant={onDark ? "ghostLight" : "outline"} onClick={createProfile}>
            <UserPlus className="h-5 w-5" aria-hidden />
            {t("createYourProfile")}
          </SiteButton>
        )}
      </div>
      {!closing && (
        <p className={cn("mt-4 text-sm", onDark ? "text-brand-50/80" : "text-slate-600")}>
          {t("haveAccount")}{" "}
          <button
            type="button"
            onClick={signIn}
            className={cn(
              "font-semibold underline-offset-4 hover:underline",
              onDark ? "text-white" : "text-brand-700",
            )}
          >
            {t("siteLogIn")}
          </button>
        </p>
      )}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent-600", className)}>
      {children}
    </p>
  );
}

export function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-balance text-3xl font-bold leading-tight tracking-tight text-teal-800 sm:text-4xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-8", className)}>
      {children}
    </div>
  );
}

export function SiteSection({
  id,
  tone = "white",
  className,
  children,
}: {
  id?: string;
  tone?: "white" | "cream" | "brand";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-16 sm:py-24",
        tone === "cream" && "bg-cream-50",
        tone === "brand" && "bg-brand-50/60",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** An inline "keep reading" link between sections and pages. */
export function StoryLink({
  to,
  hash,
  children,
  className,
}: {
  to: SitePath;
  hash?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className={cn(
        "group inline-flex items-center gap-1.5 text-base font-semibold text-brand-700 hover:text-brand-800",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}

interface Crumb {
  title: string;
  group?: string;
}

function Breadcrumbs({ crumb }: { crumb: Crumb }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("siteBreadcrumb")}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <li>
          <Link to="/" className="hover:text-brand-700">
            {t("siteHome")}
          </Link>
        </li>
        {crumb.group && (
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
            {crumb.group}
          </li>
        )}
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
          <span aria-current="page" className="font-medium text-slate-700">
            {crumb.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/** Top band for every inner page. */
export function PageHero({
  eyebrow,
  title,
  story,
  crumb,
  children,
}: {
  eyebrow: string;
  title: string;
  story?: StoryKey;
  /** Breadcrumb for pages outside the story (Motivation, Privacy). */
  crumb?: Crumb;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const chapter = STORY.find((c) => c.key === story);
  const breadcrumb =
    crumb ?? (chapter && { title: t(chapter.titleKey), group: chapter.groupKey && t(chapter.groupKey) });
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cream-50 pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(15_76_92/0.07)_1px,transparent_0)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden
      />
      <Container className="relative">
        {breadcrumb && (
          <div className="mb-6">
            <Breadcrumbs crumb={breadcrumb} />
          </div>
        )}
        <div className="animate-in-up max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-teal-800 sm:text-5xl">
            {title}
          </h1>
          {children && <div className="mt-6">{children}</div>}
        </div>
      </Container>
    </section>
  );
}

/** A chain of stages - "Skill → Visibility → Opportunity → Income". */
export function Flow({ steps, className }: { steps: string[]; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold sm:text-base",
                last
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-brand-200 bg-white text-brand-800",
              )}
            >
              {step}
            </span>
            {!last && <ArrowRight className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function IconCard({
  icon: Icon,
  title,
  to,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** Makes the whole card a link to the page that covers it in depth. */
  to?: SitePath;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
        {title}
        {to && (
          <ArrowRight
            className="h-4 w-4 -translate-x-1 text-brand-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        )}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{children}</p>
    </>
  );
  const className =
    "group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md";
  return to ? (
    <Link to={to} className={cn(className, "hover:-translate-y-0.5 hover:border-brand-300")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * The end of every page: where this chapter sits in the Duleko story, and
 * a hand-off to the one before and after it.
 */
export function StoryNav({ current }: { current: StoryKey }) {
  const { t } = useI18n();
  const index = STORY.findIndex((c) => c.key === current);
  const prev = index > 0 ? STORY[index - 1] : null;
  const next = index < STORY.length - 1 ? STORY[index + 1] : null;

  return (
    <section className="border-t border-slate-100 bg-white py-14 sm:py-20" aria-label={t("storyContinue")}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">{t("storyLabel")}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t("storyChapterOf", { n: index + 1, total: STORY.length })}
            </p>
          </div>
        </div>

        <ol className="mt-4 flex gap-1.5" aria-label={t("storyChapters")}>
          {STORY.map((chapter, i) => (
            <li key={chapter.key} className="flex-1">
              <Link
                to={chapter.to}
                title={t(chapter.titleKey)}
                aria-label={t("storyChapter", { n: i + 1, title: t(chapter.titleKey) })}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "block h-1.5 rounded-full transition-all hover:h-2.5",
                  i < index && "bg-brand-600",
                  i === index && "bg-accent-500",
                  i > index && "bg-slate-200 hover:bg-slate-300",
                )}
              />
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {prev ? (
            <Link
              to={prev.to}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:p-6"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                {t("storyPrevious")}
              </span>
              <span className="mt-2 text-lg font-semibold text-slate-900">{t(prev.titleKey)}</span>
              <span className="mt-1 text-sm text-slate-500">{t(prev.teaserKey)}</span>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {next && (
            <Link
              to={next.to}
              className="group flex flex-col rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md sm:items-end sm:p-6 sm:text-right"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                {t("storyNext")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
              <span className="mt-2 text-lg font-semibold text-slate-900">{t(next.titleKey)}</span>
              <span className="mt-1 text-sm text-slate-600">{t(next.teaserKey)}</span>
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}

/**
 * Closing hand-off for pages that sit outside the story (Motivation,
 * Privacy): the pages a reader most likely wants next.
 */
export function ReadNext({ links }: { links: { to: SitePath; hash?: string; title: string; teaser: string }[] }) {
  const { t } = useI18n();
  return (
    <section className="border-t border-slate-100 bg-white py-14 sm:py-20" aria-label={t("keepReading")}>
      <Container>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">{t("keepReading")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={`${link.to}${link.hash ?? ""}`}
              to={link.to}
              hash={link.hash}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:p-6"
            >
              <span className="inline-flex items-center gap-1.5 text-lg font-semibold text-slate-900">
                {link.title}
                <ArrowRight
                  className="h-4 w-4 text-brand-600 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              <span className="mt-1 text-sm text-slate-500">{link.teaser}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Section 9 of the approved content - closes Home and the inner pages. */
export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-teal-800 py-20 text-white sm:py-24">
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <Container className="relative flex flex-col items-center text-center">
        <h2 className="max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {t("finalCtaTitle")}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-50/90 sm:text-lg">
          {t("finalCtaBody")}
        </p>
        <div className="mt-8 w-full sm:w-auto">
          <PrimaryCtas onDark closing />
        </div>
        <p lang="ne" className="mt-8 text-lg font-semibold text-brand-200">
          {NEPALI_TAGLINE}
        </p>
      </Container>
    </section>
  );
}
