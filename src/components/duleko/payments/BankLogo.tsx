import { Landmark } from "lucide-react";
import { brandOf } from "@/lib/banks";
import { cn } from "@/lib/utils";
import type { PaymentKind } from "@/lib/types";

// A wordmark's tile is wider than it is tall, up to this many times, so
// the name stays readable without pushing the text beside it off the row.
const MAX_TILE_ASPECT = 2.6;

/**
 * A bank's or wallet's official logo on a white tile - the logos are drawn
 * for white, so the tile stays white in dark mode and on a coloured card.
 * A bank typed in as "other" shows a plain bank icon. `size` is the tile's
 * height in pixels; a wide wordmark gets a wider tile.
 */
export function BankLogo({
  kind,
  bankCode,
  size = 40,
  className,
}: {
  kind: PaymentKind;
  bankCode?: string | null;
  size?: number;
  className?: string;
}) {
  const brand = brandOf({ kind, bank_code: bankCode ?? null });
  const radius = Math.round(size * 0.22);

  if (!brand) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center bg-slate-100 text-slate-500 ring-1 ring-slate-200", className)}
        style={{ width: size, height: size, borderRadius: radius }}
        aria-hidden
      >
        <Landmark style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }

  const width = Math.round(size * Math.min(Math.max(brand.aspect, 1), MAX_TILE_ASPECT));
  const pad = Math.max(3, Math.round(size * 0.1));
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center bg-white ring-1 ring-black/10", className)}
      style={{ width, height: size, borderRadius: radius, padding: pad }}
      aria-hidden
    >
      <img src={brand.logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" decoding="async" />
    </span>
  );
}
