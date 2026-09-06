import { useState } from "react";
import { Briefcase, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const SEEN_KEY = "duleko_walkthrough_seen_v1";

export function hasSeenWalkthrough(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage unavailable — don't nag every render
  }
}

function markWalkthroughSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ignore — not worth blocking on
  }
}

const SLIDES = [
  { icon: MapPin, titleKey: "walkthroughTitle1", bodyKey: "walkthroughBody1" },
  { icon: Briefcase, titleKey: "walkthroughTitle2", bodyKey: "walkthroughBody2" },
  { icon: Users, titleKey: "walkthroughTitle3", bodyKey: "walkthroughBody3" },
  { icon: Calendar, titleKey: "walkthroughTitle4", bodyKey: "walkthroughBody4" },
] as const;

/** A 4-slide "how this app works" carousel, shown once per device, skippable any time. */
export function WelcomeWalkthrough({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  function finish() {
    markWalkthroughSeen();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t("skip")}
          </button>
        </div>

        <div className="mt-2 flex flex-col items-center text-center">
          <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon className="h-8 w-8" aria-hidden />
          </span>
          <h2 className="text-lg font-bold text-slate-900">{t(slide.titleKey)}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(slide.bodyKey)}</p>
        </div>

        <div className="my-6 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-brand-600" : "w-1.5 bg-slate-200")}
            />
          ))}
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            if (isLast) finish();
            else setStep((s) => s + 1);
          }}
        >
          {isLast ? t("getStarted") : t("next")}
        </Button>
      </div>
    </div>
  );
}
