import { useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Briefcase, Calendar, Compass, LogIn, MapPin, Users } from "lucide-react";
import { HeaderToggles } from "./Layout";
import { SkillIcon } from "./SkillIcon";
import { SITE_SKILLS, siteSkillName, type SiteSkill } from "./site/skills";
import { BrandWatermark, RidgeLines } from "./site/ui";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import dulekoMark from "@/assets/duleko-mark.webp";

// Same four ideas as the in-app WelcomeWalkthrough - reusing that copy here
// means a first-time visitor and a first-time member see the same story.
const FEATURES: { icon: typeof MapPin; titleKey: StringKey; bodyKey: StringKey; tone: string }[] = [
  { icon: MapPin, titleKey: "walkthroughTitle1", bodyKey: "walkthroughBody1", tone: "bg-brand-50 text-brand-700" },
  { icon: Briefcase, titleKey: "walkthroughTitle2", bodyKey: "walkthroughBody2", tone: "bg-accent-50 text-accent-600" },
  { icon: Users, titleKey: "walkthroughTitle3", bodyKey: "walkthroughBody3", tone: "bg-navy-50 text-navy-700" },
  { icon: Calendar, titleKey: "walkthroughTitle4", bodyKey: "walkthroughBody4", tone: "bg-brand-50 text-brand-700" },
];

/**
 * The first screen anyone sees in the Android app (the web shows the full
 * website - LandingPage - instead). The top is the brand: what Duleko is in
 * one line, with every real skill on it sliding past. The bottom sheet is
 * how it works, then the one real decision - an account, or look around
 * first. "Explore" drops them into the real home screen as a guest, not a
 * demo; signing in only comes up later, the moment they try to do something
 * that needs an account.
 */
export function WelcomeChoiceScreen({
  onExplore,
  onSignIn,
}: {
  onExplore: () => void;
  onSignIn: () => void;
}) {
  const { t, lang } = useI18n();
  const half = Math.ceil(SITE_SKILLS.length / 2);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* ---- Brand band ---- */}
      <div className="band relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-800 to-teal-800 pb-12 pt-[var(--sat)] text-white">
        <RidgeLines className="text-white/[0.07]" seed={2} lines={12} />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl" aria-hidden />
        <BrandWatermark className="-right-10 top-16 h-44 w-44 md:h-60 md:w-60" />

        <div className="relative mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 pt-4">
          <span className="flex items-center gap-2.5">
            <img src={dulekoMark} alt="" className="h-9 w-9 rounded-xl object-cover shadow-md ring-2 ring-white/25" />
            <span className="font-display text-[19px] font-bold">
              Duleko
              <span className="mx-1.5 font-normal text-white/30" aria-hidden>
                |
              </span>
              <span lang="ne" className="font-semibold text-white/80">
                डुलेको
              </span>
            </span>
          </span>
          <HeaderToggles className="h-9" />
        </div>

        <div className="animate-in-up relative mx-auto max-w-2xl px-6 pt-6 sm:pt-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-2.5 pr-3 text-[13px] font-medium text-white/90 ring-1 ring-white/15 backdrop-blur">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-300" />
            </span>
            {t("heroKicker")}
          </p>
          <h1 className="font-display mt-5 text-balance text-[2.35rem] font-semibold leading-[1.02] sm:text-5xl">
            {t("homeHeroTitle")}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80 sm:text-base">{t("authBlurb")}</p>
        </div>

        {/* Every skill on Duleko, sliding past. */}
        <div className="fade-x relative mt-6 space-y-2.5" aria-hidden>
          <SkillTicker skills={SITE_SKILLS.slice(0, half)} lang={lang} />
          <SkillTicker skills={SITE_SKILLS.slice(half)} lang={lang} reverse />
        </div>
      </div>

      {/* ---- Bottom sheet: how it works, then the decision ---- */}
      <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[2rem] bg-surface pb-[calc(var(--sab)+1.25rem)] pt-5 shadow-[0_-20px_40px_-24px_rgb(12_60_72/0.35)]">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <span className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
          <p className="eyebrow-track px-6 text-xs font-bold uppercase text-brand-700">{t("howDulekoWorks")}</p>
          <FeatureCarousel />

          <div
            className="animate-in-up mt-auto space-y-2.5 px-6 pt-5 sm:flex sm:gap-3 sm:space-y-0"
            style={{ "--delay": "120ms" } as CSSProperties}
          >
            <button
              type="button"
              onClick={onSignIn}
              className="group flex w-full items-center gap-3 rounded-2xl bg-brand-700 px-4 py-3.5 text-left text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_14px_28px_-14px_rgb(21_128_61/0.75)] transition-all duration-200 active:scale-[0.99] hover:bg-brand-800 sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <LogIn className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{t("signUpOrLogIn")}</span>
                <span className="block text-[13px] leading-snug text-brand-50/85">{t("signUpOrLogInHint")}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>

            <button
              type="button"
              onClick={onExplore}
              className="group flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-left ring-1 ring-slate-200 transition-all duration-200 active:scale-[0.99] hover:bg-brand-50 hover:ring-brand-300 sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Compass className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-slate-900">{t("exploreDuleko")}</span>
                <span className="block text-[13px] leading-snug text-slate-500">{t("exploreDulekoHint")}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>

          <p className="mt-4 px-6 text-center text-xs text-slate-400">{t("landingFreeNote")}</p>
        </div>
      </div>
    </div>
  );
}

/** One row of the skills ticker: two copies slide left (or right) by one copy's width. */
function SkillTicker({ skills, lang, reverse = false }: { skills: SiteSkill[]; lang: Lang; reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden">
      <ul
        className={cn("flex w-max shrink-0", reverse ? "animate-marquee-reverse" : "animate-marquee")}
        style={{ "--duration": `${skills.length * 4}s` } as CSSProperties}
      >
        {[...skills, ...skills].map((skill, i) => (
          <li
            key={`${skill.id}-${i}`}
            className="mr-2 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/10 py-1 pl-1 pr-3.5 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface">
              <SkillIcon skillId={skill.id} category={skill.category} className="h-4 w-4" />
            </span>
            {siteSkillName(skill, lang)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The four "how it works" cards. Phones swipe through them (the next one
 * peeks in, with dots below); tablets see them all at once.
 */
function FeatureCarousel() {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.firstElementChild) return;
    const card = (el.firstElementChild as HTMLElement).offsetWidth + 12;
    setActive(Math.min(FEATURES.length - 1, Math.round(el.scrollLeft / card)));
  };

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-6 px-6 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-4"
      >
        {FEATURES.map(({ icon: Icon, titleKey, bodyKey, tone }, i) => (
          <div
            key={titleKey}
            className="animate-in-up flex w-[78%] shrink-0 snap-start flex-col rounded-2xl border border-slate-200/80 bg-paper p-4 sm:w-auto"
            style={{ "--delay": `${60 + i * 50}ms` } as CSSProperties}
          >
            <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display mt-3 text-[17px] font-semibold leading-snug text-slate-900">{t(titleKey)}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t(bodyKey)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
        {FEATURES.map((f, i) => (
          <span
            key={f.titleKey}
            className={cn("h-1.5 rounded-full transition-all duration-300", i === active ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300")}
          />
        ))}
      </div>
    </>
  );
}
