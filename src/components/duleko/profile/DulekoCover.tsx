import { useId } from "react";
import { skillIconFor } from "@/components/duleko/SkillIcon";
import type { VerificationTier } from "@/components/duleko/VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import type { Skill, SkillCategory } from "@/lib/types";
import { cn, skillName } from "@/lib/utils";

/**
 * Every profile's cover is Duleko's own artwork now (8300 cleared the
 * uploaded photos): a Himalayan ridge at dusk with prayer flags, stars and
 * drifting clouds, and the person's top skill in a medal on the right.
 *
 * The sky's colours come from the skill's category, so profiles don't all
 * look alike. Verification shows only as small accents - the medal's ring,
 * the dot in the corner pill: mild green when fully verified, mild orange
 * when half, plain white when not yet. Staff get a midnight sky with
 * green and orange aurora ribbons and their role in place of a skill.
 */

interface Palette {
  sky: [string, string];
  glow: string;
  far: string;
  near: string;
}

const PALETTES: Record<SkillCategory | "none", Palette> = {
  // Trades - indigo dusk.
  trades: { sky: ["#1e1b4b", "#6d28d9"], glow: "#fde68a", far: "#3730a3", near: "#1e1b4b" },
  // Personal & everyday - plum and rose.
  personal: { sky: ["#3b0764", "#be185d"], glow: "#fecdd3", far: "#831843", near: "#3b0764" },
  // Professional - deep ocean.
  professional: { sky: ["#082f49", "#0e7490"], glow: "#e0f2fe", far: "#075985", near: "#082f49" },
  // No skill yet - quiet slate.
  none: { sky: ["#0f172a", "#475569"], glow: "#e2e8f0", far: "#334155", near: "#0f172a" },
};

const STAFF: Palette = { sky: ["#020617", "#1e293b"], glow: "#f1f5f9", far: "#1e293b", near: "#020617" };

/** Mild accents only - the art itself never turns green or orange. */
const ACCENT: Record<VerificationTier, string> = {
  staff: "#fdba74",
  full: "#86efac",
  half: "#fdba74",
  none: "rgb(255 255 255 / 0.55)",
};

const STARS: [number, number, number][] = [
  [60, 22, 1.6], [140, 14, 1.1], [210, 34, 1.1], [300, 18, 1.6], [380, 28, 1.1], [450, 12, 1.1],
  [520, 26, 1.6], [610, 16, 1.1], [250, 54, 1.1], [95, 58, 1.6], [470, 48, 1.1], [660, 40, 1.1],
];

const FLAG_COLOURS = ["#3b82f6", "#f8fafc", "#ef4444", "#22c55e", "#facc15"];

/** Prayer flags strung along a gentle curve. */
function PrayerFlags({ y }: { y: number }) {
  const flags = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    const x = 20 + 310 * t;
    const fy = (1 - t) ** 2 * y + 2 * (1 - t) * t * (y + 34) + t ** 2 * (y + 8);
    return <rect key={i} x={x - 6} y={fy} width="12" height="15" rx="1.5" fill={FLAG_COLOURS[i % 5]} opacity="0.78" />;
  });
  return (
    <g className="cover-sway">
      <path d={`M20 ${y} Q170 ${y + 34} 330 ${y + 8}`} stroke="rgb(255 255 255 / 0.45)" strokeWidth="1" fill="none" />
      {flags}
    </g>
  );
}

function CoverArt({ palette, staff }: { palette: Palette; staff: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 680 200"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} className="cover-twinkle" style={{ animationDelay: `${(i * 0.37) % 3}s` }} cx={x} cy={y} r={r} fill="#fff" />
      ))}
      {staff && (
        <>
          <g className="cover-aurora" opacity="0.6">
            <path
              d="M-40 110 C120 40 260 140 420 70 S640 50 720 90 L720 120 C600 90 500 140 380 110 S120 90 -40 140Z"
              fill="#86efac"
              opacity="0.35"
            />
          </g>
          <g className="cover-aurora" style={{ animationDelay: "-4s" }} opacity="0.55">
            <path
              d="M-40 80 C140 130 300 40 460 100 S640 130 720 60 L720 90 C620 140 470 80 330 130 S100 100 -40 110Z"
              fill="#fdba74"
              opacity="0.32"
            />
          </g>
        </>
      )}
      <circle cx="470" cy="92" r="72" fill={`url(#${id}-glow)`} />
      <circle cx="470" cy="92" r="15" fill={palette.glow} opacity="0.9" />
      <g className="cover-drift" opacity="0.35">
        <ellipse cx="60" cy="74" rx="46" ry="9" fill="#fff" />
        <ellipse cx="90" cy="68" rx="26" ry="8" fill="#fff" />
      </g>
      <g className="cover-drift" style={{ animationDelay: "-15s", animationDuration: "38s" }} opacity="0.25">
        <ellipse cx="40" cy="98" rx="56" ry="8" fill="#fff" />
      </g>
      <path
        d="M0 200 L0 150 L70 126 L130 142 L210 92 L260 120 L330 80 L400 126 L470 104 L540 138 L610 114 L680 134 L680 200Z"
        fill={palette.far}
      />
      <path
        d="M210 92 l-16 16 l9 -3 l7 5 l7 -5 l9 3z M330 80 l-18 18 l10 -3 l8 6 l8 -6 l10 3z M470 104 l-12 12 l7 -2 l5 4 l5 -4 l7 2z"
        fill="#fff"
        opacity="0.85"
      />
      <path d="M0 200 L0 170 L110 148 L220 168 L330 142 L460 174 L560 154 L680 170 L680 200Z" fill={palette.near} />
      <PrayerFlags y={staff ? 26 : 30} />
      <text x="18" y="192" fontSize="40" fontWeight="700" fill="#fff" opacity="0.08">
        डुलेको
      </text>
    </svg>
  );
}

export function DulekoCover({
  tier,
  skill,
  roleTitle,
  className,
  children,
}: {
  tier: VerificationTier;
  /** The person's top skill - shown in the medal and picks the sky. */
  skill?: Skill | null;
  /** Staff only: their role on the team, in place of a skill. */
  roleTitle?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const staff = tier === "staff";
  const palette = staff ? STAFF : PALETTES[skill?.category ?? "none"];
  const accent = ACCENT[tier];
  const Icon = staff ? null : skill ? skillIconFor(skill.id) : null;

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
          <div className="max-w-36 text-right text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.45)] @2xl:max-w-48">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/75 @2xl:text-[11px]">
              {staff ? t("coverRole") : t("coverTopSkill")}
            </p>
            <p className="truncate text-sm font-semibold leading-tight @2xl:text-base">{caption}</p>
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
