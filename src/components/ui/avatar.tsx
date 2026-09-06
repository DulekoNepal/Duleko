import { useEffect, useState } from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 48,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };
  // A dead or deleted photo URL should fall back to initials, not a broken-image icon.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        style={dimension}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-slate-200", className)}
      />
    );
  }
  return (
    <div
      style={{ ...dimension, fontSize: Math.max(12, size / 2.6) }}
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
