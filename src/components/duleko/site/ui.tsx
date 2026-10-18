import { cn } from "@/lib/utils";
import dulekoMark from "@/assets/duleko-mark.webp";
import dulekoSilhouette from "@/assets/duleko-mark-silhouette.png";

const WATERMARK_MASK: React.CSSProperties = {
  WebkitMaskImage: `url(${dulekoSilhouette})`,
  maskImage: `url(${dulekoSilhouette})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

/**
 * The Duleko mark as a see-through watermark for brand-coloured surfaces:
 * white on the dark greens, green on the light tints. The parent must be
 * positioned; size and place the mark with `className`.
 */
export function BrandWatermark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span
      aria-hidden
      style={WATERMARK_MASK}
      className={cn(
        "pointer-events-none absolute select-none",
        tone === "dark" ? "bg-white opacity-[0.09]" : "bg-brand-700 opacity-[0.07]",
        className,
      )}
    />
  );
}

/**
 * Layered ridge lines - the hills you see from anywhere in Nepal, drawn as a
 * contour-map texture. Stroked in currentColor, so colour and strength come
 * from `className` (e.g. "text-brand-700/15"). Deterministic: the same
 * `seed` always draws the same hills, so it never shifts between renders.
 */
export function RidgeLines({
  className,
  lines = 14,
  seed = 1,
}: {
  className?: string;
  lines?: number;
  seed?: number;
}) {
  const width = 1200;
  const height = 600;
  const gap = height / (lines + 2);
  const paths: string[] = [];
  for (let i = 0; i < lines; i++) {
    const base = gap * (i + 1.5);
    let d = "";
    for (let x = 0; x <= width; x += 12) {
      const y =
        base +
        Math.sin(x * 0.0042 + seed * 1.7 + i * 0.32) * (26 + i * 1.5) +
        Math.sin(x * 0.0113 + seed * 0.9 - i * 0.21) * 11 +
        Math.sin(x * 0.0021 + seed * 2.3) * 34;
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Brand({
  inverted = false,
  compact = false,
  className,
}: {
  inverted?: boolean;
  /**
   * Drop the "| डुलेको" half where the header is tight: `true` below 360px,
   * "sm" below the sm breakpoint. Both also drop it between lg and xl, where
   * the desktop nav joins the bar.
   */
  compact?: boolean | "sm";
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img
        src={dulekoMark}
        alt=""
        className={cn(
          "h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm",
          inverted && "ring-2 ring-white/20",
        )}
      />
      <span
        className={cn(
          "font-display whitespace-nowrap text-[19px] font-bold",
          inverted ? "text-white" : "text-slate-900",
        )}
      >
        Duleko
        <span
          className={cn(
            compact === true && "hidden min-[360px]:inline lg:hidden xl:inline",
            compact === "sm" && "hidden sm:inline lg:hidden xl:inline",
          )}
        >
          <span className={cn("mx-1.5 font-normal", inverted ? "text-white/30" : "text-slate-300")} aria-hidden>
            |
          </span>
          <span lang="ne" className={cn("font-semibold", inverted ? "text-white/80" : "text-navy-600")}>
            डुलेको
          </span>
        </span>
      </span>
    </span>
  );
}

type SiteButtonVariant = "primary" | "outline" | "ghost" | "light" | "ghostLight";
type SiteButtonSize = "sm" | "md" | "lg";

/** SiteButton's look, for a link that should look like one. */
export function siteButtonClass(variant: SiteButtonVariant = "primary", size: SiteButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]",
    variant === "primary" &&
      "bg-brand-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-12px_rgb(21_128_61/0.7)] hover:bg-brand-800 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_14px_28px_-12px_rgb(21_128_61/0.75)] focus-visible:ring-brand-700",
    variant === "outline" &&
      "border-2 border-brand-700 bg-surface text-brand-800 hover:bg-brand-50 focus-visible:ring-brand-700",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
    variant === "light" &&
      "bg-white text-[#166534] shadow-md hover:bg-[#f0fdf4] focus-visible:ring-white dark:bg-[#16a34a] dark:text-white dark:shadow-black/30 dark:hover:bg-[#15803d]",
    variant === "ghostLight" &&
      "border-2 border-white/70 text-white hover:bg-white/10 focus-visible:ring-white",
    size === "sm" && "h-10 px-4 text-sm",
    size === "md" && "h-11 px-5 text-sm sm:text-base",
    size === "lg" && "h-12 px-6 text-[15px] sm:text-base",
    className,
  );
}

export function SiteButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: SiteButtonVariant;
  size?: SiteButtonSize;
}) {
  return <button type="button" className={siteButtonClass(variant, size, className)} {...props} />;
}
