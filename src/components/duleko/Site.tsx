import { useEffect, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Compass, LogIn, Play, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import seo from "@/lib/seo-pages.json";
import { cn, formatNumber } from "@/lib/utils";
import { NEPALI_TAGLINE, PLAY_STORE_URL, useSiteActions } from "./site/actions";
import { STORY, type SitePath, type StoryKey } from "./site/nav";
import { SiteFooter } from "./site/SiteFooter";
import { SiteHeader } from "./site/SiteHeader";
import { BrandWatermark, Container, RidgeLines, SiteButton } from "./site/ui";

/**
 * The public website (Home for signed-out visitors, Mission, About, the
 * audience pages, Trust & Safety, Motivation, Privacy, Terms). All of its
 * copy is bilingual: website strings live in lib/i18n-site.ts, and the
 * header carries the EN / नेपाली switch.
 *
 * Type: headlines in the display face (Bricolage Grotesque), the team's own
 * words in the quote face (Fraunces italic), everything else in Noto. Colour:
 * Duleko Green for action, Deep Teal for headings and the dark bands,
 * Opportunity Orange only as a small accent.
 */

export {
  CONTACT_EMAIL,
  NEPALI_TAGLINE,
  SiteActionsProvider,
  useSiteActions,
  type SiteActions,
} from "./site/actions";
export { BrandWatermark, Container, RidgeLines, SiteButton } from "./site/ui";
export type { StoryKey } from "./site/nav";

const IS_NATIVE_APP = Capacitor.isNativePlatform();

/** Props that fade a block up as it scrolls into view (see SiteLayout). */
export function reveal(delayMs = 0): { "data-reveal": ""; style?: React.CSSProperties } {
  return delayMs
    ? { "data-reveal": "", style: { "--delay": `${delayMs}ms` } as React.CSSProperties }
    : { "data-reveal": "" };
}

/** "02" - chapter and step numbers, in Nepali digits when reading Nepali. */
function twoDigits(n: number, lang: "en" | "ne"): string {
  return formatNumber(String(n).padStart(2, "0"), lang);
}

export function SiteLayout({ title, children }: { title?: string; children: React.ReactNode }) {
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mainRef = useRef<HTMLElement>(null);
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

  // Fade blocks marked with reveal() up as they come into view. The mark is
  // a plain attribute React doesn't own, so re-renders never hide a block
  // again; a language switch can remount some, hence `lang`.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    const pending = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])"));
    if (!("IntersectionObserver" in window)) {
      pending.forEach((el) => el.setAttribute("data-shown", ""));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    pending.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname, lang]);

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-slate-900">
      <SiteHeader />
      <main ref={mainRef} className="flex-1">
        {children}
      </main>
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
      <div className={cn("flex flex-col gap-2.5 sm:flex-row", closing && "sm:justify-start")}>
        <SiteButton size="lg" variant={onDark ? "light" : "primary"} onClick={() => explore("/home")}>
          <Compass className="h-5 w-5" aria-hidden />
          {t("headerOpenDuleko")}
        </SiteButton>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <SiteButton size="lg" variant={onDark ? "light" : "primary"} onClick={() => explore("/home")}>
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
        <p className={cn("mt-3.5 text-sm", onDark ? "text-brand-50/80" : "text-slate-500")}>
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

// ---- Type --------------------------------------------------------------------

export function Eyebrow({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <p
      className={cn(
        "eyebrow-track mb-3 flex items-center gap-2 text-xs font-bold uppercase sm:text-[13px]",
        tone === "light" ? "text-brand-300" : "text-brand-700",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  children,
  className,
  tone = "default",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "light";
  as?: "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-display text-balance text-[1.85rem] font-semibold leading-[1.08] sm:text-4xl lg:text-[2.75rem]",
        tone === "light" ? "text-white" : "text-teal-800",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** The opening paragraph under a page or section title - a size up from body text. */
export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9", className)}>
      {children}
    </div>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 text-base leading-[1.75] text-slate-600 sm:text-[17px]", className)}>
      {children}
    </div>
  );
}

// ---- Layout ------------------------------------------------------------------

export type SectionTone = "white" | "paper" | "cream" | "brand" | "ink";

export function SiteSection({
  id,
  tone = "white",
  className,
  containerClassName,
  children,
}: {
  id?: string;
  /** "cream" is the old name for "paper". "ink" is the dark teal band. */
  tone?: SectionTone;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20 py-14 sm:py-20 lg:py-24",
        tone === "white" && "bg-surface",
        (tone === "paper" || tone === "cream") && "bg-paper",
        tone === "brand" && "overflow-hidden bg-brand-50/70",
        tone === "ink" && "band overflow-hidden bg-teal-800 text-white",
        className,
      )}
    >
      {tone === "brand" && (
        <BrandWatermark tone="light" className="-bottom-8 -right-10 h-44 w-44 sm:h-60 sm:w-60 lg:-bottom-12 lg:h-72 lg:w-72" />
      )}
      {tone === "ink" && (
        <>
          <RidgeLines className="text-white/[0.05]" seed={3} />
          <div
            className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/20 blur-3xl"
            aria-hidden
          />
        </>
      )}
      <Container className={cn((tone === "brand" || tone === "ink") && "relative", containerClassName)}>
        <div {...reveal()}>{children}</div>
      </Container>
    </section>
  );
}

/** A section's eyebrow + heading (+ optional intro), left or centred. */
export function SectionIntro({
  eyebrow,
  title,
  children,
  align = "left",
  tone = "default",
  className,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  align?: "left" | "center";
  tone?: "default" | "light";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <Eyebrow tone={tone} className={cn(align === "center" && "justify-center")}>
          {eyebrow}
        </Eyebrow>
      )}
      <SectionHeading tone={tone}>{title}</SectionHeading>
      {children && (
        <div
          className={cn(
            "mt-4 text-base leading-[1.75] sm:mt-5 sm:text-lg sm:leading-8",
            tone === "light" ? "text-white/75" : "text-slate-600",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** An inline "keep reading" link between sections and pages. */
export function StoryLink({
  to,
  hash,
  children,
  className,
  tone = "default",
}: {
  to: SitePath;
  hash?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "light";
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className={cn(
        "group inline-flex items-center gap-1.5 py-1 text-[15px] font-semibold underline-offset-[6px] hover:underline sm:text-base",
        tone === "light" ? "text-brand-300 hover:text-white" : "text-brand-700 hover:text-brand-800",
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
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-slate-500 sm:text-sm">
        <li>
          <Link to="/" className="transition-colors hover:text-brand-700">
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

/**
 * Top of every inner page: breadcrumb, the chapter it is in the Duleko story
 * (or a plain eyebrow), a large title and intro, and an optional `aside` -
 * a card or illustration beside the copy on desktop, below it on phones.
 */
export function PageHero({
  eyebrow,
  title,
  story,
  crumb,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  story?: StoryKey;
  /** Breadcrumb for pages outside the story (Motivation, Privacy). */
  crumb?: Crumb;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const chapterIndex = STORY.findIndex((c) => c.key === story);
  const chapter = chapterIndex >= 0 ? STORY[chapterIndex] : undefined;
  const breadcrumb =
    crumb ?? (chapter && { title: t(chapter.titleKey), group: chapter.groupKey && t(chapter.groupKey) });
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-paper">
      <RidgeLines className="text-teal-800/[0.07]" seed={chapterIndex + 2} />
      <div
        className="pointer-events-none absolute -right-40 -top-48 h-[30rem] w-[30rem] rounded-full bg-brand-200/45 blur-3xl"
        aria-hidden
      />
      <Container className="relative pb-12 pt-6 sm:pb-16 sm:pt-8 lg:pb-20">
        {breadcrumb && <Breadcrumbs crumb={breadcrumb} />}
        <div
          className={cn(
            "mt-8 grid gap-10 sm:mt-10",
            aside && "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-14",
          )}
        >
          <div className="animate-in-up max-w-3xl">
            {chapter ? (
              <p className="mb-4 flex items-center gap-3">
                <span className="font-display text-sm font-semibold tabular-nums text-accent-600">
                  {t("siteChapter")} {twoDigits(chapterIndex + 1, lang)}
                </span>
                <span className="h-px w-8 bg-slate-300" aria-hidden />
                <span className="eyebrow-track text-xs font-bold uppercase text-brand-700 sm:text-[13px]">
                  {eyebrow}
                </span>
              </p>
            ) : (
              <Eyebrow>{eyebrow}</Eyebrow>
            )}
            <h1 className="font-display text-balance text-[2.4rem] font-semibold leading-[1.03] text-teal-800 sm:text-5xl lg:text-[3.6rem]">
              {title}
            </h1>
            {children && <div className="mt-5 sm:mt-6">{children}</div>}
          </div>
          {aside && (
            <div className="animate-in-up" style={{ "--delay": "120ms" } as React.CSSProperties}>
              {aside}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

// ---- Building blocks ---------------------------------------------------------

/** A chain of stages - "Skill → Visibility → Opportunity → Income". */
export function Flow({ steps, className }: { steps: string[]; className?: string }) {
  const { lang } = useI18n();
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2.5", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={`${i}-${step}`} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold ring-1",
                last
                  ? "bg-brand-700 text-white ring-brand-700"
                  : "bg-surface text-slate-800 ring-slate-200",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                  last ? "bg-white/20 text-white" : "bg-brand-50 text-brand-700",
                )}
              >
                {formatNumber(i + 1, lang)}
              </span>
              {step}
            </span>
            {!last && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A journey drawn as a connected line of numbered stops - stacked on phones
 * and tablets, one row across on desktop. The last stop is the destination.
 */
export function Journey({
  steps,
  className,
  tone = "default",
}: {
  steps: { title: string; body?: string }[];
  className?: string;
  tone?: "default" | "light";
}) {
  const { lang } = useI18n();
  const light = tone === "light";
  return (
    <ol
      className={cn("grid lg:grid-cols-[repeat(var(--stops),minmax(0,1fr))]", className)}
      style={{ "--stops": steps.length } as React.CSSProperties}
    >
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={`${i}-${step.title}`} className="relative pb-8 pl-14 last:pb-0 lg:pb-0 lg:pl-0 lg:pr-5 lg:pt-14">
            {!last && (
              <span
                className={cn(
                  "absolute bottom-0 left-[19px] top-10 w-px lg:left-10 lg:right-0 lg:top-[19px] lg:h-px lg:w-auto",
                  light ? "bg-white/20" : "bg-brand-200",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "font-display absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                last
                  ? "bg-accent-500 text-white shadow-[0_8px_20px_-8px_rgb(249_115_22/0.8)]"
                  : light
                    ? "bg-white/10 text-white ring-1 ring-white/30"
                    : "bg-surface text-brand-700 ring-2 ring-brand-200",
              )}
              aria-hidden
            >
              {twoDigits(i + 1, lang)}
            </span>
            <p
              className={cn(
                "font-display text-lg font-semibold leading-snug sm:text-xl",
                light ? "text-white" : "text-slate-900",
              )}
            >
              {step.title}
            </p>
            {step.body && (
              <p className={cn("mt-1.5 text-[15px] leading-relaxed", light ? "text-white/70" : "text-slate-600")}>
                {step.body}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const CARD =
  "rounded-2xl border border-slate-200/80 bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-all duration-300";
const CARD_HOVER =
  "hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_24px_48px_-28px_rgb(12_60_72/0.45)]";

/** The website's standard card surface - for one-off cards on the pages. */
export const siteCard = CARD;
export const siteCardHover = CARD_HOVER;

export function IconBadge({
  icon: Icon,
  tone = "brand",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "accent" | "navy" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
        tone === "brand" && "bg-brand-50 text-brand-700 ring-brand-200/70",
        tone === "accent" && "bg-accent-50 text-accent-600 ring-accent-500/20",
        tone === "navy" && "bg-navy-50 text-navy-700 ring-navy-500/15",
        tone === "light" && "bg-white/10 text-brand-300 ring-white/15",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function IconCard({
  icon,
  title,
  to,
  index,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** Makes the whole card a link to the page that covers it in depth. */
  to?: SitePath;
  /** Shown as a small "01" in the corner, for cards that read in order. */
  index?: number;
  tone?: "brand" | "accent" | "navy";
  children: React.ReactNode;
}) {
  const { lang } = useI18n();
  const body = (
    <>
      {index !== undefined && (
        <span className="font-display absolute right-5 top-5 text-sm font-semibold tabular-nums text-slate-300">
          {twoDigits(index, lang)}
        </span>
      )}
      <IconBadge icon={icon} tone={tone} />
      <h3 className="font-display mt-4 flex items-center gap-1.5 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
        {title}
        {to && (
          <ArrowRight
            className="h-4 w-4 shrink-0 -translate-x-1 text-brand-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        )}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{children}</p>
    </>
  );
  const className = cn(CARD, "group relative block h-full p-5 sm:p-6");
  return to ? (
    <Link to={to} className={cn(className, CARD_HOVER)}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A row of plain facts - big figure, short label. */
export function FactGrid({
  facts,
  className,
}: {
  facts: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/80 ring-1 ring-slate-200/80 lg:grid-cols-4",
        className,
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col-reverse justify-end gap-1.5 bg-surface p-5 sm:p-6">
          <dt className="text-sm leading-snug text-slate-500 sm:text-[15px]">{fact.label}</dt>
          <dd className="font-display text-[1.75rem] font-semibold leading-none text-teal-800 sm:text-4xl">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A big “ in the quote face, for the top of a quotation. */
export function QuoteMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("font-quote block select-none text-7xl leading-[0.6] text-accent-500 not-italic", className)}
    >
      “
    </span>
  );
}

/** One of the team's own sentences, set large in the quote face. */
export function PullQuote({
  quote,
  name,
  role,
  image,
  to,
  tone = "default",
  size = "lg",
  className,
}: {
  quote: string;
  name: string;
  role?: string;
  image?: string;
  /** Their page, for "read more". */
  to?: { slug: string };
  tone?: "default" | "light";
  size?: "md" | "lg";
  className?: string;
}) {
  const light = tone === "light";
  const caption = (
    <>
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          className={cn("h-12 w-12 shrink-0 rounded-full object-cover", light ? "ring-2 ring-white/25" : "ring-2 ring-brand-100")}
        />
      )}
      <span className="min-w-0">
        <span className={cn("block font-semibold", light ? "text-white" : "text-slate-900")}>{name}</span>
        {role && <span className={cn("block text-sm", light ? "text-white/65" : "text-slate-500")}>{role}</span>}
      </span>
    </>
  );
  return (
    <figure className={className}>
      <QuoteMark className={light ? "text-accent-500" : undefined} />
      <blockquote
        className={cn(
          "font-quote mt-3 text-balance italic leading-[1.25]",
          size === "lg" ? "text-[1.6rem] sm:text-3xl lg:text-[2.25rem]" : "text-xl sm:text-2xl",
          light ? "text-white" : "text-teal-800",
        )}
      >
        {quote}
      </blockquote>
      <figcaption className="mt-6">
        {to ? (
          <Link
            to="/about/$slug"
            params={{ slug: to.slug }}
            className="group inline-flex items-center gap-3 rounded-full pr-3 transition-colors"
          >
            {caption}
            <ArrowRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1",
                light ? "text-brand-300" : "text-brand-700",
              )}
              aria-hidden
            />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-3">{caption}</span>
        )}
      </figcaption>
    </figure>
  );
}

/** A tick list - what something includes. */
export function CheckList({
  items,
  tone = "default",
  className,
}: {
  items: string[];
  tone?: "default" | "light";
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              tone === "light" ? "bg-brand-400/20 text-brand-300" : "bg-brand-100 text-brand-700",
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
          <span className={cn("min-w-0 flex-1 text-[15px] leading-relaxed sm:text-base", tone === "light" ? "text-white/85" : "text-slate-700")}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Small rounded labels - the kinds of people Duleko is for, and so on. */
export function ChipList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-slate-200 bg-surface px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

// ---- Page endings ------------------------------------------------------------

/**
 * The end of every story page: where this chapter sits in the Duleko story,
 * with the next chapter as the obvious way on and the previous one beside it.
 */
export function StoryNav({ current }: { current: StoryKey }) {
  const { t, lang } = useI18n();
  const index = STORY.findIndex((c) => c.key === current);
  const prev = index > 0 ? STORY[index - 1] : null;
  const next = index < STORY.length - 1 ? STORY[index + 1] : null;
  // The last chapter hands the reader back to the first.
  const onward = next ?? STORY[0];

  return (
    <section className="border-t border-slate-200/70 bg-paper py-12 sm:py-16" aria-label={t("storyContinue")}>
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <Eyebrow>{t("storyLabel")}</Eyebrow>
            <p className="font-display text-2xl font-semibold text-teal-800 sm:text-3xl">
              {t("storyChapterOf", { n: formatNumber(index + 1, lang), total: formatNumber(STORY.length, lang) })}
            </p>

            {/* Phones: a progress line. Desktop: the full list of chapters. */}
            <ol className="mt-5 flex gap-1.5 lg:hidden" aria-label={t("storyChapters")}>
              {STORY.map((chapter, i) => (
                <li key={chapter.key} className="flex-1">
                  <Link
                    to={chapter.to}
                    aria-label={t("storyChapter", { n: i + 1, title: t(chapter.titleKey) })}
                    aria-current={i === index ? "step" : undefined}
                    className={cn(
                      "block h-1.5 rounded-full transition-colors",
                      i < index && "bg-brand-600",
                      i === index && "bg-accent-500",
                      i > index && "bg-slate-200 hover:bg-slate-300",
                    )}
                  />
                </li>
              ))}
            </ol>
            <ol className="mt-6 hidden space-y-0.5 lg:block" aria-label={t("storyChapters")}>
              {STORY.map((chapter, i) => (
                <li key={chapter.key}>
                  <Link
                    to={chapter.to}
                    aria-current={i === index ? "step" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-1.5 text-[15px] transition-colors",
                      i === index ? "bg-surface font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display w-6 text-sm tabular-nums",
                        i === index ? "text-accent-600" : i < index ? "text-brand-600" : "text-slate-400",
                      )}
                    >
                      {twoDigits(i + 1, lang)}
                    </span>
                    {t(chapter.titleKey)}
                    {i === index && (
                      <span className="ml-auto text-xs font-medium text-slate-400">{t("storyYouAreHere")}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to={onward.to}
              className="band group relative flex min-h-56 flex-1 flex-col justify-between overflow-hidden rounded-3xl bg-teal-800 p-6 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-8"
            >
              <RidgeLines className="text-white/[0.06]" seed={index + 5} lines={10} />
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
                aria-hidden
              />
              <span className="relative flex items-center justify-between gap-3 text-sm font-semibold text-brand-300">
                <span>
                  {next ? `${t("storyNext")} · ${twoDigits(index + 2, lang)}` : t("storyBackToStart")}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-teal-800 transition-transform group-hover:translate-x-1 dark:bg-brand-600 dark:text-white">
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </span>
              </span>
              <span className="relative mt-8 block">
                <span className="font-display block text-balance text-2xl font-semibold leading-tight sm:text-3xl">
                  {t(onward.titleKey)}
                </span>
                <span className="mt-2 block max-w-md text-[15px] leading-relaxed text-white/70">{t(onward.teaserKey)}</span>
              </span>
            </Link>
            {prev && (
              <Link
                to={prev.to}
                className={cn(CARD, CARD_HOVER, "group flex items-center gap-4 p-4 sm:p-5")}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform group-hover:-translate-x-0.5">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-slate-500">{t("storyPrevious")}</span>
                  <span className="block truncate font-semibold text-slate-900">{t(prev.titleKey)}</span>
                </span>
              </Link>
            )}
          </div>
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
    <section className="border-t border-slate-200/70 bg-paper py-12 sm:py-16" aria-label={t("keepReading")}>
      <Container>
        <Eyebrow>{t("keepReading")}</Eyebrow>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {links.map((link) => (
            <Link
              key={`${link.to}${link.hash ?? ""}`}
              to={link.to}
              hash={link.hash}
              className={cn(CARD, CARD_HOVER, "group flex items-start justify-between gap-4 p-5 sm:p-6")}
            >
              <span className="min-w-0">
                <span className="font-display block text-xl font-semibold text-slate-900 sm:text-2xl">{link.title}</span>
                <span className="mt-1.5 block text-[15px] leading-relaxed text-slate-500">{link.teaser}</span>
              </span>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Closes Home and every inner page: the big invitation, and the Android app. */
export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="bg-paper pb-12 pt-2 sm:pb-16">
      <Container>
        <div className="band relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-teal-800 px-6 py-12 text-white shadow-[0_40px_80px_-40px_rgb(12_60_72/0.6)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <RidgeLines className="text-white/[0.07]" seed={7} />
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
            aria-hidden
          />
          <BrandWatermark className="-bottom-10 -right-10 h-52 w-52 sm:h-64 sm:w-64 lg:bottom-auto lg:right-[3%] lg:top-1/2 lg:h-80 lg:w-80 lg:-translate-y-1/2" />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <Eyebrow tone="light">{t("finalCtaEyebrow")}</Eyebrow>
              <h2 className="font-display max-w-2xl text-balance text-[2rem] font-semibold leading-[1.06] sm:text-[2.6rem] lg:text-5xl">
                {t("finalCtaTitle")}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-50/85 sm:text-lg">{t("finalCtaBody")}</p>
              <div className="mt-7">
                <PrimaryCtas onDark closing />
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <p lang="ne" className="text-2xl font-semibold leading-snug text-brand-200 sm:text-3xl lg:text-right">
                {NEPALI_TAGLINE}
              </p>
              {/* The Android app already is the app - no point offering it there. */}
              {!IS_NATIVE_APP && (
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener"
                  className="group inline-flex items-center gap-3 self-start rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-black/35 lg:self-end"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0c3c48]">
                    <Play className="h-5 w-5 fill-current" aria-hidden />
                  </span>
                  <span className="text-left">
                    <span className="block text-xs text-white/70">{t("playStoreSub")}</span>
                    <span className="block font-semibold">{t("playStoreTitle")}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-white/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
