import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ChevronDown, HeartHandshake, Wrench, type LucideIcon } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { Card, CardBody } from "@/components/ui/card";
import { cn, formatNumber, skillName } from "@/lib/utils";
import { SkillIcon } from "./SkillIcon";
import type { Skill, SkillCategory } from "@/lib/types";

/** Home shows this many per category before "see all" takes over - one
 * row on desktop, two on a phone. */
const HOME_PREVIEW_COUNT = 8;

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
}: {
  skills: Skill[];
  counts?: Record<string, number>;
  /** Overrides the column count, e.g. more columns on wider screens. */
  className?: string;
}) {
  const { lang } = useI18n();
  return (
    <div className={cn("grid grid-cols-4 gap-1", className)}>
      {skills.map((skill) => (
        <Link
          key={skill.id}
          to="/search"
          search={{ skill: skill.id }}
          className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
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
 * Home's skill directory: one card, a tab per category, and a grid that
 * widens with the screen (4 columns on a phone, 6 on a tablet, 8 on a
 * wide desktop) instead of three stacked cards of four. Shows one desktop row
 * per category until "see all" expands it in place - orange stays the one
 * spot of emphasis, on that toggle alone.
 */
export function SkillCategoryBrowser({
  skillsByCategory,
  counts,
}: {
  skillsByCategory: Record<SkillCategory, Skill[]>;
  counts?: Record<string, number>;
}) {
  const { t, lang } = useI18n();
  const categories = SKILL_CATEGORY_ORDER.filter((c) => skillsByCategory[c].length > 0);
  const [active, setActive] = useState<SkillCategory>(categories[0] ?? "trades");
  const [expanded, setExpanded] = useState(false);

  if (categories.length === 0) return null;

  const current = categories.includes(active) ? active : categories[0];
  const skills = skillsByCategory[current];
  const hasMore = skills.length > HOME_PREVIEW_COUNT;
  const visible = expanded ? skills : skills.slice(0, HOME_PREVIEW_COUNT);

  return (
    <Card className="overflow-hidden">
      <div
        role="tablist"
        aria-label={t("browseSkills")}
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-1.5"
      >
        {categories.map((category) => {
          const Icon = SKILL_CATEGORY_ICON[category];
          const selected = category === current;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="skill-category-panel"
              onClick={() => {
                setActive(category);
                setExpanded(false);
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 sm:flex-1 sm:justify-center",
                selected
                  ? "bg-white text-brand-800 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-brand-700" : "text-slate-400")} aria-hidden />
              {t(SKILL_CATEGORY_LABEL[category])}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-semibold leading-5",
                  selected ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500",
                )}
              >
                {formatNumber(skillsByCategory[category].length, lang)}
              </span>
            </button>
          );
        })}
      </div>
      <CardBody id="skill-category-panel" role="tabpanel" className="px-2 pb-2 pt-2 sm:px-3">
        <SkillGrid skills={visible} counts={counts} className="sm:grid-cols-6 lg:grid-cols-8" />
        {hasMore && (
          <div className="flex justify-center border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-accent-600 transition-colors duration-200 hover:bg-accent-50 hover:text-accent-700"
            >
              {expanded ? t("showLess") : t("seeAll")}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
          </div>
        )}
      </CardBody>
    </Card>
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
