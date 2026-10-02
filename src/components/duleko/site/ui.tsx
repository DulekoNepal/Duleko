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
          "whitespace-nowrap text-lg font-bold tracking-tight",
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

export function SiteButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "light" | "ghostLight";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]",
        variant === "primary" &&
          "bg-brand-700 text-white shadow-sm shadow-brand-900/10 hover:bg-brand-800 hover:shadow-md focus-visible:ring-brand-700",
        variant === "outline" &&
          "border-2 border-brand-700 bg-surface text-brand-800 hover:bg-brand-50 focus-visible:ring-brand-700",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
        variant === "light" &&
          "bg-white text-[#166534] shadow-md hover:bg-[#f0fdf4] focus-visible:ring-white",
        variant === "ghostLight" &&
          "border-2 border-white/70 text-white hover:bg-white/10 focus-visible:ring-white",
        size === "sm" && "h-10 px-4 text-sm",
        size === "md" && "h-11 px-5 text-sm sm:text-base",
        size === "lg" && "h-12 px-6 text-[15px] sm:text-base",
        className,
      )}
      {...props}
    />
  );
}
