import { Link } from "@tanstack/react-router";
import { Briefcase, ChevronDown, HeartHandshake, Wrench, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { cn, formatNumber, skillName } from "@/lib/utils";
import { SkillIcon } from "./SkillIcon";
import type { Skill, SkillCategory } from "@/lib/types";

export const SKILL_CATEGORY_ORDER: SkillCategory[] = ["trades", "professional", "personal"];

const SKILL_CATEGORY_LABEL: Record<SkillCategory, StringKey> = {
  trades: "skillCategoryTrades",
  professional: "skillCategoryProfessional",
  personal: "skillCategoryPersonal",
};

/** One glyph per category, from the same outline family as the skills
 * themselves - a spanner for trades, a briefcase for the office-shaped
 * work, a handshake for everything personal. */
const SKILL_CATEGORY_ICON: Record<SkillCategory, LucideIcon> = {
  trades: Wrench,
  professional: Briefcase,
  personal: HeartHandshake,
};

/** Splits a flat, sort_order-sorted list into its three categories. */
export function groupSkillsByCategory(skills: Skill[]): Record<SkillCategory, Skill[]> {
  const groups: Record<SkillCategory, Skill[]> = { trades: [], professional: [], personal: [] };
  for (const skill of skills) {
    (groups[skill.category] ?? groups.trades).push(skill);
  }
  return groups;
}

/**
 * A bare grid of icon-and-label cells - no per-item box, no per-item
 * colour. That is what actually reads as "one clean icon set" the way
 * eSewa's own utility grid does, rather than a wall of pastel tiles.
 */
export function SkillGrid({
  skills,
  counts,
  className,
  twoRows = false,
}: {
  skills: Skill[];
  counts?: Record<string, number>;
  /** Overrides the column count, e.g. more columns on wider screens. */
  className?: string;
  /**
   * Show just the first two rows of the 4 / 6 / 8-column grid (8 skills on
   * a phone, 12 on a tablet, 16 on a desktop). Done with CSS per item, so
   * it follows the column count exactly without measuring anything.
   */
  twoRows?: boolean;
}) {
  const { lang } = useI18n();
  return (
    <div className={cn("grid grid-cols-4 gap-1", className)}>
      {skills.map((skill, i) => (
        <Link
          key={skill.id}
          to="/search"
          search={{ skill: skill.id }}
          className={cn(
            "group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2",
            twoRows && i >= 16 && "hidden",
            twoRows && i >= 12 && i < 16 && "max-lg:hidden",
            twoRows && i >= 8 && i < 12 && "max-sm:hidden",
          )}
        >
          <SkillIcon skillId={skill.id} className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700">
            {skillName(skill, lang)}
          </span>
          {counts && counts[skill.id] ? (
            <span className="text-[10px] font-medium text-slate-400">
              {formatNumber(counts[skill.id], lang)}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/**
 * Home's skill directory: the three categories as three plain sections,
 * one under the other - no tabs, no sideways scrolling. Each opens on two
 * rows of its grid (4 columns on a phone, 6 on a tablet, 8 on a desktop)
 * with a "See more" in the section's own icon colour to show the rest.
 * The section's "See all" (on Home) still opens Search.
 */
export function SkillCategoryBrowser({
  skillsByCategory,
  counts,
}: {
  skillsByCategory: Record<SkillCategory, Skill[]>;
  counts?: Record<string, number>;
}) {
  const categories = SKILL_CATEGORY_ORDER.filter((c) => skillsByCategory[c].length > 0);
  if (categories.length === 0) return null;

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <SkillCategorySection
          key={category}
          category={category}
          skills={skillsByCategory[category]}
          counts={counts}
        />
      ))}
    </div>
  );
}

function SkillCategorySection({
  category,
  skills,
  counts,
}: {
  category: SkillCategory;
  skills: Skill[];
  counts?: Record<string, number>;
}) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const Icon = SKILL_CATEGORY_ICON[category];
  const n = skills.length;
  // "See more" only where two rows actually hide something: more than 8 on
  // a phone, 12 on a tablet, 16 on a desktop.
  const toggleVisibility = n > 16 ? "" : n > 12 ? "lg:hidden" : n > 8 ? "sm:hidden" : null;

  return (
    <section
      aria-labelledby={`skill-category-${category}`}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <h3
        id={`skill-category-${category}`}
        className="flex items-center gap-2 px-4 pt-3.5 text-sm font-semibold text-slate-800"
      >
        <Icon className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <span className="min-w-0 truncate">{t(SKILL_CATEGORY_LABEL[category])}</span>
        <span className="shrink-0 text-xs font-medium text-slate-400">{formatNumber(n, lang)}</span>
      </h3>
      <SkillGrid
        skills={skills}
        counts={counts}
        twoRows={!expanded}
        className="px-2 pb-2 pt-1 sm:grid-cols-6 lg:grid-cols-8"
      />
      {toggleVisibility !== null && (
        <div className={cn("flex justify-center border-t border-slate-100 py-1.5", toggleVisibility)}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-800"
          >
            {expanded ? t("showLess") : t("seeMore")}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      )}
    </section>
  );
}

/** Multi-select chips used during onboarding and profile editing. */
export function SkillPicker({
  skills,
  selected,
  onToggle,
}: {
  skills: Skill[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  const groups = groupSkillsByCategory(skills);

  return (
    <div className="space-y-4">
      {SKILL_CATEGORY_ORDER.map((category) => {
        const group = groups[category];
        if (group.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t(SKILL_CATEGORY_LABEL[category])}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.map((skill) => {
                const active = selected.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onToggle(skill.id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 active:scale-[0.97]",
                      active
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-brand-300",
                    )}
                  >
                    <SkillIcon skillId={skill.id} className="h-3.5 w-3.5" inherit={active} />
                    {skillName(skill, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
