import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber, skillName } from "@/lib/utils";
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
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-3.5 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <span className="text-2xl leading-none" aria-hidden>
            {skill.emoji}
          </span>
          <span className="text-xs font-medium leading-tight text-slate-700">
            {skillName(skill, lang)}
          </span>
          {counts && counts[skill.id] ? (
            <span className="text-[11px] text-slate-400">{formatNumber(counts[skill.id], lang)}</span>
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
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-brand-300",
            )}
          >
            <span aria-hidden>{skill.emoji}</span>
            {skillName(skill, lang)}
          </button>
        );
      })}
    </div>
  );
}
