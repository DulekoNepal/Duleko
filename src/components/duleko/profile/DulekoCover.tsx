import { useId } from "react";
import { Check, ShieldCheck, type LucideIcon } from "lucide-react";
import { skillIconFor } from "@/components/duleko/SkillIcon";
import { CHECK_PATH, SEAL_PATH, type VerificationTier } from "@/components/duleko/VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import type { Skill } from "@/lib/types";
import { cn, formatNumber, skillName } from "@/lib/utils";

/**
 * Every profile's cover is Duleko's own artwork (8300 cleared the uploaded
 * photos): "Hills at dawn" in full colour - the Annapurna range with
 * Machapuchare's fishtail in the middle, forested hills and terraces, and a
 * Newari house of brick with a two-tier pagoda roof, a carved ankhijhyal
 * window and ghyampa pots by the door. A footpath wanders (डुल्नु, where
 * Duleko gets its name) from the person's photo up to it, the tools of their
 * own skills glow along the way. Duleko's logo sits in the top-left sky.
 *
 * How far Duleko has checked someone is how far their sun has risen:
 * - not yet: before dawn - the sun still behind the mountains, stars out,
 *   the house lamp-lit and fireflies on the path;
 * - half: sunrise - half the sun over the ridge, the snow glowing pink;
 * - full: morning - the whole sun up, white snow and green hills.
 * Staff get a scene of their own (StaffLake): Phewa Lake at night under
 * aurora curtains, with the staff seal traced in the stars.
 * The path's light, the tool rings, the pill and the medal are in the
 * badge colour (green, orange, soft white; green with orange for
 * staff), the same as the ring round the photo.
 *
 * Layout on a phone: the photo covers the bottom-left, the logo the
 * top-left, the pill the top-right and the caption the bottom-right (from
 * about x 425 on a small phone, reaching up to y 80 with verified skills),
 * so the sun, the house and the flags stay between them. A wide cover crops
 * about 30 units off the top and the bottom, so nothing that matters sits
 * above y 40.
 */

interface Ink {
  /** The main line colour. */
  line: string;
  /** A lighter version, for glows and things in the light. */
  soft: string;
  /** Second colour for small details - only staff differ. */
  detail: string;
}

/** The light-on-dark versions of the badge colours (VerifiedBadge). */
const INKS: Record<VerificationTier, Ink> = {
  full: { line: "#86efac", soft: "#bbf7d0", detail: "#86efac" },
  half: { line: "#fdba74", soft: "#fed7aa", detail: "#fdba74" },
  none: { line: "#e2e8f0", soft: "#f8fafc", detail: "#cbd5e1" },
  staff: { line: "#86efac", soft: "#bbf7d0", detail: "#fdba74" },
};

/** The light of one time of day. */
interface Scene {
  /** Sky from the top down to the horizon. */
  sky: [string, string, string];
  /** The dawn glow round the sun, and how strong it is. */
  glow: string;
  glowStrength: number;
  /** How bright the stars are (0 hides them). */
  stars: number;
  /** The sun's centre - 100 sits it half over the ridge. */
  sunY: number;
  sun: string;
  rangeBack: string;
  range: string;
  snow: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  trees: string;
  path: string;
  wall: string;
  roof: string;
  /** How bright the lit windows are against the daylight. */
  lamp: number;
  clouds: number;
}

const MORNING: Scene = {
  sky: ["#1a5a8c", "#5b9fcb", "#fde4a8"],
  glow: "#fde68a",
  glowStrength: 0.6,
  stars: 0,
  sunY: 70,
  sun: "#fcd34d",
  rangeBack: "#93b3d1",
  range: "#6a8fb8",
  snow: "#ffffff",
  hillFar: "#4a8296",
  hillMid: "#3f8a57",
  hillNear: "#58a04f",
  trees: "#2f6e3f",
  path: "#ebd9ae",
  wall: "#b4573a",
  roof: "#3b2f2a",
  lamp: 0.55,
  clouds: 0.55,
};

const SCENES: Record<Exclude<VerificationTier, "staff">, Scene> = {
  none: {
    sky: ["#0a1430", "#1c2f5c", "#4a3f72"],
    glow: "#f59e6b",
    glowStrength: 0.35,
    stars: 1,
    sunY: 124,
    sun: "#f59e0b",
    rangeBack: "#2a3b66",
    range: "#1d2b52",
    snow: "#8fa3c8",
    hillFar: "#1b3049",
    hillMid: "#173326",
    hillNear: "#1d3f2a",
    trees: "#10251b",
    path: "#6f6552",
    wall: "#6e3426",
    roof: "#1f1917",
    lamp: 1,
    clouds: 0.08,
  },
  half: {
    sky: ["#163b6b", "#41709e", "#f4a261"],
    glow: "#fb923c",
    glowStrength: 0.55,
    stars: 0.35,
    sunY: 100,
    sun: "#fb923c",
    rangeBack: "#6a7fb0",
    range: "#4b5f93",
    snow: "#fcd2bd",
    hillFar: "#355e78",
    hillMid: "#2f6448",
    hillNear: "#3b7a40",
    trees: "#22503a",
    path: "#cdb48a",
    wall: "#94462d",
    roof: "#2d2421",
    lamp: 0.9,
    clouds: 0.3,
  },
  full: MORNING,
};

/** The house in the staff scene, at night. */
const NIGHT: Scene = {
  ...SCENES.none,
  wall: "#5a2a1e",
  roof: "#140f0e",
  lamp: 1,
};

/**
 * Where the sun comes up: left of Machapuchare, clear of the logo above,
 * the photo below and the caption on the right, in a dip in both ranges.
 */
const SUN_X = 236;

/** The five colours of prayer flags, in their order: sky, air, fire, water, earth. */
const FLAG_COLOURS = ["#2563eb", "#f8fafc", "#dc2626", "#16a34a", "#facc15"];
/** Lamp light in the windows. */
const LAMP = "#fde68a";

const STARS: [number, number, number][] = [
  [40, 44, 1.3],
  [96, 58, 1],
  [150, 40, 1.1],
  [208, 52, 1.4],
  [262, 36, 1],
  [356, 46, 1.1],
  [392, 30, 1.4],
  [420, 60, 1],
  [470, 36, 1.1],
  [512, 54, 1],
  [566, 34, 1.3],
  [640, 48, 1.1],
  [600, 66, 1],
  [120, 74, 1],
];

/** The far range, low in the haze, dipping where the sun comes up. */
const RANGE_BACK =
  "M-10 124 L30 100 L70 108 L120 88 L170 98 L200 92 L236 106 L264 94 L330 76 L380 98 L440 92 L490 96 L530 86 L580 72 L640 88 L690 80 L690 140 L-10 140Z";
/** The main range, with Machapuchare's fishtail summit at x 300. */
const RANGE =
  "M-10 140 L-10 118 L40 104 L80 112 L130 92 L170 102 L200 90 L236 100 L262 92 L280 70 L292 60 L300 46 L306 56 L312 44 L326 66 L350 84 L380 100 L405 108 L440 112 L470 106 L500 96 L540 82 L575 94 L610 88 L650 100 L690 96 L690 140Z";
/** The left faces, out of the morning sun. */
const RANGE_SHADE =
  "M300 46 L292 60 L280 70 L250 96 L262 120 L298 120 Z M200 90 L170 102 L178 120 L198 120Z M540 82 L500 96 L506 120 L536 120Z M130 92 L80 112 L90 124 L126 124Z";
const SNOW =
  "M280 70 L292 60 L300 46 L306 56 L312 44 L326 66 L319 70 L312 63 L306 72 L299 64 L292 72 L286 69Z M188 96 L200 90 L210 95 L203 97 L199 94 L194 98Z M526 90 L540 82 L556 90 L548 92 L541 88 L534 93Z M120 97 L130 92 L142 97 L136 99 L130 96 L125 100Z M600 92 L610 88 L622 93 L614 95 L609 92Z";
const HILL_FAR = "M-10 200 L-10 128 C80 116 160 122 230 130 S380 118 470 126 S620 114 690 122 L690 200Z";
const HILL_MID = "M-10 200 L-10 150 C90 136 170 148 250 152 S420 138 520 146 S640 136 690 142 L690 200Z";
/** The knoll the house stands on, rising from behind the photo. */
const HILL_NEAR =
  "M-10 200 L-10 178 C80 170 180 166 260 156 C300 150 330 142 360 140 C400 138 430 146 470 156 C540 170 620 168 690 172 L690 200Z";
/** From behind the photo up to the house's door. */
const FOOTPATH = "M150 200 C190 186 246 184 268 172 S300 154 328 150 S352 142 360 140";
/** Where the person's tools glow, above the path. */
const TOOL_SPOTS: [number, number][] = [
  [234, 150],
  [268, 138],
  [302, 128],
];
/** Pines along the top of the far hill. */
const PINES = [24, 36, 52, 448, 462, 590, 604, 618];
/** Clumps of round trees on the middle hill and beside the house. */
const TREE_CLUMPS: [number, number, number][] = [
  [420, 136, 1.1],
  [168, 148, 0.8],
  [126, 146, 0.65],
];

/** Lines of terraced fields, clipped to a hill. */
function Terraces({ top, rows, bend, colour }: { top: number; rows: number; bend: number; colour: string }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const y = top + i * 8;
        return (
          <path
            key={i}
            d={`M-10 ${y} Q170 ${y - bend} 340 ${y + 4} T700 ${y - 2}`}
            stroke={colour}
            strokeOpacity="0.18"
            strokeWidth="1.2"
            fill="none"
          />
        );
      })}
    </>
  );
}

/** Three round trees together, `size` 1 being about 10 units high. */
function TreeClump({ x, y, size, colour }: { x: number; y: number; size: number; colour: string }) {
  return (
    <g fill={colour} transform={`translate(${x} ${y}) scale(${size})`}>
      <path d="M0 6 V-4" stroke="#3a2416" strokeWidth="1.4" />
      <circle cx="0" cy="-8" r="7" />
      <circle cx="-6" cy="-2" r="5.5" />
      <circle cx="6" cy="-3" r="6" />
      <circle cx="-2" cy="-11" r="3" fill="#fff" opacity="0.08" />
    </g>
  );
}

/** Prayer flags in their five colours, from the house's roof down to a pole. */
function PrayerFlags() {
  const [x0, y0, x1, y1, sag] = [362, 82, 412, 100, 104];
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <path
        d={`M${x0} ${y0} Q${mid} ${sag} ${x1} ${y1}`}
        stroke="#3b2f2a"
        strokeOpacity="0.6"
        strokeWidth="0.6"
        fill="none"
      />
      <path d={`M${x1} ${y1 - 2} V${y1 + 46}`} stroke="#4a2e1c" strokeWidth="1.1" />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i + 0.5) / 8;
        const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mid + t ** 2 * x1;
        const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * sag + t ** 2 * y1;
        return (
          <rect
            key={i}
            className="cover-flutter"
            style={{ animationDelay: `${i * 0.18}s` }}
            x={x - 3}
            y={y}
            width="6"
            height="7.5"
            fill={FLAG_COLOURS[i % FLAG_COLOURS.length]}
            opacity="0.92"
          />
        );
      })}
    </g>
  );
}

/**
 * A Newari house standing on the knoll at `x`: brick walls, two tiers of
 * pagoda roof with upturned eaves and a gajur on top, a carved ankhijhyal
 * window over the door, and two ghyampa pots beside it.
 */
function NewariHouse({ x, base, scene, glow }: { x: number; base: number; scene: Scene; glow: string }) {
  const wood = "#4a2e1c";
  const eave = {
    stroke: wood,
    strokeWidth: 0.8,
    strokeLinejoin: "round" as const,
  };
  return (
    <g transform={`translate(${x} ${base}) scale(1.2) translate(${-x} ${-base})`}>
      <circle className="cover-breathe" cx={x} cy={base - 16} r="34" fill={glow} opacity={scene.lamp} />
      {/* Gajur. */}
      <path d={`M${x} ${base - 52} v-7`} stroke="#d4a017" strokeWidth="1.4" />
      <circle cx={x} cy={base - 60} r="1.8" fill="#facc15" />
      {/* Upper tier: its walls, a lit window, then its roof. */}
      <rect x={x - 10} y={base - 44} width="20" height="10" fill={scene.wall} />
      <rect x={x - 3.5} y={base - 42} width="7" height="5" fill={LAMP} opacity={scene.lamp} className="cover-flicker" />
      <path
        d={`M${x - 17} ${base - 42} Q${x - 8} ${base - 45} ${x} ${base - 52} Q${x + 8} ${base - 45} ${x + 17} ${
          base - 42
        } L${x + 15} ${base - 40} H${x - 15}Z`}
        fill={scene.roof}
        {...eave}
      />
      {/* The house and its lower roof. */}
      <rect x={x - 20} y={base - 27} width="40" height="27" fill={scene.wall} />
      {/* Brick courses. */}
      {[6, 12, 18, 24].map((dy) => (
        <path key={dy} d={`M${x - 20} ${base - dy} h40`} stroke="#000" strokeOpacity="0.12" strokeWidth="0.5" />
      ))}
      <path
        d={`M${x - 28} ${base - 26} Q${x - 14} ${base - 30} ${x} ${base - 37} Q${x + 14} ${base - 30} ${x + 28} ${
          base - 26
        } L${x + 25} ${base - 23} H${x - 25}Z`}
        fill={scene.roof}
        {...eave}
      />
      {/* Ankhijhyal: the carved lattice window, lit from inside, in its wooden frame. */}
      <rect x={x - 8} y={base - 22} width="16" height="11" fill={wood} />
      <rect
        className="cover-flicker"
        x={x - 6}
        y={base - 20.5}
        width="12"
        height="8"
        fill={LAMP}
        opacity={scene.lamp}
      />
      <path
        d={`M${x - 6} ${base - 20.5} l12 8 M${x + 6} ${base - 20.5} l-12 8 M${x} ${base - 20.5} v8 M${x - 6} ${
          base - 16.5
        } h12`}
        stroke={wood}
        strokeWidth="0.9"
      />
      <path d={`M${x - 11} ${base - 22.5} h22 M${x - 11} ${base - 10.5} h22`} stroke={wood} strokeWidth="1.2" />
      {/* Side windows. */}
      {[x - 16, x + 12].map((wx) => (
        <rect
          key={wx}
          x={wx}
          y={base - 20}
          width="4"
          height="6"
          fill={LAMP}
          opacity={scene.lamp * 0.85}
          stroke={wood}
          strokeWidth="0.7"
        />
      ))}
      {/* Door. */}
      <rect x={x - 3.5} y={base - 8} width="7" height="8" fill={wood} />
      {/* Ghyampa pots by the door. */}
      {[x + 25, x + 32].map((px) => (
        <g key={px} fill="#b45a32" stroke="#6b2f17" strokeWidth="0.6">
          <ellipse cx={px} cy={base - 3.5} rx="3.6" ry="3.5" />
          <path d={`M${px - 1.6} ${base - 7} v-1.6 h3.2 v1.6`} />
        </g>
      ))}
    </g>
  );
}

function HillsAtDawn({
  tier,
  ink,
  tools,
}: {
  tier: Exclude<VerificationTier, "staff">;
  ink: Ink;
  tools: LucideIcon[];
}) {
  const id = useId().replace(/:/g, "");
  const scene = SCENES[tier];
  const morning = scene.sunY < 100;
  return (
    <svg
      viewBox="0 0 680 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scene.sky[0]} />
          <stop offset="0.45" stopColor={scene.sky[1]} />
          <stop offset="0.66" stopColor={scene.sky[2]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={scene.glow} stopOpacity={scene.glowStrength} />
          <stop offset="1" stopColor={scene.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.6" stopColor={scene.sun} />
          <stop offset="1" stopColor={scene.sun} stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor={scene.glow} stopOpacity="0.7" />
          <stop offset="1" stopColor={scene.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor={LAMP} stopOpacity="0.45" />
          <stop offset="1" stopColor={LAMP} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scene.sky[2]} stopOpacity="0" />
          <stop offset="1" stopColor={scene.sky[2]} stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.4" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <clipPath id={`${id}-snow`}>
          <path d={SNOW} />
        </clipPath>
        <clipPath id={`${id}-mid`}>
          <path d={HILL_MID} />
        </clipPath>
        <clipPath id={`${id}-near`}>
          <path d={HILL_NEAR} />
        </clipPath>
      </defs>

      {/* Sky, the dawn glow, and the stars that are still out. */}
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      <ellipse cx={SUN_X} cy="100" rx="300" ry="110" fill={`url(#${id}-glow)`} />
      {scene.stars > 0 && (
        <g opacity={scene.stars}>
          {STARS.map(([x, y, r], i) => (
            <circle
              key={i}
              className="cover-twinkle"
              style={{ animationDelay: `${(i * 0.37) % 3}s` }}
              cx={x}
              cy={y}
              r={r}
              fill="#fff"
            />
          ))}
          <g className="cover-shoot">
            <line
              x1="560"
              y1="46"
              x2="610"
              y2="30"
              stroke={`url(#${id}-tail)`}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="560" cy="46" r="1.6" fill="#fff" />
          </g>
        </g>
      )}

      {/* Clouds drifting across. */}
      {[0, -30].map((delay) => (
        <g
          key={delay}
          className="cover-drift"
          style={{ animationDelay: `${delay}s` }}
          fill="#fff"
          opacity={scene.clouds}
        >
          <ellipse cx="40" cy={delay ? 62 : 78} rx="34" ry="6" />
          <ellipse cx="58" cy={delay ? 57 : 73} rx="18" ry="6" />
          <ellipse cx="28" cy={delay ? 59 : 75} rx="12" ry="4.5" />
        </g>
      ))}

      {/* The far range in the haze, then the sun - as far up as Duleko has checked them. */}
      <path d={RANGE_BACK} fill={scene.rangeBack} />
      <circle className="cover-breathe" cx={SUN_X} cy={scene.sunY} r="44" fill={`url(#${id}-halo)`} />
      <circle cx={SUN_X} cy={scene.sunY} r="15" fill={`url(#${id}-sun)`} />

      {/* Birds heading out for the day. */}
      <g
        className="cover-fly"
        stroke="#1f2937"
        strokeOpacity={morning ? 0.55 : 0.35}
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      >
        <path className="cover-flap" d="M0 80 q3 -3 6 0 q3 -3 6 0" />
        <path className="cover-flap" style={{ animationDelay: "-0.2s" }} d="M16 74 q2.5 -2.5 5 0 q2.5 -2.5 5 0" />
        <path className="cover-flap" style={{ animationDelay: "-0.45s" }} d="M-12 72 q2.5 -2.5 5 0 q2.5 -2.5 5 0" />
      </g>

      {/* The Himalaya, Machapuchare in the middle, first light sweeping across the snow. */}
      <path d={RANGE} fill={scene.range} />
      <path d={RANGE_SHADE} fill="#0b1220" opacity="0.18" />
      <path d={SNOW} fill={scene.snow} />
      {tier !== "none" && (
        <g clipPath={`url(#${id}-snow)`}>
          <rect className="cover-sweep" x="0" y="40" width="90" height="70" fill={`url(#${id}-sweep)`} />
        </g>
      )}
      <rect y="96" width="680" height="34" fill={`url(#${id}-haze)`} />

      {/* Mist in the valley. */}
      <g className="cover-mist">
        <ellipse cx="340" cy="128" rx="380" ry="8" fill="#fff" opacity={morning ? 0.22 : 0.1} />
      </g>

      {/* Far hill and its pines. */}
      {PINES.map((x, i) => (
        <path key={x} d={`M${x} ${118 + (i % 2) * 3} l-5 14 h10z`} fill={scene.hillFar} />
      ))}
      <path d={HILL_FAR} fill={scene.hillFar} />

      {/* Middle hill with its terraces, and trees by the house. */}
      <path d={HILL_MID} fill={scene.hillMid} />
      <path d={HILL_MID} fill={`url(#${id}-ground)`} />
      <g clipPath={`url(#${id}-mid)`}>
        <Terraces top={148} rows={7} bend={18} colour="#000" />
      </g>
      {TREE_CLUMPS.map(([x, y, size]) => (
        <TreeClump key={x} x={x} y={y} size={size} colour={scene.trees} />
      ))}

      <PrayerFlags />
      <NewariHouse x={360} base={140} scene={scene} glow={`url(#${id}-lamp)`} />

      {/* Near hill, and the footpath wandering up it, lit in the badge colour. */}
      <path d={HILL_NEAR} fill={scene.hillNear} />
      <path d={HILL_NEAR} fill={`url(#${id}-ground)`} />
      <g clipPath={`url(#${id}-near)`}>
        <Terraces top={168} rows={4} bend={14} colour="#000" />
      </g>
      <path d={FOOTPATH} stroke={scene.path} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path
        d={FOOTPATH}
        stroke="#000"
        strokeOpacity="0.08"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        transform="translate(0 2)"
      />
      <path
        className="cover-flow"
        d={FOOTPATH}
        stroke={ink.line}
        strokeOpacity="0.95"
        strokeWidth="1.6"
        strokeDasharray="3 5"
        strokeLinecap="round"
        fill="none"
      />
      {["0s", "-6s"].map((begin) => (
        <circle key={begin} className="cover-walker" r="2.2" fill="#1f2937" opacity="0">
          <animateMotion dur="12s" begin={begin} repeatCount="indefinite" path={FOOTPATH} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.1;0.85;1"
            dur="12s"
            begin={begin}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* The tools of their work, glowing along the way. */}
      {tools.slice(0, TOOL_SPOTS.length).map((Tool, i) => {
        const [x, y] = TOOL_SPOTS[i];
        return (
          <g key={i} className="cover-bob" style={{ animationDelay: `${i * -1.4}s` }}>
            <circle cx={x} cy={y} r="10" fill="#0b1220" fillOpacity="0.55" stroke={ink.line} strokeWidth="1.2" />
            <Tool x={x - 6} y={y - 6} width="12" height="12" color={ink.soft} strokeWidth={2} />
          </g>
        );
      })}

      {/* Before dawn, fireflies over the path. */}
      {tier === "none" &&
        [
          [240, 176],
          [300, 186],
          [352, 164],
          [400, 180],
        ].map(([x, y], i) => (
          <circle
            key={i}
            className="cover-firefly"
            style={{ animationDelay: `${i * 1.3}s` }}
            cx={x}
            cy={y}
            r="1.4"
            fill="#fef08a"
          />
        ))}
    </svg>
  );
}

/** Where the lake's surface meets the shore - the mirror line for reflections. */
const WATER = 142;
/** The island temple: Tal Barahi, the pagoda in the middle of Phewa Lake. */
const ISLAND: [number, number] = [330, 146];
/** The seal of the staff badge, traced as a constellation: centre and size. */
const SEAL_STARS = { x: 410, y: 66, r: 19 };
/** Lights of Lakeside along the far shore. */
const SHORE_LIGHTS: [number, number][] = [
  [478, 139],
  [496, 136],
  [516, 133],
  [540, 130],
  [566, 128],
  [592, 126],
  [622, 123],
  [652, 121],
  [30, 132],
  [62, 129],
];
/** Sky lanterns: where each is let go, how far it drifts, and when. */
const LANTERNS: { x: number; y: number; dx: number; dur: number; begin: number }[] = [
  { x: 286, y: 168, dx: -18, dur: 14, begin: 0 },
  { x: 330, y: 136, dx: 14, dur: 16, begin: -5 },
  { x: 300, y: 168, dx: 26, dur: 13, begin: -9 },
  { x: 350, y: 140, dx: -10, dur: 15, begin: -12 },
];
const SHORE_LEFT = "M-10 146 L-10 122 C40 114 110 122 170 132 C192 136 210 140 226 146Z";
const SHORE_RIGHT = "M690 146 L690 114 C640 108 580 118 520 128 C494 133 474 139 452 146Z";

/** A deterministic scatter of faint stars along the Milky Way. */
const DUST: [number, number, number][] = Array.from({ length: 70 }, (_, i) => {
  const x = ((i * 97 + 13) % 700) - 10;
  const along = 64 - (x - 340) * 0.22;
  const spread = (((i * 53) % 29) - 14) * 1.4;
  return [x, along + spread, 0.35 + ((i * 7) % 5) * 0.12];
});

/**
 * One aurora curtain as a row of thin rays, each brightest at its own hem
 * and fading up into the sky, the whole row tapering off at both ends.
 */
function auroraRays(from: number, to: number, hem: (x: number) => number, tall: (x: number) => number) {
  const rays: { x: number; y: number; h: number; o: number }[] = [];
  for (let x = from; x <= to; x += 5) {
    const t = (x - from) / (to - from);
    const h = tall(x);
    rays.push({ x, y: hem(x) - h, h, o: Math.sin(Math.PI * t) * (0.55 + 0.45 * Math.abs(Math.sin(x * 0.13))) });
  }
  return rays;
}
const RAYS_GREEN = auroraRays(
  -10,
  690,
  (x) => 92 + 10 * Math.sin(x / 70) + 5 * Math.sin(x / 29 + 1),
  (x) => 46 + 16 * Math.sin(x / 43 + 2)
);
const RAYS_ORANGE = auroraRays(
  190,
  690,
  (x) => 76 + 8 * Math.sin(x / 52 + 3),
  (x) => 34 + 12 * Math.sin(x / 37)
);

/** The points of the seal: eight round its edge, then the tick inside. */
function sealPoints() {
  const { x, y, r } = SEAL_STARS;
  const ring = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 ? 0.86 : 1;
    return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k] as [number, number];
  });
  const tick: [number, number][] = [
    [x - 8, y + 1],
    [x - 2, y + 7],
    [x + 9, y - 6],
  ];
  return { ring, tick };
}

/**
 * Staff covers, a scene of their own: Phewa Lake at night. Aurora curtains
 * in both badge colours hang over the Milky Way and a crescent moon, and
 * the stars over the lake trace the staff seal with its tick. Machapuchare
 * and Tal Barahi - the pagoda on its island - lie mirrored in the still
 * water, Lakeside's lights run along the far shore, and from a lantern-lit
 * doonga sky lanterns rise one after another - the people who keep Duleko
 * lit.
 */
function StaffLake({ ink }: { ink: Ink }) {
  const id = useId().replace(/:/g, "");
  const { ring, tick } = sealPoints();
  const ringPath = `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}Z`;
  const tickPath = `M${tick.map(([x, y]) => `${x} ${y}`).join(" L")}`;
  const mirror = `translate(0 ${WATER * 2}) scale(1 -1)`;

  /** Everything that shows in the water as well as above it. */
  const land = (
    <>
      <path d={RANGE_BACK} fill="#151b3d" />
      <path d={RANGE} fill="#0b102a" stroke={ink.soft} strokeOpacity="0.35" strokeWidth="0.8" strokeLinejoin="round" />
      <path d={SNOW} fill="#c7d2fe" opacity="0.55" />
      <path d={SHORE_LEFT} fill="#060a1a" />
      <path d={SHORE_RIGHT} fill="#060a1a" />
      <ellipse cx={ISLAND[0]} cy={ISLAND[1]} rx="30" ry="4.5" fill="#060a1a" />
      <TreeClump x={ISLAND[0] - 22} y={ISLAND[1] - 3} size={0.7} colour="#071410" />
      <TreeClump x={ISLAND[0] + 24} y={ISLAND[1] - 2} size={0.6} colour="#071410" />
      <g
        transform={`translate(${ISLAND[0]} ${ISLAND[1] - 2}) scale(0.72) translate(${-ISLAND[0]} ${-(ISLAND[1] - 2)})`}
      >
        <NewariHouse x={ISLAND[0]} base={ISLAND[1] - 2} scene={NIGHT} glow={`url(#${id}-lamp)`} />
      </g>
    </>
  );

  return (
    <svg
      viewBox="0 0 680 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03040f" />
          <stop offset="0.4" stopColor="#0d1240" />
          <stop offset="0.7" stopColor="#1b1f5c" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a4a" />
          <stop offset="1" stopColor="#03050f" />
        </linearGradient>
        {/* Aurora rays: bright at the hem, fading up into the sky. */}
        <linearGradient id={`${id}-curtain-a`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={ink.line} stopOpacity="0" />
          <stop offset="0.15" stopColor={ink.line} stopOpacity="0.9" />
          <stop offset="1" stopColor={ink.line} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-curtain-b`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={ink.detail} stopOpacity="0" />
          <stop offset="0.2" stopColor={ink.detail} stopOpacity="0.75" />
          <stop offset="1" stopColor={ink.detail} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-haze`}>
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        {/* Still water: the reflection wobbles a little sideways. */}
        <filter id={`${id}-ripple`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.18" numOctaves="1" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
        <mask id={`${id}-fade-mask`}>
          <rect y={WATER} width="680" height={200 - WATER} fill={`url(#${id}-fade)`} />
        </mask>
        <radialGradient id={`${id}-moon`}>
          <stop offset="0" stopColor="#fef9c3" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fef9c3" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-crescent`}>
          <circle cx="150" cy="56" r="9" fill="#fff" />
          <circle cx="155" cy="52" r="8" fill="#000" />
        </mask>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor={LAMP} stopOpacity="0.5" />
          <stop offset="1" stopColor={LAMP} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lantern`}>
          <stop offset="0" stopColor="#fdba74" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky, the Milky Way and the stars. */}
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      <ellipse
        cx="340"
        cy="64"
        rx="300"
        ry="20"
        transform="rotate(-12 340 64)"
        fill="#c7d2fe"
        opacity="0.12"
        filter={`url(#${id}-blur)`}
      />
      {DUST.map(([x, y, r], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#e0e7ff" opacity="0.6" />
      ))}
      {STARS.map(([x, y, r], i) => (
        <circle
          key={i}
          className="cover-twinkle"
          style={{ animationDelay: `${(i * 0.37) % 3}s` }}
          cx={x}
          cy={y - 12}
          r={r}
          fill="#fff"
        />
      ))}
      <g className="cover-shoot">
        <line x1="560" y1="46" x2="610" y2="30" stroke={`url(#${id}-tail)`} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="560" cy="46" r="1.6" fill="#fff" />
      </g>

      {/* Aurora curtains, swaying, a soft glow behind them. */}
      <g filter={`url(#${id}-blur)`} opacity="0.5">
        <path d="M-20 96 C150 60 300 110 470 70 S640 60 700 84 L700 30 L-20 30Z" fill={ink.line} opacity="0.35" />
      </g>
      <g filter={`url(#${id}-haze)`}>
        <g className="cover-aurora">
          {RAYS_GREEN.map(({ x, y, h, o }) => (
            <rect key={x} x={x} y={y} width="3.2" height={h} fill={`url(#${id}-curtain-a)`} opacity={o} />
          ))}
        </g>
        <g className="cover-aurora" style={{ animationDelay: "-4.5s" }}>
          {RAYS_ORANGE.map(({ x, y, h, o }) => (
            <rect key={x} x={x} y={y} width="3.2" height={h} fill={`url(#${id}-curtain-b)`} opacity={o * 0.85} />
          ))}
        </g>
      </g>

      {/* The crescent moon. */}
      <circle className="cover-breathe" cx="150" cy="56" r="26" fill={`url(#${id}-moon)`} />
      <circle cx="150" cy="56" r="9" fill="#fef9c3" mask={`url(#${id}-crescent)`} />

      {/* The staff seal, traced in stars. */}
      <g>
        <path
          className="cover-flow"
          d={ringPath}
          stroke={ink.soft}
          strokeOpacity="0.45"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
        <path d={tickPath} stroke={ink.line} strokeOpacity="0.85" strokeWidth="0.9" strokeLinecap="round" fill="none" />
        {[...ring, ...tick].map(([x, y], i) => (
          <circle
            key={`s${i}`}
            className="cover-twinkle"
            style={{ animationDelay: `${i * 0.3}s` }}
            cx={x}
            cy={y}
            r={i >= ring.length ? 1.6 : 1.2}
            fill={i >= ring.length ? ink.line : "#fff"}
          />
        ))}
      </g>

      {/* Land above the water. */}
      {land}
      {SHORE_LIGHTS.map(([x, y], i) => (
        <circle
          key={`l${i}`}
          className="cover-flicker"
          style={{ animationDelay: `${i * 0.4}s` }}
          cx={x}
          cy={y}
          r="1.1"
          fill={LAMP}
        />
      ))}

      {/* The lake, and everything mirrored in it. */}
      <rect y={WATER} width="680" height={200 - WATER} fill={`url(#${id}-water)`} />
      <g mask={`url(#${id}-fade-mask)`}>
        <g filter={`url(#${id}-ripple)`}>
          <g transform={mirror}>
            <g filter={`url(#${id}-blur)`} opacity="0.35">
              <path d="M-20 96 C150 60 300 110 470 70 S640 60 700 84 L700 30 L-20 30Z" fill={ink.line} />
            </g>
            <circle cx="150" cy="56" r="9" fill="#fef9c3" mask={`url(#${id}-crescent)`} />
            {land}
          </g>
        </g>
      </g>
      {/* Lights stretched into streaks on the water. */}
      {SHORE_LIGHTS.map(([x, y], i) => (
        <rect
          key={`r${i}`}
          x={x - 0.6}
          y={WATER * 2 - y + 1}
          width="1.2"
          height="9"
          rx="0.6"
          fill={LAMP}
          opacity="0.35"
        />
      ))}
      <rect x={ISLAND[0] - 1} y={WATER + 6} width="2" height="16" rx="1" fill={LAMP} opacity="0.3" />
      {/* Ripples sliding across. */}
      <g className="cover-mist" stroke="#c7d2fe" strokeOpacity="0.18" strokeWidth="0.6" strokeLinecap="round">
        {[
          [220, 156, 40],
          [400, 162, 60],
          [520, 172, 50],
          [260, 182, 70],
          [460, 190, 40],
          [120, 168, 30],
        ].map(([x, y, w]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} h${w}`} />
        ))}
      </g>

      {/* The doonga with its lantern, drifting. */}
      <g transform="translate(0 -12)">
        <g className="cover-mist" style={{ animationDuration: "22s" }}>
          <path d="M268 172 Q290 178 316 172 L312 170 H272Z" fill="#05070f" />
          <path d="M296 170 V160" stroke="#05070f" strokeWidth="0.8" />
          <circle cx="296" cy="159" r="6" fill={`url(#${id}-lantern)`} />
          <circle cx="296" cy="159" r="1.4" fill="#fdba74" />
          {/* The boatman. */}
          <rect x="283" y="164" width="2.6" height="6.5" rx="1" fill="#05070f" />
          <circle cx="284.3" cy="162.4" r="1.6" fill="#05070f" />
        </g>
      </g>

      {/* Sky lanterns rising, one after another. */}
      {LANTERNS.map(({ x, y, dx, dur, begin }, i) => {
        const route = `M${x} ${y} C${x + dx * 0.3} ${y - 40} ${x + dx} ${y - 70} ${x + dx * 0.6} ${y - 120}`;
        const colour = i % 2 ? ink.line : "#fdba74";
        return (
          <g key={i} className="cover-walker" opacity="0">
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" path={route} />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.7;1"
              dur={`${dur}s`}
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
            <circle r="7" fill={`url(#${id}-lantern)`} opacity="0.8" />
            <path d="M-2.4 -3.2 h4.8 l-0.6 6 h-3.6z" fill={colour} />
            <rect x="-1" y="1.2" width="2" height="1.6" fill="#fff7ed" />
          </g>
        );
      })}
    </svg>
  );
}

/** A skill's icon, as a plain icon component. */
function iconOf(skill: Skill): LucideIcon {
  return skillIconFor(skill.id) as LucideIcon;
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
   * The person's skills in profile order. The top skill (the first verified
   * one, else the first) fills the medal, their tools glow along the path
   * (verified ones first), and every verified skill adds a ticked icon
   * under the medal.
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
  const ink = INKS[tier];
  const verified = skills.filter((s) => verifiedSkillIds.includes(s.id));
  const skill = verified[0] ?? skills[0] ?? null;
  const Icon = staff ? ShieldCheck : skill ? iconOf(skill) : null;
  const tools = staff ? [] : [...new Set([...verified, ...skills].map(iconOf))];
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
      {tier === "staff" ? <StaffLake ink={ink} /> : <HillsAtDawn tier={tier} ink={ink} tools={tools} />}

      {/* Duleko's own logo, and on a wide cover its line. Staff covers are Duleko's already. */}
      {!staff && (
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 @md:left-3 @md:top-3 @md:gap-2 @2xl:left-5 @2xl:top-4">
          <img
            src="/apple-touch-icon.png"
            alt=""
            className="h-5 w-5 rounded-md bg-white shadow-md ring-1 ring-black/5 @md:h-7 @md:w-7 @md:rounded-lg @2xl:h-9 @2xl:w-9"
          />
          <div className="text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.45)]">
            <p className="text-xs font-bold leading-none @md:text-sm @2xl:text-lg">{t("appName")}</p>
            <p className="mt-0.5 hidden text-[11px] font-medium text-white/85 @2xl:block">{t("tagline")}</p>
          </div>
        </div>
      )}

      {/* The same seal as the name badge: hollow green, hollow orange, solid for staff. */}
      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/35 py-0.5 pl-1 pr-2 text-[9px] font-semibold text-white ring-1 ring-white/15 backdrop-blur @md:right-3 @md:top-3 @md:gap-1.5 @md:py-1 @md:pl-1.5 @md:pr-2.5 @md:text-[11px] @2xl:right-4 @2xl:top-4 @2xl:text-xs">
        {tier === "none" ? (
          <span className="mx-0.5 h-1 w-1 rounded-full bg-white/50 @md:h-1.5 @md:w-1.5" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" className="h-3 w-3 @md:h-4 @md:w-4" aria-hidden>
            <path
              d={SEAL_PATH}
              fill={staff ? ink.line : "none"}
              stroke={ink.line}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d={CHECK_PATH}
              fill="none"
              stroke={staff ? "#052e16" : ink.line}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {pill}
      </span>

      {caption && (
        <div className="absolute bottom-3 right-2.5 flex items-center gap-1.5 @md:bottom-4 @md:right-3 @md:gap-2.5 @2xl:bottom-5 @2xl:right-5">
          <div className="max-w-28 text-right text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.6)] @md:max-w-36 @2xl:max-w-48">
            <p className="text-[8px] font-medium uppercase tracking-wider text-white/80 @md:text-[10px] @2xl:text-[11px]">
              {staff ? t("coverRole") : t("coverTopSkill")}
            </p>
            <p className="truncate text-xs font-semibold leading-tight @md:text-sm @2xl:text-base">{caption}</p>
            {/* Every skill Duleko checked: one more icon for each approved certificate. */}
            {!staff && verified.length > 0 && (
              <ul
                className="mt-0.5 flex items-center justify-end gap-0.5 @md:mt-1 @md:gap-1"
                aria-label={`${t("coverVerifiedSkills")}: ${verified.map((s) => skillName(s, lang)).join(", ")}`}
              >
                {verified.slice(0, MAX_VERIFIED_SHOWN).map((s) => {
                  const SkillIcon = iconOf(s);
                  return (
                    <li
                      key={s.id}
                      title={skillName(s, lang)}
                      className="relative grid h-3.5 w-3.5 place-items-center rounded-full bg-black/30 @md:h-[18px] @md:w-[18px] @2xl:h-5 @2xl:w-5"
                    >
                      <SkillIcon className="h-2 w-2 text-white @md:h-2.5 @md:w-2.5 @2xl:h-3 @2xl:w-3" aria-hidden />
                      <Check
                        className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#16a34a] p-px text-white @md:h-2 @md:w-2"
                        strokeWidth={4}
                        aria-hidden
                      />
                    </li>
                  );
                })}
                {extraVerified > 0 && (
                  <li className="text-[8px] font-semibold text-white/90 @md:text-[10px] @2xl:text-[11px]">
                    +{formatNumber(extraVerified, lang)}
                  </li>
                )}
              </ul>
            )}
          </div>
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/35 ring-[1.5px] backdrop-blur-sm @md:h-13 @md:w-13 @md:ring-2 @2xl:h-16 @2xl:w-16"
            style={{ "--tw-ring-color": ink.line } as React.CSSProperties}
          >
            {Icon && (
              <Icon className="h-4 w-4 @md:h-6 @md:w-6 @2xl:h-7 @2xl:w-7" style={{ color: ink.soft }} aria-hidden />
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
