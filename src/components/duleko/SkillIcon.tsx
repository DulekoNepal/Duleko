import {
  BookOpen,
  BrickWall,
  Car,
  ChefHat,
  Droplets,
  Flame,
  HardHat,
  Hammer,
  Laptop,
  Paintbrush,
  Scissors,
  Smartphone,
  SprayCan,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One icon and one accent per skill, chosen to read as the trade itself:
 * a spark for the electrician, a wrench for the mechanic, a chef's hat
 * for the cook - each in a colour the trade already suggests, so the
 * grid is scannable at a glance rather than a wall of one green.
 *
 * Keyed on skills.id, which is a stable slug - not on the name, which is
 * translated. The `emoji` column stays in the database as a hint when
 * seeding a skill, but nothing in the UI renders it any more.
 *
 * Class strings are written out in full so Tailwind can see them; built
 * from fragments they would be stripped from the stylesheet.
 */
interface SkillLook {
  icon: LucideIcon;
  /** Icon colour on a neutral surface. */
  fg: string;
  /** Soft wash behind the icon in the browse grid. */
  bg: string;
}

const SKILL_LOOK: Record<string, SkillLook> = {
  electrician: { icon: Zap, fg: "text-amber-600", bg: "bg-amber-50" },
  it_computer: { icon: Laptop, fg: "text-indigo-600", bg: "bg-indigo-50" },
  plumber: { icon: Droplets, fg: "text-sky-600", bg: "bg-sky-50" },
  mobile_repair: { icon: Smartphone, fg: "text-violet-600", bg: "bg-violet-50" },
  carpenter: { icon: Hammer, fg: "text-orange-600", bg: "bg-orange-50" },
  mason: { icon: BrickWall, fg: "text-stone-600", bg: "bg-stone-100" },
  painter: { icon: Paintbrush, fg: "text-pink-600", bg: "bg-pink-50" },
  mechanic: { icon: Wrench, fg: "text-slate-600", bg: "bg-slate-100" },
  farm_worker: { icon: Wheat, fg: "text-lime-600", bg: "bg-lime-50" },
  labourer: { icon: HardHat, fg: "text-yellow-600", bg: "bg-yellow-50" },
  driver: { icon: Car, fg: "text-blue-600", bg: "bg-blue-50" },
  tutor: { icon: BookOpen, fg: "text-teal-600", bg: "bg-teal-50" },
  tailor: { icon: Scissors, fg: "text-purple-600", bg: "bg-purple-50" },
  cleaner: { icon: SprayCan, fg: "text-cyan-600", bg: "bg-cyan-50" },
  cook: { icon: ChefHat, fg: "text-rose-600", bg: "bg-rose-50" },
  welder: { icon: Flame, fg: "text-red-600", bg: "bg-red-50" },
};

/** "Others", and anything added later, gets a neutral work mark. */
const FALLBACK: SkillLook = { icon: Hammer, fg: "text-slate-600", bg: "bg-slate-100" };

export function skillLook(skillId: string): SkillLook {
  return SKILL_LOOK[skillId] ?? FALLBACK;
}

export function SkillIcon({
  skillId,
  className,
  /**
   * Takes the colour of whatever it sits in. Used inside filled pills and
   * brand badges, where the skill's own accent would fight the container.
   */
  inherit = false,
}: {
  skillId: string;
  className?: string;
  inherit?: boolean;
}) {
  const { icon: Icon, fg } = skillLook(skillId);
  return <Icon className={cn("h-4 w-4 shrink-0", !inherit && fg, className)} aria-hidden />;
}

/**
 * The standard way a skill appears as a label. Deliberately neutral -
 * white with a hairline border - so the only colour on it is the trade's
 * own accent. A brand-filled pill would both bury that accent and put a
 * second green next to it.
 */
export function SkillChip({
  skillId,
  children,
  compact = false,
  className,
}: {
  skillId: string;
  children: React.ReactNode;
  /** Tighter, for the dense worker cards in a results list. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white font-medium text-slate-700",
        compact ? "gap-1 px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <SkillIcon skillId={skillId} className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {children}
    </span>
  );
}

/** The larger, washed tile used in the browse grid. */
export function SkillTile({ skillId, className }: { skillId: string; className?: string }) {
  const { icon: Icon, fg, bg } = skillLook(skillId);
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110",
        bg,
        className,
      )}
    >
      <Icon className={cn("h-[22px] w-[22px]", fg)} />
    </span>
  );
}
