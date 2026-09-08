import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber, skillName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SkillIcon, SkillTile } from "./SkillIcon";
import type { Skill } from "@/lib/types";

export function SkillGrid({
  skills,
  counts,
}: {
  skills: Skill[];
  counts?: Record<string, number>;
}) {
  const { lang } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
      {skills.map((skill) => (
        <Link
          key={skill.id}
          to="/search"
          search={{ skill: skill.id }}
          className="group flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          <SkillTile skillId={skill.id} />
          <span className="text-xs font-medium leading-tight text-slate-700">
            {skillName(skill, lang)}
          </span>
          {counts && counts[skill.id] ? (
            // Neutral on purpose: it is a count, not a status, and the
            // trade's own accent above it is the only colour the tile needs.
            <Badge tone="neutral" className="bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {formatNumber(counts[skill.id], lang)}
            </Badge>
          ) : null}
        </Link>
      ))}
    </div>
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
  const { lang } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
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
  );
}
