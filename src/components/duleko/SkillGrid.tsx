import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, ChevronDown, HeartHandshake, Wrench, type LucideIcon } from "lucide-react";
import { useI18n, type StringKey } from "@/lib/i18n";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { cn, formatNumber, skillName } from "@/lib/utils";
import { SkillIcon } from "./SkillIcon";
import type { Skill, SkillCategory } from "@/lib/types";

/** Home shows this many per category before "view all" takes over. */
const HOME_PREVIEW_COUNT = 4;

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
}: {
  skills: Skill[];
  counts?: Record<string, number>;
}) {
  const { lang } = useI18n();
  return (
    <div className="grid grid-cols-4 gap-1">
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
 * One category, as its own card - the same "bordered white block on the
 * page's own grey" every other screen already uses for a section, rather
 * than Home being the one place where content sits directly on the
 * background with nothing to separate one group from the next.
 *
 * Shows the first four skills, and - only once there are more than four -
 * a "view all" that expands the same grid in place. Orange is the one
 * spot of emphasis, on that link alone, so it reads as "there's more
 * here" without turning the card itself into another coloured block.
 */
export function SkillCategorySection({
  category,
  skills,
  counts,
}: {
  category: SkillCategory;
  skills: Skill[];
  counts?: Record<string, number>;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (skills.length === 0) return null;

  const hasMore = skills.length > HOME_PREVIEW_COUNT;
  const visible = expanded ? skills : skills.slice(0, HOME_PREVIEW_COUNT);

  return (
    <Card>
      <CardBody>
        <SectionTitle
          action={
            hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-accent-600 transition-colors duration-200 hover:text-accent-700"
              >
                {expanded ? t("showLess") : t("seeAll")}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
            )
          }
        >
          <span className="inline-flex items-center gap-2">
            <SectionIcon icon={SKILL_CATEGORY_ICON[category]} />
            {t(SKILL_CATEGORY_LABEL[category])}
          </span>
        </SectionTitle>
        <SkillGrid skills={visible} counts={counts} />
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
