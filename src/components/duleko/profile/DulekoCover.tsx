import { useId } from "react";
import {
  BookOpen,
  Briefcase,
  Calculator,
  Check,
  Code,
  Database,
  Globe,
  GraduationCap,
  Hammer,
  HeartHandshake,
  Laptop,
  Lightbulb,
  PaintRoller,
  Plug,
  Ruler,
  Scissors,
  Shirt,
  Smartphone,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { skillIconFor } from "@/components/duleko/SkillIcon";
import type { VerificationTier } from "@/components/duleko/VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import type { Skill, SkillCategory } from "@/lib/types";
import { cn, formatNumber, skillName } from "@/lib/utils";

/**
 * Every profile's cover is Duleko's own artwork (8300 cleared the uploaded
 * photos): "Kathmandu at work" - a valley at dusk with a pagoda temple, a
 * stupa, village houses with lit windows, the Himalaya behind and prayer
 * flags across the sky, a strip of dhaka weave along the bottom, and the
 * tools of the person's work floating up like lanterns. Their top skill
 * sits in a medal on the right.
 *
 * The sky's colours come from the skill's category, so profiles don't all
 * look alike. Verification shows only as small accents - the medal's ring,
 * the dot in the corner pill: mild green when fully verified, mild orange
 * when half, plain white when not yet. Staff get a midnight sky with green
 * and orange aurora ribbons and their role in place of a skill.
 */

interface Palette {
  sky: [string, string];
  moon: string;
  far: string;
  near: string;
}

const PALETTES: Record<SkillCategory | "none", Palette> = {
  // Trades - indigo dusk.
  trades: { sky: ["#1e1b4b", "#7c3aed"], moon: "#fef3c7", far: "#4338ca", near: "#1e1b4b" },
  // Personal & everyday - plum and rose.
  personal: { sky: ["#3b0764", "#be185d"], moon: "#ffe4e6", far: "#9d174d", near: "#3b0764" },
  // Professional - deep ocean.
  professional: { sky: ["#082f49", "#0e7490"], moon: "#e0f2fe", far: "#0369a1", near: "#082f49" },
  // No skill yet - quiet slate.
  none: { sky: ["#0f172a", "#475569"], moon: "#f1f5f9", far: "#334155", near: "#0f172a" },
};

const STAFF: Palette = { sky: ["#020617", "#1e293b"], moon: "#f8fafc", far: "#334155", near: "#020617" };

/** Mild accents only - the art itself never turns green or orange. */
const ACCENT: Record<VerificationTier, string> = {
  staff: "#fdba74",
  full: "#86efac",
  half: "#fdba74",
  none: "rgb(255 255 255 / 0.55)",
};

/** The tools of each kind of work, floating up as lanterns after the person's own skill. */
const WORK_TOOLS: Record<SkillCategory | "none" | "staff", LucideIcon[]> = {
  trades: [Wrench, Hammer, Plug, Ruler, Lightbulb, PaintRoller],
  personal: [Scissors, Sparkles, Shirt, UtensilsCrossed, HeartHandshake, Lightbulb],
  professional: [BookOpen, Laptop, Calculator, GraduationCap, Briefcase, Lightbulb],
  none: [Wrench, Scissors, BookOpen, Hammer, Laptop, Lightbulb],
  staff: [Code, Smartphone, Database, Users, HeartHandshake, Globe],
};

const STARS: [number, number, number][] = [
  [60, 20, 1.5], [150, 12, 1.1], [260, 30, 1.1], [360, 16, 1.5], [440, 34, 1.1],
  [520, 12, 1.1], [600, 26, 1.5], [400, 8, 1.1], [200, 44, 1.1], [660, 46, 1.1],
];

const FLAG_COLOURS = ["#3b82f6", "#f8fafc", "#ef4444", "#22c55e", "#facc15"];

/** Dhaka: the red, navy, gold and white of the Nepali weave. */
const DHAKA = ["#7f1d1d", "#1e3a8a", "#facc15", "#f8fafc"];

/** Prayer flags strung along a gentle curve. */
function PrayerFlags({ y }: { y: number }) {
  const flags = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const x = 14 + 286 * t;
    const fy = (1 - t) ** 2 * y + 2 * (1 - t) * t * (y + 30) + t ** 2 * (y + 6);
    return <rect key={i} x={x - 5} y={fy} width="10" height="13" rx="1.5" fill={FLAG_COLOURS[i % 5]} opacity="0.8" />;
  });
  return (
    <g className="cover-sway">
      <path d={`M14 ${y} Q150 ${y + 30} 300 ${y + 6}`} stroke="rgb(255 255 255 / 0.45)" strokeWidth="1" fill="none" />
      {flags}
    </g>
  );
}

/** A three-roofed pagoda temple, like Nyatapola, standing on `base`. */
function Pagoda({ x, base, fill }: { x: number; base: number; fill: string }) {
  return (
    <g fill={fill}>
      <rect x={x - 3} y={base - 82} width="6" height="12" />
      <path d={`M${x - 30} ${base - 58} L${x} ${base - 74} L${x + 30} ${base - 58}Z`} />
      <rect x={x - 18} y={base - 58} width="36" height="12" />
      <path d={`M${x - 40} ${base - 40} L${x} ${base - 56} L${x + 40} ${base - 40}Z`} />
      <rect x={x - 26} y={base - 40} width="52" height="14" />
      <path d={`M${x - 50} ${base - 20} L${x} ${base - 38} L${x + 50} ${base - 20}Z`} />
      <rect x={x - 34} y={base - 20} width="68" height="20" />
      <rect x={x - 5} y={base - 12} width="10" height="12" fill="#fde68a" opacity="0.85" />
    </g>
  );
}

/**
 * A stupa, like Boudhanath: a stepped base, the white dome, the square
 * harmika with its painted eyes, and the gold spire.
 */
function Stupa({ x, base, ground }: { x: number; base: number; ground: string }) {
  return (
    <g>
      <rect x={x - 50} y={base - 8} width="100" height="8" fill={ground} />
      <path d={`M${x - 42} ${base - 8} Q${x} ${base - 66} ${x + 42} ${base - 8}Z`} fill="#e2e8f0" />
      <rect x={x - 12} y={base - 72} width="24" height="14" fill="#f8fafc" />
      <path
        d={`M${x - 8} ${base - 65} q3.5 -3 7 0 M${x + 1} ${base - 65} q3.5 -3 7 0`}
        stroke={ground}
        strokeWidth="1.6"
        fill="none"
      />
      <path d={`M${x - 8} ${base - 72} L${x} ${base - 102} L${x + 8} ${base - 72}Z`} fill="#fbbf24" />
    </g>
  );
}

/** Village houses with warm windows. */
function Houses({ fill }: { fill: string }) {
  const windows = "#fde68a";
  return (
    <g fill={fill}>
      <rect x="120" y="178" width="34" height="22" />
      <path d="M116 180 L137 164 L158 180Z" />
      <rect x="128" y="185" width="6" height="7" fill={windows} />
      <rect x="160" y="182" width="26" height="18" />
      <path d="M156 184 L173 171 L190 184Z" />
      <rect x="430" y="180" width="30" height="20" />
      <path d="M426 182 L445 167 L464 182Z" />
      <rect x="440" y="187" width="6" height="7" fill={windows} />
      <rect x="560" y="176" width="40" height="24" />
      <path d="M556 178 L580 160 L604 178Z" />
      <rect x="565" y="184" width="6" height="8" fill={windows} />
      <rect x="580" y="184" width="6" height="8" fill={windows} />
    </g>
  );
}

/** A band of the dhaka weave: diamonds in diamonds. */
function DhakaStrip({ y, h }: { y: number; h: number }) {
  return (
    <g>
      {Array.from({ length: 34 }, (_, i) => {
        const x = i * 20;
        const mid = y + h / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width="20" height={h} fill={DHAKA[i % 2]} />
            <path d={`M${x + 10} ${y + 1.5} L${x + 18} ${mid} L${x + 10} ${y + h - 1.5} L${x + 2} ${mid}Z`} fill={DHAKA[2]} />
            <path d={`M${x + 10} ${mid - 2.5} L${x + 12.5} ${mid} L${x + 10} ${mid + 2.5} L${x + 7.5} ${mid}Z`} fill={DHAKA[3]} />
          </g>
        );
      })}
    </g>
  );
}

function CoverArt({ palette, staff }: { palette: Palette; staff: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 680 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={palette.moon} stopOpacity="0.55" />
          <stop offset="1" stopColor={palette.moon} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} className="cover-twinkle" style={{ animationDelay: `${(i * 0.4) % 3}s` }} cx={x} cy={y} r={r} fill="#fff" />
      ))}
      {staff && (
        <>
          <g className="cover-aurora">
            <path
              d="M-20 100 C140 50 300 130 460 70 S640 60 700 90 L700 110 C600 90 480 140 340 110 S100 100 -20 125Z"
              fill="#86efac"
              opacity="0.2"
            />
          </g>
          <g className="cover-aurora" style={{ animationDelay: "-4s" }}>
            <path
              d="M-20 80 C160 120 320 50 480 100 S640 120 700 70 L700 88 C620 130 470 80 330 120 S100 100 -20 100Z"
              fill="#fdba74"
              opacity="0.18"
            />
          </g>
        </>
      )}
      {/* Between the corner pill and the medal, clear of both on a phone. */}
      <circle cx="450" cy="84" r="40" fill={`url(#${id}-glow)`} />
      <circle cx="450" cy="84" r="12" fill={palette.moon} opacity="0.95" />
      <g className="cover-drift" opacity="0.25">
        <ellipse cx="60" cy="92" rx="44" ry="7" fill="#fff" />
        <ellipse cx="88" cy="87" rx="24" ry="6" fill="#fff" />
      </g>

      {/* The Himalaya behind the valley. */}
      <path
        d="M0 200 L0 142 L80 116 L150 134 L240 94 L300 122 L370 88 L450 128 L520 110 L600 136 L680 118 L680 200Z"
        fill={palette.far}
        opacity="0.9"
      />
      <path
        d="M240 94 l-14 14 l8 -2 l6 4 l6 -4 l8 2z M370 88 l-16 16 l9 -3 l7 5 l7 -5 l9 3z M520 110 l-11 11 l6 -2 l5 3 l5 -3 l6 2z"
        fill="#fff"
        opacity="0.85"
      />

      {/* The valley: houses, the stupa and the pagoda, on the ground - the
          temples in the middle, where neither the photo nor the medal covers them. */}
      <Houses fill={palette.near} />
      <g transform="translate(272 186) scale(0.85) translate(-272 -186)">
        <Stupa x={272} base={186} ground={palette.near} />
      </g>
      <g transform="translate(372 184) scale(0.9) translate(-372 -184)">
        <Pagoda x={372} base={184} fill={palette.near} />
      </g>
      <rect x="0" y="180" width="680" height="20" fill={palette.near} />
      <DhakaStrip y={188} h={12} />

      <PrayerFlags y={staff ? 22 : 24} />
      {/* In open sky: under the flags, above the photo, clear of the medal. */}
      <text x="170" y="84" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fff" opacity="0.14">
        डुलेको
      </text>
    </svg>
  );
}

/** A skill's icon, as a plain icon component. */
function iconOf(skill: Skill): LucideIcon {
  return skillIconFor(skill.id) as LucideIcon;
}

/** The tools of the work, rising like lanterns between the photo and the medal. */
function ToolLanterns({ tools }: { tools: LucideIcon[] }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[34%] right-[38%]" aria-hidden>
      {tools.slice(0, 4).map((Icon, i) => (
        <span
          key={i}
          className="cover-rise absolute bottom-4 grid h-6 w-6 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/25 @2xl:h-7 @2xl:w-7"
          style={{ left: `${i * 28}%`, animationDelay: `${i * 2.2}s` }}
        >
          <Icon className="h-3 w-3 @2xl:h-3.5 @2xl:w-3.5" />
        </span>
      ))}
    </div>
  );
}

/** How many verified skills show as icons before "+N". */
const MAX_VERIFIED_SHOWN = 4;

export function DulekoCover({
  tier,
  skills = [],
  verifiedSkillIds = [],
  roleTitle,
  className,
  children,
}: {
  tier: VerificationTier;
  /**
   * The person's skills in profile order. The cover follows them: the top
   * skill (the first verified one, else the first) fills the medal and
   * picks the sky, every verified skill adds an icon under it, and each
   * skill rises as a lantern.
   */
  skills?: Skill[];
  /** Skills staff checked a certificate for (8300). */
  verifiedSkillIds?: string[];
  /** Staff only: their role on the team, in place of a skill. */
  roleTitle?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const staff = tier === "staff";
  const verified = skills.filter((s) => verifiedSkillIds.includes(s.id));
  const skill = verified[0] ?? skills[0] ?? null;
  const palette = staff ? STAFF : PALETTES[skill?.category ?? "none"];
  const accent = ACCENT[tier];
  const Icon = staff ? null : skill ? iconOf(skill) : null;
  // Their own skills rise first - verified ones leading - then the tools of
  // that kind of work fill in, so a new skill adds a lantern.
  const kind = staff ? "staff" : (skill?.category ?? "none");
  const own = staff ? [] : [...verified, ...skills.filter((s) => !verifiedSkillIds.includes(s.id))].map(iconOf);
  const tools = [...new Set([...own, ...WORK_TOOLS[kind]])];
  const extraVerified = Math.max(0, verified.length - MAX_VERIFIED_SHOWN);

  const pill =
    tier === "staff"
      ? t("coverDulekoTeam")
      : tier === "full"
        ? t("fullyVerifiedLabel")
        : tier === "half"
          ? t("halfVerifiedLabel")
          : t("coverNotVerified");
  const caption = staff ? roleTitle : skill ? skillName(skill, lang) : null;

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <CoverArt palette={palette} staff={staff} />
      <ToolLanterns tools={tools} />
      <div className="cover-sheen pointer-events-none absolute inset-0" aria-hidden />

      <span
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pl-2 pr-2.5 text-[11px] font-semibold text-white ring-1 backdrop-blur @2xl:right-4 @2xl:top-4 @2xl:text-xs"
        style={{ "--tw-ring-color": staff ? "rgb(253 186 116 / 0.6)" : accent } as React.CSSProperties}
      >
        <span className="cover-pulse h-1.5 w-1.5 rounded-full" style={{ background: accent, color: accent }} aria-hidden />
        {pill}
      </span>

      {caption && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2.5 @2xl:bottom-4 @2xl:right-5">
          <div className="max-w-36 text-right text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.5)] @2xl:max-w-48">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/75 @2xl:text-[11px]">
              {staff ? t("coverRole") : t("coverTopSkill")}
            </p>
            <p className="truncate text-sm font-semibold leading-tight @2xl:text-base">{caption}</p>
            {/* Every skill Duleko checked: one more icon for each approved certificate. */}
            {!staff && verified.length > 0 && (
              <ul
                className="mt-1 flex items-center justify-end gap-1"
                aria-label={`${t("coverVerifiedSkills")}: ${verified.map((s) => skillName(s, lang)).join(", ")}`}
              >
                {verified.slice(0, MAX_VERIFIED_SHOWN).map((s) => {
                  const SkillIcon = iconOf(s);
                  return (
                    <li
                      key={s.id}
                      title={skillName(s, lang)}
                      className="relative grid h-[18px] w-[18px] place-items-center rounded-full bg-white/20 ring-1 ring-[#86efac] @2xl:h-5 @2xl:w-5"
                    >
                      <SkillIcon className="h-2.5 w-2.5 text-white @2xl:h-3 @2xl:w-3" aria-hidden />
                      <Check
                        className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#16a34a] p-px text-white"
                        strokeWidth={4}
                        aria-hidden
                      />
                    </li>
                  );
                })}
                {extraVerified > 0 && (
                  <li className="text-[10px] font-semibold text-white/90 @2xl:text-[11px]">
                    +{formatNumber(extraVerified, lang)}
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="cover-float relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm @md:h-13 @md:w-13 @2xl:h-16 @2xl:w-16">
            <span
              className="cover-spin absolute -inset-1.5 rounded-full border-[1.5px] border-dashed"
              style={{ borderColor: accent }}
              aria-hidden
            />
            {Icon ? (
              <Icon className="h-5 w-5 text-white @md:h-6 @md:w-6 @2xl:h-7 @2xl:w-7" aria-hidden />
            ) : (
              <img src="/apple-touch-icon.png" alt="" className="h-6 w-6 rounded-md @2xl:h-8 @2xl:w-8" />
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
