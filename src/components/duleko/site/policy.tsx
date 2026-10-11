import { useEffect, useState } from "react";
import { Info, Mail } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import { CONTACT_EMAIL } from "./actions";
import { RidgeLines } from "./ui";

/**
 * Building blocks for the long policy pages (Privacy, Terms, Registration):
 * numbered sections with a contents list beside them that follows the
 * reader, and the contact card that closes them. The copy is bilingual
 * through i18n.
 */

export interface PolicySection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Section titles carry their number ("1. …" / "१. …"); the badge shows it instead. */
function stripNumber(title: string): string {
  return title.replace(/^[\d०-९]+\.\s*/, "");
}

export function PolicyBullets({ keys }: { keys: StringKey[] }) {
  const { t } = useI18n();
  return (
    <ul className="space-y-2">
      {keys.map((key) => (
        <li key={key} className="flex gap-3">
          <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
          <span className="min-w-0 flex-1">{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PolicyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 rounded-xl border-l-[3px] border-brand-500 bg-brand-50/60 py-3 pl-4 pr-4 text-[15px] leading-relaxed text-slate-700">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

export function PolicyStrong({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-teal-800">{children}</p>;
}

/** Small pill under the hero intro - "Last updated", "Effective date". */
export function PolicyMeta({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 sm:text-sm">
      <Icon className="h-4 w-4 text-brand-600" aria-hidden />
      {children}
    </span>
  );
}

/** The id of the section being read: the last one whose heading has passed the top third of the screen. */
function useActiveSection(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const list = key.split(",");
    const onScroll = () => {
      const line = window.innerHeight * 0.33;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);
  return active;
}

/**
 * The policy itself. Desktop keeps the contents list pinned beside the
 * text, marking the section in view; phones get it as a row of chips to
 * swipe through above it.
 */
export function PolicySections({ sections }: { sections: PolicySection[] }) {
  const { t, lang } = useI18n();
  const active = useActiveSection(sections.map((s) => s.id));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
      <nav aria-label={t("onThisPage")} className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <p className="eyebrow-track mb-3 text-xs font-bold uppercase text-slate-400">{t("onThisPage")}</p>
        <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-l lg:border-slate-200 lg:px-0">
          {sections.map((section, i) => {
            const current = section.id === active;
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
                    "lg:-ml-px lg:whitespace-normal lg:rounded-none lg:border-0 lg:border-l-2 lg:py-1.5 lg:pl-4 lg:pr-2",
                    current
                      ? "border-brand-300 bg-brand-50 font-semibold text-brand-800 lg:border-brand-600 lg:bg-transparent"
                      : "border-slate-200 text-slate-500 hover:text-slate-900 lg:border-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-xs font-semibold tabular-nums",
                      current ? "text-brand-700" : "text-slate-400",
                    )}
                  >
                    {formatNumber(String(i + 1).padStart(2, "0"), lang)}
                  </span>
                  {stripNumber(section.title)}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="max-w-3xl">
        {sections.map((section, i) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-28 border-t border-slate-200/80 py-8 first:border-t-0 first:pt-0 last:pb-0 sm:py-10"
          >
            <p className="font-display text-sm font-semibold tabular-nums text-accent-600">
              {formatNumber(String(i + 1).padStart(2, "0"), lang)}
            </p>
            <h2 className="font-display mt-1 text-balance text-2xl font-semibold leading-tight text-teal-800 sm:text-[1.75rem]">
              {stripNumber(section.title)}
            </h2>
            <div className="mt-4 space-y-4 text-base leading-[1.75] text-slate-600 sm:text-[17px]">{section.body}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PolicyContact({ questionKey }: { questionKey: StringKey }) {
  const { t } = useI18n();
  return (
    <div className="band relative overflow-hidden rounded-3xl bg-teal-800 p-6 text-white sm:p-8 lg:p-10">
      <RidgeLines className="text-white/[0.06]" seed={11} lines={9} />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-300 ring-1 ring-white/15">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-[1.75rem]">{t("contactUs")}</h2>
            <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base">
              {t(questionKey)}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-300 hover:text-white hover:underline">
                {t("contactEmail")}
              </a>
              .
            </p>
          </div>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-teal-800 shadow-md transition-colors hover:bg-brand-50 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-700"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {t("emailUs")}
        </a>
      </div>
    </div>
  );
}
