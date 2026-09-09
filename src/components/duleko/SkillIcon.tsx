import {
  Bike,
  BrickWall,
  Briefcase,
  Brush,
  Calculator,
  Camera,
  Car,
  Cog,
  CookingPot,
  Droplets,
  Dumbbell,
  Flame,
  GraduationCap,
  Hammer,
  HardHat,
  HeartHandshake,
  Laptop,
  Music,
  Paintbrush,
  PenTool,
  Plus,
  Ruler,
  Scale,
  Scissors,
  Shirt,
  Smartphone,
  Sparkles,
  Stethoscope,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One icon per skill, and one colour for all of them.
 *
 * Every icon here is a lucide outline glyph, so they share a stroke
 * weight, a corner radius and a set of round line caps by construction -
 * nothing filled sits next to something outlined. Colour is Deep Navy
 * throughout: giving each trade its own hue turned the grid into a dozen
 * competing mini-brands, which is exactly what a marketplace should not
 * look like. Orange is reserved for emphasis the app chooses, never for
 * telling one skill apart from another.
 *
 * Keyed on skills.id, a stable slug, not on the translated name.
 */
const SKILL_ICON: Record<string, LucideIcon> = {
  // Trades & local services
  electrician: Zap,
  plumber: Droplets,
  carpenter: Hammer,
  mason: BrickWall,
  painter: Paintbrush,
  mechanic: Wrench,
  mobile_repair: Smartphone,
  driver: Car,
  // A shirt says tailoring; scissors read as barbering, and now belong there.
  tailor: Shirt,
  // A pot is the trade; a chef's hat is a uniform.
  cook: CookingPot,
  // Shine, rather than an unrecognisable spray can.
  cleaner: Sparkles,
  welder: Flame,
  farm_worker: Wheat,
  labourer: HardHat,

  // Professional & skilled services
  it_computer: Laptop,
  health: Stethoscope,
  accountant: Calculator,
  tutor: GraduationCap,
  engineer: Ruler,
  legal: Scale,
  designer: PenTool,
  photographer: Camera,
  technician: Cog,
  consultant: Briefcase,

  // Personal & everyday services
  fitness: Dumbbell,
  barber: Scissors,
  makeup: Brush,
  music_dance: Music,
  delivery: Bike,
  care: HeartHandshake,
  other: Plus,
};

/** Anything added later falls back to a hammer rather than a blank space. */
export function skillIconFor(skillId: string): LucideIcon {
  return SKILL_ICON[skillId] ?? Hammer;
}

/**
 * The one stroke weight every skill icon uses. Lucide's default is 2,
 * which reads heavy at the sizes these appear at.
 */
const STROKE = 1.75;

export function SkillIcon({
  skillId,
  className,
  inherit = false,
}: {
  skillId: string;
  className?: string;
  /**
   * Takes the colour of whatever it sits in, instead of navy. Used on a
   * filled surface - the selected picker pill - where navy would fight
   * the fill rather than read against it.
   */
  inherit?: boolean;
}) {
  const Icon = skillIconFor(skillId);
  return (
    <Icon
      className={cn("h-4 w-4 shrink-0", !inherit && "text-navy-700", className)}
      strokeWidth={STROKE}
      aria-hidden
    />
  );
}

/**
 * A larger, neutral tile for a skill icon - one flat wash, the same for
 * every skill, used where a row wants a leading icon slot (the profile's
 * own skills list). The browse grid on Home deliberately skips this: an
 * outline icon straight on the card's own background is what actually
 * reads as "one clean icon set" rather than "icons in boxes".
 */
export function SkillTile({ skillId, className }: { skillId: string; className?: string }) {
  const Icon = skillIconFor(skillId);
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px] text-navy-700" strokeWidth={STROKE} />
    </span>
  );
}

/**
 * A skill as a label. Neutral by design - the icon carries the navy, and
 * nothing else on the chip competes with it.
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
      <SkillIcon skillId={skillId} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {children}
    </span>
  );
}
