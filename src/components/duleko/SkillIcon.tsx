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
import type { SkillCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Lucide has no auto-rickshaw / tuk-tuk glyph, so this one is hand-drawn.
 * It deliberately breaks from the rest of the set's thin-stroke outlines:
 * a rickshaw's silhouette (canopy overhang, boxy cabin windows, a sloped
 * rear engine panel, wheels tucked into fender arches) is what makes it
 * read as "auto rickshaw" rather than "car" or "van", and at the 16-18px
 * this renders at, a solid silhouette holds up far better than the same
 * shape traced in hairlines - those blurred into an illegible smudge.
 * Still `currentColor`-filled rather than a hardcoded shade, so it still
 * follows navy (or inherits, on a filled surface) like every other skill
 * icon; only the fill-vs-stroke technique differs.
 */
function AutoRickshawIcon({
  className,
}: {
  className?: string;
  /** Accepted so this drops into the same `<Icon .../>` call sites as a LucideIcon, and ignored - this glyph is filled, not stroked. */
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 17 4 10Q4 8 6 8L15 8 18.8 12.8 18.9 15Q19.3 15.6 19 17A2.35 2.35 0 0 1 14.3 17L9.7 17A2.35 2.35 0 0 1 5 17L4 17Z
           M6.5 9.5H10V12.8H6.5Z
           M10.8 9.5H14.3V12.8H10.8Z
           M15.3 9.6 18.2 12.5 18.2 14.3 15.3 14.3Z"
      />
      <circle cx="6.5" cy="17.5" r="2.4" fill="currentColor" />
      <circle cx="16.5" cy="17.5" r="2.4" fill="currentColor" />
    </svg>
  );
}

/**
 * One icon per skill, coloured by its category.
 *
 * Every icon here is a lucide outline glyph (bar the hand-drawn rickshaw
 * above, built to the same rules), so they share a stroke weight, a
 * corner radius and a set of round line caps by construction - nothing
 * filled sits next to something outlined. Colour follows the category,
 * never the individual skill (a dozen hues would turn the grid into
 * competing mini-brands): see CATEGORY_ICON_CLASS below.
 *
 * Keyed on skills.id, a stable slug, not on the translated name.
 */
const SKILL_ICON: Record<string, LucideIcon | typeof AutoRickshawIcon> = {
  // Trades & local services
  electrician: Zap,
  plumber: Droplets,
  carpenter: Hammer,
  mason: BrickWall,
  painter: Paintbrush,
  mechanic: Wrench,
  mobile_repair: Smartphone,
  driver: Car,
  auto_rickshaw: AutoRickshawIcon,
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
export function skillIconFor(skillId: string): LucideIcon | typeof AutoRickshawIcon {
  return SKILL_ICON[skillId] ?? Hammer;
}

/**
 * The team's category colours: Orange for Trades & Local Services, Deep
 * Navy for Professional & Skilled Services, Duleko Green for Personal &
 * Everyday Services (Emergency contacts are red, in EmergencyContacts).
 * The category comes from the skills table, so moving a skill between
 * categories recolours it with no code change. Without one - a skill
 * loaded without its category - the icon stays Deep Navy. Each class has
 * a lighter dark-mode shade in styles.css.
 */
export const CATEGORY_ICON_CLASS: Record<SkillCategory, string> = {
  trades: "text-accent-600",
  professional: "text-navy-700",
  personal: "text-brand-700",
};

function iconColour(category: SkillCategory | undefined): string {
  return (category && CATEGORY_ICON_CLASS[category]) || "text-navy-700";
}

/**
 * The one stroke weight every skill icon uses. Lucide's default is 2,
 * which reads heavy at the sizes these appear at.
 */
const STROKE = 1.75;

export function SkillIcon({
  skillId,
  category,
  className,
  inherit = false,
}: {
  skillId: string;
  /** The skill's category (skills.category), which sets the icon's colour. */
  category?: SkillCategory;
  className?: string;
  /**
   * Takes the colour of whatever it sits in, instead of its category
   * colour. Used on a filled surface - the selected picker pill - where
   * the colour would fight the fill rather than read against it.
   */
  inherit?: boolean;
}) {
  const Icon = skillIconFor(skillId);
  return (
    <Icon
      className={cn("h-4 w-4 shrink-0", !inherit && iconColour(category), className)}
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
export function SkillTile({
  skillId,
  category,
  className,
}: {
  skillId: string;
  category?: SkillCategory;
  className?: string;
}) {
  const Icon = skillIconFor(skillId);
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100",
        className,
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", iconColour(category))} strokeWidth={STROKE} />
    </span>
  );
}

/**
 * A skill as a label. Neutral by design - the icon carries the category
 * colour, and nothing else on the chip competes with it.
 */
export function SkillChip({
  skillId,
  category,
  children,
  compact = false,
  className,
}: {
  skillId: string;
  category?: SkillCategory;
  children: React.ReactNode;
  /** Tighter, for the dense worker cards in a results list. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-surface font-medium text-slate-700",
        compact ? "gap-1 px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <SkillIcon skillId={skillId} category={category} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {children}
    </span>
  );
}
