import { useId } from "react";
import { Check, ShieldCheck, type LucideIcon } from "lucide-react";
import { skillIconFor } from "@/components/duleko/SkillIcon";
import { CHECK_PATH, SEAL_PATH, type VerificationTier } from "@/components/duleko/VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import { sunAt, useMinute } from "@/lib/sun";
import type { Skill } from "@/lib/types";
import { cn, formatClockTime, formatNumber, skillName } from "@/lib/utils";

/**
 * Every profile's cover is Duleko's own artwork (8300 cleared the uploaded
 * photos): "Hills at dawn" in full colour - the Annapurna range with
 * Machapuchare's fishtail in the middle, forested hills and terraces, and a
 * Newari house of brick with a two-tier pagoda roof, a carved ankhijhyal
 * window and ghyampa pots by the door. A footpath wanders (डुल्नु, where
 * Duleko gets its name) from the person's photo up to it, the tools of their
 * own skills glow along the way. Duleko's logo sits in the top-left sky.
 *
 * The cover keeps the time of day: the sun crosses the sky with the real
 * sun over Pokhara (lib/sun.ts) - up from behind the range on the right in
 * the morning, high and white at noon, down behind the hills on the left
 * at dusk, the snow pink and the sky orange either side of it - and at
 * night the sky goes dark, the stars and a crescent moon come out, the
 * house is lamp-lit and fireflies hover over the path. The time shows in
 * small type in the top-left corner, under the logo.
 * Staff get a scene of their own (StaffLake): Phewa Lake, by night under
 * aurora curtains with the staff seal traced in the stars, by day blue
 * water, a painted doonga and paragliders in the badge colours.
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

/** The colours of the hills at one time of day. */
interface Scene {
  /** Sky from the top down to the horizon. */
  sky: [string, string, string];
  /** The glow round the sun (or the moon), and how strong it is. */
  glow: string;
  glowStrength: number;
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

/** Midnight: dark sky, moonlit snow, the house lamp-lit. */
const NIGHT: Scene = {
  sky: ["#020617", "#0a1230", "#1a2350"],
  glow: "#93a5d6",
  glowStrength: 0.1,
  sun: "#f59e0b",
  rangeBack: "#1a2448",
  range: "#111a3a",
  snow: "#6b7ca6",
  hillFar: "#0f1c2e",
  hillMid: "#0c1f17",
  hillNear: "#0f2518",
  trees: "#08140e",
  path: "#4a4436",
  wall: "#4f2419",
  roof: "#151110",
  lamp: 1,
  clouds: 0.06,
};

/** Sunrise and sunset: orange sky, pink snow. Mixed in near the horizon. */
const GOLDEN: Scene = {
  sky: ["#1f3f73", "#6a6fa6", "#f6a25e"],
  glow: "#fb923c",
  glowStrength: 0.6,
  sun: "#fb7d2c",
  rangeBack: "#7a7fb0",
  range: "#55609a",
  snow: "#fdc9b0",
  hillFar: "#3b5c74",
  hillMid: "#35603f",
  hillNear: "#477a3a",
  trees: "#26502f",
  path: "#d6b386",
  wall: "#9c4a2e",
  roof: "#2d2421",
  lamp: 0.85,
  clouds: 0.4,
};

/** Noon: blue sky, white snow, green hills. */
const DAY: Scene = {
  sky: ["#1d6fb8", "#5aa7dc", "#cfe9f7"],
  glow: "#fff7d6",
  glowStrength: 0.45,
  sun: "#fff3b0",
  rangeBack: "#a7c3dc",
  range: "#7598c0",
  snow: "#ffffff",
  hillFar: "#4f8a8f",
  hillMid: "#43915a",
  hillNear: "#5ea852",
  trees: "#2f6e3f",
  path: "#ecdcb2",
  wall: "#b85a3b",
  roof: "#3b2f2a",
  lamp: 0.3,
  clouds: 0.75,
};

/** The light at one moment, worked out from where the sun is. */
interface Light {
  /** 0 in the dark, 1 in full daylight. */
  day: number;
  /** How much sunrise or sunset colour is in the sky, 0 to 1. */
  golden: number;
  /** How bright the stars are (0 hides them). */
  stars: number;
  sun: { x: number; y: number; shown: boolean };
  /** The moon follows the same arc through the night; `shown` is its opacity. */
  moon: { x: number; y: number; shown: number };
}

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/**
 * Where something `elevation` degrees up and `hourAngle` degrees round
 * from noon sits on the cover: rising on the right of Machapuchare,
 * highest just left of its summit, setting behind the hills on the left -
 * clear of the logo, the pill, the photo and the caption. It climbs fast
 * at first, so a morning sun is soon over the snow and the prayer flags
 * rather than behind the house.
 */
function skyPoint(hourAngle: number, elevation: number) {
  const up = 1 - (1 - Math.min(Math.max(elevation, -10), 50) / 50) ** 3;
  return { x: Math.min(470, Math.max(90, 280 - (hourAngle / 90) * 165)), y: 106 - up * 68 };
}

function lightAt(date: Date): Light {
  const { elevation, hourAngle } = sunAt(date);
  const moonAngle = hourAngle > 0 ? hourAngle - 180 : hourAngle + 180;
  return {
    day: smooth(-8, 22, elevation),
    golden: Math.max(0, 1 - Math.abs(elevation - 2) / 10) * 0.9,
    stars: 1 - smooth(-14, -3, elevation),
    sun: { ...skyPoint(hourAngle, elevation), shown: elevation > -5 },
    moon: { ...skyPoint(moonAngle, -elevation), shown: smooth(3, 12, -elevation) },
  };
}

function mixColour(a: string, b: string, t: number): string {
  const [pa, pb] = [parseInt(a.slice(1), 16), parseInt(b.slice(1), 16)];
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}

/** Every colour and number of `a` moved `t` of the way to `b`. */
function mixPalette<T extends object>(a: T, b: T, t: number): T {
  const [from, to] = [a as Record<string, unknown>, b as Record<string, unknown>];
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(from)) {
    const [x, y] = [from[key], to[key]];
    out[key] =
      typeof x === "number"
        ? x + ((y as number) - x) * t
        : Array.isArray(x)
        ? x.map((c: string, i) => mixColour(c, (y as string[])[i], t))
        : mixColour(x as string, y as string, t);
  }
  return out as T;
}

/** Night to day by the daylight, then the sunrise colours on top. */
function paletteAt<T extends object>(light: Light, night: T, day: T, golden: T): T {
  return mixPalette(mixPalette(night, day, light.day), golden, light.golden);
}


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

/** Clouds drifting across. */
function Clouds({ opacity }: { opacity: number }) {
  return (
    <>
      {[0, -30].map((delay) => (
        <g key={delay} className="cover-drift" style={{ animationDelay: `${delay}s` }} fill="#fff" opacity={opacity}>
          <ellipse cx="40" cy={delay ? 62 : 78} rx="34" ry="6" />
          <ellipse cx="58" cy={delay ? 57 : 73} rx="18" ry="6" />
          <ellipse cx="28" cy={delay ? 59 : 75} rx="12" ry="4.5" />
        </g>
      ))}
    </>
  );
}

/** The gradients for the sun, its halo and the moon's glow; `id` prefixes them. */
function SkyDefs({ id, scene }: { id: string; scene: Scene }) {
  return (
    <>
      <radialGradient id={`${id}-sun`}>
        <stop offset="0" stopColor="#fffbeb" />
        <stop offset="0.6" stopColor={scene.sun} />
        <stop offset="1" stopColor={scene.sun} stopOpacity="0.9" />
      </radialGradient>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0" stopColor={scene.glow} stopOpacity="0.7" />
        <stop offset="1" stopColor={scene.glow} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-moon`}>
        <stop offset="0" stopColor="#fef9c3" stopOpacity="0.35" />
        <stop offset="1" stopColor="#fef9c3" stopOpacity="0" />
      </radialGradient>
    </>
  );
}

/** The sun where `light` puts it, with its halo. */
function Sun({ id, light }: { id: string; light: Light }) {
  if (!light.sun.shown) return null;
  const { x, y } = light.sun;
  return (
    <>
      <circle className="cover-breathe" cx={x} cy={y} r="44" fill={`url(#${id}-halo)`} />
      <circle cx={x} cy={y} r="15" fill={`url(#${id}-sun)`} />
    </>
  );
}

/**
 * A crescent moon where `light` puts it, fading out as the sky gets light.
 * `reflection` is the copy drawn in the lake, which needs its own mask.
 */
function Moon({ id, light, reflection = false }: { id: string; light: Light; reflection?: boolean }) {
  if (light.moon.shown <= 0) return null;
  const { x, y, shown } = light.moon;
  const mask = `${id}-crescent${reflection ? "-r" : ""}`;
  return (
    <g opacity={shown}>
      <mask id={mask}>
        <circle cx={x} cy={y} r="9" fill="#fff" />
        <circle cx={x + 5} cy={y - 4} r="8" fill="#000" />
      </mask>
      <circle className="cover-breathe" cx={x} cy={y} r="26" fill={`url(#${id}-moon)`} />
      <circle cx={x} cy={y} r="9" fill="#fef9c3" mask={`url(#${mask})`} />
    </g>
  );
}

function HillsAtDawn({
  ink,
  tools,
  light,
  onTool,
}: {
  ink: Ink;
  tools: Tool[];
  light: Light;
  /** Makes each tool a tap target that opens its skill. */
  onTool?: (skillId: string) => void;
}) {
  const id = useId().replace(/:/g, "");
  const scene = paletteAt(light, NIGHT, DAY, GOLDEN);
  const glowAt = light.sun.shown ? light.sun : light.moon;
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
        <SkyDefs id={id} scene={scene} />
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

      {/* Sky, the glow round the sun or moon, and the stars when it is dark. */}
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      <ellipse cx={glowAt.x} cy={glowAt.y} rx="300" ry="110" fill={`url(#${id}-glow)`} />
      {light.stars > 0 && (
        <g opacity={light.stars}>
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
      <Moon id={id} light={light} />

      <Clouds opacity={scene.clouds} />

      {/* The far range in the haze, then the sun - wherever it is in its day. */}
      <path d={RANGE_BACK} fill={scene.rangeBack} />
      <Sun id={id} light={light} />

      {/* Birds out in the daylight. */}
      {light.day > 0.2 && (
        <g
          className="cover-fly"
          stroke="#1f2937"
          strokeOpacity={0.55 * light.day}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        >
          <path className="cover-flap" d="M0 80 q3 -3 6 0 q3 -3 6 0" />
          <path className="cover-flap" style={{ animationDelay: "-0.2s" }} d="M16 74 q2.5 -2.5 5 0 q2.5 -2.5 5 0" />
          <path className="cover-flap" style={{ animationDelay: "-0.45s" }} d="M-12 72 q2.5 -2.5 5 0 q2.5 -2.5 5 0" />
        </g>
      )}

      {/* The Himalaya, Machapuchare in the middle, first and last light sweeping across the snow. */}
      <path d={RANGE} fill={scene.range} />
      <path d={RANGE_SHADE} fill="#0b1220" opacity="0.18" />
      <path d={SNOW} fill={scene.snow} />
      {light.golden > 0.2 && (
        <g clipPath={`url(#${id}-snow)`} opacity={light.golden}>
          <rect className="cover-sweep" x="0" y="40" width="90" height="70" fill={`url(#${id}-sweep)`} />
        </g>
      )}
      <rect y="96" width="680" height="34" fill={`url(#${id}-haze)`} />

      {/* Mist in the valley. */}
      <g className="cover-mist">
        <ellipse cx="340" cy="128" rx="380" ry="8" fill="#fff" opacity={0.08 + 0.14 * light.day} />
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
      {tools.slice(0, TOOL_SPOTS.length).map(({ Icon, skillId }, i) => {
        const [x, y] = TOOL_SPOTS[i];
        return (
          <g
            key={skillId}
            className={cn("cover-bob", onTool && "cursor-pointer")}
            style={{ animationDelay: `${i * -1.4}s` }}
            onClick={onTool ? () => onTool(skillId) : undefined}
          >
            {/* A bigger, invisible circle so the small tool is easy to tap. */}
            {onTool && <circle cx={x} cy={y} r="14" fill="transparent" />}
            <circle cx={x} cy={y} r="8" fill="#0b1220" fillOpacity="0.55" stroke={ink.line} strokeWidth="1" />
            <Icon x={x - 4.5} y={y - 4.5} width="9" height="9" color={ink.soft} strokeWidth={2} />
          </g>
        );
      })}

      {/* At night, fireflies over the path. */}
      {light.stars > 0.6 &&
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

/** The colours of Phewa Lake at one time of day. */
interface Lake {
  sky: [string, string, string];
  /** The lake from the far shore down to the near edge. */
  water: [string, string];
  rangeBack: string;
  range: string;
  snow: string;
  snowOpacity: number;
  shore: string;
  trees: string;
  /** The doonga, black at night, painted blue by day. */
  hull: string;
}

const LAKE_NIGHT: Lake = {
  sky: ["#03040f", "#0d1240", "#1b1f5c"],
  water: ["#141a4a", "#03050f"],
  rangeBack: "#151b3d",
  range: "#0b102a",
  snow: "#c7d2fe",
  snowOpacity: 0.55,
  shore: "#060a1a",
  trees: "#071410",
  hull: "#05070f",
};

const LAKE_GOLDEN: Lake = {
  sky: ["#2a2f6e", "#8a5f8f", "#f7a35c"],
  water: ["#8a6f9a", "#2a2a50"],
  rangeBack: "#6a6fa0",
  range: "#4a5288",
  snow: "#fdc9b0",
  snowOpacity: 0.95,
  shore: "#2a3a2a",
  trees: "#1f3a22",
  hull: "#3a2a4a",
};

const LAKE_DAY: Lake = {
  sky: ["#1a6bb5", "#55a3da", "#c6e6f6"],
  water: ["#5aa8d6", "#1d5f8f"],
  rangeBack: "#a7c3dc",
  range: "#7598c0",
  snow: "#ffffff",
  snowOpacity: 1,
  shore: "#3f7d45",
  trees: "#2c6436",
  hull: "#1d4ed8",
};

/** Paragliders over Sarangkot by day: where each hangs and its canopy colour. */
const PARAGLIDERS: { x: number; y: number; colour: string; delay: number }[] = [
  { x: 178, y: 70, colour: "#22c55e", delay: 0 },
  { x: 232, y: 50, colour: "#f97316", delay: -6 },
  { x: 418, y: 46, colour: "#22c55e", delay: -11 },
];

/** One paraglider: the canopy's arc, its lines, the pilot hanging under it. */
function Paraglider({ x, y, colour, delay }: { x: number; y: number; colour: string; delay: number }) {
  return (
    <g className="cover-glide" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x - 9} ${y} Q${x} ${y - 6} ${x + 9} ${y} L${x + 7.5} ${y + 1.8} Q${x} ${y - 3} ${x - 7.5} ${y + 1.8}Z`} fill={colour} />
      <path d={`M${x - 3} ${y - 2.6} Q${x} ${y - 3.6} ${x + 3} ${y - 2.6}`} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" fill="none" />
      <path
        d={`M${x - 7.5} ${y + 1.6} L${x} ${y + 11} M${x + 7.5} ${y + 1.6} L${x} ${y + 11} M${x - 2.5} ${y - 1.5} L${x} ${y + 11} M${x + 2.5} ${y - 1.5} L${x} ${y + 11}`}
        stroke="#1f2937"
        strokeOpacity="0.45"
        strokeWidth="0.3"
      />
      <circle cx={x} cy={y + 12} r="1.3" fill="#1f2937" />
    </g>
  );
}

/**
 * Staff covers, a scene of their own: Phewa Lake, keeping the time of day
 * like the hills. By night aurora curtains in both badge colours hang over
 * the Milky Way and the moon, the stars over the lake trace the staff seal
 * with its tick, Lakeside's lights run along the far shore, and from a
 * lantern-lit doonga sky lanterns rise one after another - the people who
 * keep Duleko lit. By day the sun shines on blue water, a painted doonga
 * rows across and paragliders in green and orange circle over the hills.
 * Machapuchare and Tal Barahi - the pagoda on its island - lie mirrored in
 * the water at any hour.
 */
function StaffLake({ ink, light }: { ink: Ink; light: Light }) {
  const id = useId().replace(/:/g, "");
  const lake = paletteAt(light, LAKE_NIGHT, LAKE_DAY, LAKE_GOLDEN);
  const house = paletteAt(light, NIGHT, DAY, GOLDEN);
  const dark = 1 - light.day;
  const { ring, tick } = sealPoints();
  const ringPath = `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}Z`;
  const tickPath = `M${tick.map(([x, y]) => `${x} ${y}`).join(" L")}`;
  const mirror = `translate(0 ${WATER * 2}) scale(1 -1)`;

  /** Everything that shows in the water as well as above it. */
  const land = (
    <>
      <path d={RANGE_BACK} fill={lake.rangeBack} />
      <path
        d={RANGE}
        fill={lake.range}
        stroke={ink.soft}
        strokeOpacity={0.35 * light.stars}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d={SNOW} fill={lake.snow} opacity={lake.snowOpacity} />
      <path d={SHORE_LEFT} fill={lake.shore} />
      <path d={SHORE_RIGHT} fill={lake.shore} />
      <ellipse cx={ISLAND[0]} cy={ISLAND[1]} rx="30" ry="4.5" fill={lake.shore} />
      <TreeClump x={ISLAND[0] - 22} y={ISLAND[1] - 3} size={0.7} colour={lake.trees} />
      <TreeClump x={ISLAND[0] + 24} y={ISLAND[1] - 2} size={0.6} colour={lake.trees} />
      <g
        transform={`translate(${ISLAND[0]} ${ISLAND[1] - 2}) scale(0.72) translate(${-ISLAND[0]} ${-(ISLAND[1] - 2)})`}
      >
        <NewariHouse x={ISLAND[0]} base={ISLAND[1] - 2} scene={house} glow={`url(#${id}-lamp)`} />
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
          <stop offset="0" stopColor={lake.sky[0]} />
          <stop offset="0.4" stopColor={lake.sky[1]} />
          <stop offset="0.7" stopColor={lake.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lake.water[0]} />
          <stop offset="1" stopColor={lake.water[1]} />
        </linearGradient>
        <SkyDefs id={id} scene={house} />
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

      {/* Sky, and at night the Milky Way and the stars. */}
      <rect width="680" height="200" fill={`url(#${id}-sky)`} />
      {light.stars > 0 && (
        <g opacity={light.stars}>
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

          {/* The staff seal, traced in stars. */}
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
      )}
      <Moon id={id} light={light} />
      <Clouds opacity={house.clouds} />
      <Sun id={id} light={light} />

      {/* By day, paragliders circling over the hills. */}
      {light.day > 0.15 && (
        <g opacity={light.day}>
          {PARAGLIDERS.map((p) => (
            <Paraglider key={p.x} {...p} />
          ))}
        </g>
      )}

      {/* Land above the water. */}
      {land}
      {dark > 0.1 &&
        SHORE_LIGHTS.map(([x, y], i) => (
          <circle
            key={`l${i}`}
            className="cover-flicker"
            style={{ animationDelay: `${i * 0.4}s` }}
            cx={x}
            cy={y}
            r="1.1"
            fill={LAMP}
            opacity={dark}
          />
        ))}

      {/* The lake, and everything mirrored in it. */}
      <rect y={WATER} width="680" height={200 - WATER} fill={`url(#${id}-water)`} />
      <g mask={`url(#${id}-fade-mask)`}>
        <g filter={`url(#${id}-ripple)`}>
          <g transform={mirror}>
            {light.stars > 0 && (
              <g filter={`url(#${id}-blur)`} opacity={0.35 * light.stars}>
                <path d="M-20 96 C150 60 300 110 470 70 S640 60 700 84 L700 30 L-20 30Z" fill={ink.line} />
              </g>
            )}
            <Moon id={id} light={light} reflection />
            <Sun id={id} light={light} />
            {land}
          </g>
        </g>
      </g>
      {/* Lights stretched into streaks on the water. */}
      {dark > 0.1 && (
        <g opacity={dark}>
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
        </g>
      )}
      {/* The sun glittering on the water under it. */}
      {light.sun.shown && light.day > 0.2 && (
        <g fill="#fff" opacity={0.7 * light.day}>
          {[148, 156, 165, 175, 186].map((y, i) => (
            <rect
              key={y}
              className="cover-flicker"
              style={{ animationDelay: `${i * 0.5}s` }}
              x={light.sun.x - 4 - i * 2}
              y={y}
              width={8 + i * 4}
              height="0.9"
              rx="0.45"
            />
          ))}
        </g>
      )}
      {/* Ripples sliding across. */}
      <g
        className="cover-mist"
        stroke={light.day > 0.5 ? "#ffffff" : "#c7d2fe"}
        strokeOpacity={0.18 + 0.12 * light.day}
        strokeWidth="0.6"
        strokeLinecap="round"
      >
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

      {/* The doonga, drifting - its lantern lit after dark. */}
      <g transform="translate(0 -12)">
        <g className="cover-mist" style={{ animationDuration: "22s" }}>
          <path d="M268 172 Q290 178 316 172 L312 170 H272Z" fill={lake.hull} />
          <path d="M270 171.4 Q290 176 314 171.4" stroke="#facc15" strokeOpacity={0.9 * light.day} strokeWidth="0.7" fill="none" />
          <path d="M296 170 V160" stroke="#05070f" strokeWidth="0.8" />
          <circle cx="296" cy="159" r="6" fill={`url(#${id}-lantern)`} opacity={dark} />
          <circle cx="296" cy="159" r="1.4" fill="#fdba74" opacity={0.3 + 0.7 * dark} />
          {/* The boatman and his oar. */}
          <rect x="283" y="164" width="2.6" height="6.5" rx="1" fill="#05070f" />
          <circle cx="284.3" cy="162.4" r="1.6" fill="#05070f" />
          <path d="M286 166 L278 176" stroke="#05070f" strokeOpacity={light.day} strokeWidth="0.7" />
        </g>
      </g>

      {/* After dark, sky lanterns rising one after another. */}
      {light.stars > 0.3 && (
        <g opacity={light.stars}>
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
        </g>
      )}
    </svg>
  );
}

/** A skill's icon, as a plain icon component. */
function iconOf(skill: Skill): LucideIcon {
  return skillIconFor(skill.id) as LucideIcon;
}

/** How many verified skills show as icons before "+N". */
const MAX_VERIFIED_SHOWN = 4;

/** One of the person's tools on the path, and the skill it stands for. */
interface Tool {
  Icon: LucideIcon;
  skillId: string;
}

/** A button when there is somewhere to go, otherwise just the same box. */
function Tap({
  onClick,
  label,
  className,
  style,
  children,
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={style}
      className={cn(
        className,
        "cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
      )}
    >
      {children}
    </button>
  );
}

export function DulekoCover({
  tier,
  skills = [],
  verifiedSkillIds = [],
  roleTitle,
  at,
  onBadge,
  onSkill,
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
  /** A fixed moment to show instead of the clock (for previews). */
  at?: Date;
  /** Makes the badge pill a button (not on staff covers). */
  onBadge?: () => void;
  /** Makes the top skill, the ticked icons and the tools on the path buttons (not on staff covers). */
  onSkill?: (skillId: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const staff = tier === "staff";
  const ink = INKS[tier];
  const verified = skills.filter((s) => verifiedSkillIds.includes(s.id));
  const skill = verified[0] ?? skills[0] ?? null;
  const Icon = staff ? ShieldCheck : skill ? iconOf(skill) : null;
  // One tool per icon - two skills can share one.
  const tools: Tool[] = [];
  if (!staff) {
    for (const s of [...verified, ...skills]) {
      const ToolIcon = iconOf(s);
      if (!tools.some((tool) => tool.Icon === ToolIcon)) tools.push({ Icon: ToolIcon, skillId: s.id });
    }
  }
  const extraVerified = Math.max(0, verified.length - MAX_VERIFIED_SHOWN);
  const clock = useMinute();
  const time = at ?? clock;
  const light = lightAt(time);
  const badgeTap = staff ? undefined : onBadge;
  const skillTap = staff ? undefined : onSkill;
  const openTop = skillTap && skill ? () => skillTap(skill.id) : undefined;

  const pill =
    tier === "staff"
      ? t("coverDulekoTeam")
      : tier === "full"
      ? t("fullyVerifiedLabel")
      : tier === "half"
      ? t("halfVerifiedLabel")
      : t("coverNotVerified");
  const caption = staff ? roleTitle : skill ? skillName(skill, lang) : null;
  const openLabel = caption ? t("coverOpenSkill", { skill: caption }) : undefined;

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {staff ? (
        <StaffLake ink={ink} light={light} />
      ) : (
        <HillsAtDawn ink={ink} tools={tools} light={light} onTool={skillTap} />
      )}

      {/* Duleko's own logo and on a wide cover its line (staff covers are Duleko's already), then the time. */}
      <div className="absolute left-2 top-2 flex flex-col items-start gap-0.5 @md:left-3 @md:top-2.5 @md:gap-1 @2xl:left-4 @2xl:top-3.5">
        {!staff && (
          <div className="flex items-center gap-1 @md:gap-1.5">
            <img
              src="/apple-touch-icon.png"
              alt=""
              className="h-4 w-4 rounded bg-white shadow-md ring-1 ring-black/5 @md:h-5.5 @md:w-5.5 @md:rounded-md @2xl:h-7 @2xl:w-7"
            />
            <div className="text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.45)]">
              <p className="text-[10px] font-bold leading-none @md:text-xs @2xl:text-sm">{t("appName")}</p>
              <p className="mt-0.5 hidden text-[10px] font-medium text-white/85 @2xl:block">{t("tagline")}</p>
            </div>
          </div>
        )}
        <time
          dateTime={time.toISOString()}
          className="pl-px text-[7px] font-medium leading-none tabular-nums text-white/90 [text-shadow:0_1px_4px_rgb(0_0_0/0.7)] @md:text-[8px] @2xl:text-[9px]"
        >
          {formatClockTime(time.toISOString(), lang)}
        </time>
      </div>

      {/* The same seal as the name badge: hollow green, hollow orange, solid for staff. */}
      <Tap
        onClick={badgeTap}
        className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-black/35 py-px pl-0.5 pr-1.5 text-[7px] font-semibold text-white ring-1 ring-white/15 backdrop-blur @md:right-3 @md:top-2.5 @md:gap-1 @md:py-0.5 @md:pl-1 @md:pr-2 @md:text-[9px] @2xl:right-4 @2xl:top-3.5 @2xl:text-[10px]"
      >
        {tier === "none" ? (
          <span className="mx-0.5 h-1 w-1 rounded-full bg-white/50" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" className="h-2 w-2 @md:h-3 @md:w-3" aria-hidden>
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
      </Tap>

      {caption && (
        <div className="absolute bottom-2.5 right-2 flex items-center gap-1 @md:bottom-3 @md:right-3 @md:gap-2 @2xl:bottom-4 @2xl:right-4">
          <div className="flex max-w-24 flex-col items-end text-right text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.6)] @md:max-w-32 @2xl:max-w-40">
            <Tap onClick={openTop} label={openLabel} className="block max-w-full rounded text-right">
              <span className="block text-[7px] font-medium uppercase tracking-wider text-white/80 @md:text-[8px] @2xl:text-[9px]">
                {staff ? t("coverRole") : t("coverTopSkill")}
              </span>
              <span className="block truncate text-[10px] font-semibold leading-tight @md:text-xs @2xl:text-sm">
                {caption}
              </span>
            </Tap>
            {/* Every skill Duleko checked: one more icon for each approved certificate. */}
            {!staff && verified.length > 0 && (
              <ul
                className="mt-0.5 flex items-center justify-end gap-0.5 @md:gap-1"
                aria-label={`${t("coverVerifiedSkills")}: ${verified.map((s) => skillName(s, lang)).join(", ")}`}
              >
                {verified.slice(0, MAX_VERIFIED_SHOWN).map((s) => {
                  const SkillIcon = iconOf(s);
                  return (
                    <li key={s.id} title={skillTap ? undefined : skillName(s, lang)}>
                      <Tap
                        onClick={skillTap ? () => skillTap(s.id) : undefined}
                        label={skillName(s, lang)}
                        className="relative grid h-3 w-3 place-items-center rounded-full bg-black/30 @md:h-3.5 @md:w-3.5 @2xl:h-4 @2xl:w-4"
                      >
                        <SkillIcon
                          className="h-[7px] w-[7px] text-white @md:h-2 @md:w-2 @2xl:h-2.5 @2xl:w-2.5"
                          aria-hidden
                        />
                        <Check
                          className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#16a34a] p-px text-white"
                          strokeWidth={4}
                          aria-hidden
                        />
                      </Tap>
                    </li>
                  );
                })}
                {extraVerified > 0 && (
                  <li>
                    <Tap
                      onClick={openTop}
                      className="block text-[7px] font-semibold text-white/90 @md:text-[8px] @2xl:text-[9px]"
                    >
                      +{formatNumber(extraVerified, lang)}
                    </Tap>
                  </li>
                )}
              </ul>
            )}
          </div>
          <Tap
            onClick={openTop}
            label={openLabel}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/35 ring-[1.5px] backdrop-blur-sm @md:h-10 @md:w-10 @md:ring-2 @2xl:h-12 @2xl:w-12"
            style={{ "--tw-ring-color": ink.line } as React.CSSProperties}
          >
            {Icon && (
              <Icon className="h-3.5 w-3.5 @md:h-5 @md:w-5 @2xl:h-6 @2xl:w-6" style={{ color: ink.soft }} aria-hidden />
            )}
          </Tap>
        </div>
      )}
      {children}
    </div>
  );
}
