import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { HeaderToggles } from "./Layout";
import { SkillIcon } from "./SkillIcon";
import { siteSkill } from "./site/skills";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import dulekoMark from "@/assets/duleko-mark.webp";

/**
 * Six skills around the mark, one from each corner of Duleko: trades,
 * professional work and everyday help. Placed by angle on the outer ring,
 * clockwise from the top.
 */
const ORBIT: { id: string; angle: number }[] = [
  { id: "electrician", angle: -90 },
  { id: "tutor", angle: -30 },
  { id: "cook", angle: 30 },
  { id: "farm_worker", angle: 90 },
  { id: "driver", angle: 150 },
  { id: "barber", angle: 210 },
];

/**
 * The first screen anyone sees in the Android app (the web shows the full
 * website - LandingPage - instead). Deliberately quiet: the mark, one line
 * on what Duleko is, and the one real decision - an account, or look
 * around first. "Explore" drops them into the real home screen as a guest;
 * signing in only comes up later, the moment they try something that needs
 * an account. How it all works is the walkthrough's job, after sign-up.
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
    // White to match the status bar above it (see setStatusBarTheme).
    <div className="flex min-h-dvh flex-col bg-white pb-[calc(var(--sab)+1.25rem)] pt-[var(--sat)] dark:bg-cream-50">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-3">
        <span className="font-display text-lg font-bold text-slate-900">
          Duleko
          <span className="mx-1.5 font-normal text-slate-300" aria-hidden>
            |
          </span>
          <span lang="ne" className="font-semibold text-slate-500">
            डुलेको
          </span>
        </span>
        <HeaderToggles className="h-9" />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-4 text-center">
        <SkillOrbit />
        <h1 className="animate-in-up font-display mt-6 text-balance text-[1.9rem] font-semibold leading-[1.1] text-slate-900">
          {t("homeHeroTitle")}
        </h1>
        <p
          className="animate-in-up mt-3 max-w-xs text-[15px] leading-relaxed text-slate-500"
          style={{ "--delay": "60ms" } as CSSProperties}
        >
          {t("authBlurb")}
        </p>
      </main>

      <div
        className="animate-in-up mx-auto w-full max-w-md space-y-3 px-6"
        style={{ "--delay": "120ms" } as CSSProperties}
      >
        <Button size="lg" className="h-12 w-full rounded-2xl text-base font-semibold" onClick={onSignIn}>
          {t("signUpOrLogIn")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-2xl text-base font-semibold"
          onClick={onExplore}
        >
          {t("exploreDuleko")}
        </Button>
        <p className="pt-1 text-center text-xs text-slate-400">{t("landingFreeNote")}</p>
      </div>
    </div>
  );
}

/**
 * The mark on a soft green disc, with a few skills resting on a ring around
 * it. Sized by the screen's height too, so a small phone still fits the
 * whole welcome screen without scrolling.
 */
function SkillOrbit() {
  return (
    // The ring sits half a skill bubble in from the edge, so the bubbles stay inside.
    <div className="relative aspect-square w-[min(72vw,33dvh,18rem)] p-[1.375rem]" aria-hidden>
      <div className="relative h-full w-full">
        <span className="absolute inset-0 rounded-full border border-dashed border-brand-700/20" />
        <span className="absolute inset-[17%] rounded-full bg-brand-50" />
        <img
          src={dulekoMark}
          alt=""
          className="absolute inset-[31%] h-[38%] w-[38%] rounded-[28%] object-cover shadow-lg shadow-brand-900/15"
        />
        {ORBIT.map(({ id, angle }, i) => {
          const radians = (angle * Math.PI) / 180;
          return (
            <span
              key={id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + 50 * Math.cos(radians)}%`, top: `${50 + 50 * Math.sin(radians)}%` }}
            >
              <span
                className="animate-in-up flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-surface shadow-sm"
                style={{ "--delay": `${80 + i * 40}ms` } as CSSProperties}
              >
                <SkillIcon skillId={id} category={siteSkill(id).category} className="h-5 w-5" />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
