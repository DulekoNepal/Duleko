import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn, initials } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * The green dot means "has the app open right now" (presence) - a
 * different signal from the "Available for work" badge shown alongside a
 * worker's name, which is about whether they're taking new jobs at all.
 */
function OnlineDot({ size }: { size: number }) {
  const dot = Math.max(9, Math.round(size / 4));
  const ring = Math.max(2, Math.round(dot / 4));
  return (
    <span
      aria-hidden
      style={{ width: dot, height: dot, borderWidth: ring }}
      className="absolute bottom-0 right-0 rounded-full border-white bg-green-500"
    />
  );
}

export function Avatar({
  name,
  src,
  size = 48,
  online,
  className,
  profileId,
}: {
  name: string;
  src?: string | null;
  size?: number;
  /** Shows a small green "online now" dot - presence, not work availability. */
  online?: boolean;
  className?: string;
  /**
   * Makes the avatar a tappable link to that person's profile. Leave it
   * off where the avatar already sits inside something clickable - an
   * anchor nested in a button is invalid, and both would fire at once.
   */
  profileId?: string | null;
}) {
  const { t } = useI18n();
  const dimension = { width: size, height: size };
  // A dead or deleted photo URL should fall back to initials, not a broken-image icon.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const inner =
    src && !failed ? (
      <img
        src={src}
        alt=""
        loading="lazy"
        style={dimension}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-slate-200", className)}
      />
    ) : (
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

  const content = online ? (
    <span className="relative inline-flex shrink-0" style={dimension}>
      {inner}
      <span className="sr-only">, {t("online")}</span>
      <OnlineDot size={size} />
    </span>
  ) : (
    inner
  );

  if (!profileId) return content;

  return (
    <Link
      to="/worker/$workerId"
      params={{ workerId: profileId }}
      aria-label={name}
      // stopPropagation so tapping the face opens the profile rather than
      // whatever row or card the avatar happens to be sitting in.
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 rounded-full transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
