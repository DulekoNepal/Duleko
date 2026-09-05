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
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        style={dimension}
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
