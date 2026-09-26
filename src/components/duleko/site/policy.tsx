import { Info, Mail } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { CONTACT_EMAIL } from "./actions";

/**
 * Building blocks for the long policy pages (Privacy, Terms, Registration): numbered
 * sections with a table of contents beside them, and the contact card that
 * closes them. The copy is bilingual through i18n.
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
    <p className="flex gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
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
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
      <Icon className="h-4 w-4 text-brand-600" aria-hidden />
      {children}
    </span>
  );
}

/**
 * The policy itself. Desktop keeps the contents list pinned beside the
 * text; phones get it as a row of chips to swipe through above it.
 */
export function PolicySections({ sections }: { sections: PolicySection[] }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
      <nav aria-label={t("onThisPage")} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{t("onThisPage")}</p>
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {sections.map((section, i) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-800 lg:whitespace-normal lg:rounded-lg lg:border-0 lg:px-2.5 lg:py-2 lg:hover:bg-brand-50"
              >
                <span className="text-xs font-semibold tabular-nums text-brand-600">{i + 1}</span>
                {stripNumber(section.title)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="divide-y divide-slate-100">
        {sections.map((section, i) => (
          <article key={section.id} id={section.id} className="scroll-mt-24 py-8 first:pt-0 last:pb-0 sm:py-10">
            <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-teal-800 sm:text-2xl">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold tabular-nums text-brand-700">
                {i + 1}
              </span>
              {stripNumber(section.title)}
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600 sm:text-[17px] sm:leading-8">
              {section.body}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PolicyContact({ questionKey }: { questionKey: StringKey }) {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-teal-800">{t("contactUs")}</h2>
            <p className="mt-1.5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t(questionKey)}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-700 hover:underline">
                {t("contactEmail")}
              </a>
              .
            </p>
          </div>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {t("emailUs")}
        </a>
      </div>
    </div>
  );
}
