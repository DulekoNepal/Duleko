import type { CSSProperties } from "react";
import { Briefcase, Calendar, Compass, LogIn, MapPin, Users } from "lucide-react";
import { LanguageToggle } from "./Layout";
import { useI18n, type StringKey } from "@/lib/i18n";
import dulekoMark from "@/assets/duleko-mark.png";

// Same four ideas as the in-app WelcomeWalkthrough - reusing that copy here
// means a first-time visitor and a first-time member see the same story.
const FEATURES: { icon: typeof MapPin; titleKey: StringKey; bodyKey: StringKey }[] = [
  { icon: MapPin, titleKey: "walkthroughTitle1", bodyKey: "walkthroughBody1" },
  { icon: Briefcase, titleKey: "walkthroughTitle2", bodyKey: "walkthroughBody2" },
  { icon: Users, titleKey: "walkthroughTitle3", bodyKey: "walkthroughBody3" },
  { icon: Calendar, titleKey: "walkthroughTitle4", bodyKey: "walkthroughBody4" },
];

/**
 * The very first screen anyone sees: a proper landing page (what Duleko is,
 * what you can do on it) ending in the one real decision - look around
 * first, or go straight to an account. "Explore" drops them into the real
 * home screen as a guest, not a demo; signing in only comes up later, the
 * moment they try to do something that needs an account.
 */
export function WelcomeChoiceScreen({
  onExplore,
  onSignIn,
}: {
  onExplore: () => void;
  onSignIn: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-cream-50">
      {/* ---- Hero band: brand-color gradient, two soft blobs for texture ---- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-teal-800 pb-16 pt-[env(safe-area-inset-top)]">
        <div
          className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-brand-300/20 blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-sm justify-end px-5 pt-4 sm:max-w-2xl lg:max-w-4xl">
          <LanguageToggle />
        </div>

        <div className="animate-in-up relative mx-auto mt-5 max-w-sm px-7 text-center sm:max-w-lg">
          <img
            src={dulekoMark}
            alt=""
            className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg md:h-20 md:w-20"
          />
          <h1 className="text-2xl font-bold text-white md:text-3xl">{t("authWelcome")}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-brand-50/90 sm:max-w-sm md:text-base">
            {t("authBlurb")}
          </p>
        </div>
      </div>

      {/* ---- Content panel: overlaps the hero for one continuous page ---- */}
      <div className="relative mx-auto -mt-8 w-full max-w-sm rounded-t-[2rem] bg-cream-50 px-6 pb-14 pt-7 sm:max-w-2xl lg:max-w-4xl">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("howDulekoWorks")}
        </p>
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          style={{ "--delay": "60ms" } as CSSProperties}
        >
          {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div
              key={titleKey}
              className="animate-in-up rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p className="text-sm font-semibold leading-snug text-slate-900">{t(titleKey)}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{t(bodyKey)}</p>
            </div>
          ))}
        </div>

        {/* ---- The one decision this screen exists for - primary + secondary, both always available ---- */}
        <div className="mx-auto mt-7 max-w-sm space-y-2.5 sm:flex sm:max-w-none sm:gap-3 sm:space-y-0">
          <button
            type="button"
            onClick={onSignIn}
            className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-brand-700 px-4 py-3.5 text-center shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-lg active:translate-y-0 sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-2 text-base font-semibold text-white">
              <LogIn className="h-4.5 w-4.5" aria-hidden />
              {t("signUpOrLogIn")}
            </span>
            <span className="text-xs text-brand-50/85">{t("signUpOrLogInHint")}</span>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="flex w-full flex-col items-center gap-0.5 rounded-2xl border-2 border-brand-700 bg-white px-4 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md active:translate-y-0 sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-2 text-base font-semibold text-brand-800">
              <Compass className="h-4.5 w-4.5" aria-hidden />
              {t("exploreDuleko")}
            </span>
            <span className="text-xs text-slate-500">{t("exploreDulekoHint")}</span>
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">{t("landingFreeNote")}</p>
      </div>
    </div>
  );
}
