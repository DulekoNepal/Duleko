import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/lib/types";

/**
 * The scalloped "seal" outline (the same silhouette as the classic
 * verified-badge glyph - eight gentle points from four overlapping
 * circles) plus the checkmark, both traced at lucide's native 24x24
 * grid so they stay crisp at any size.
 */
const SEAL_PATH =
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z";
const CHECK_PATH = "m9 12 2 2 4-4";

/** How far Duleko has checked someone (8300). */
export type VerificationTier = "staff" | "full" | "half" | "none";

/**
 * staff - Duleko staff, whatever else.
 * full  - ID approved and a skill certificate approved.
 * half  - only one of the two.
 */
export function verificationTier(person: {
  staff_role?: StaffRole | null;
  is_verified?: boolean;
  skill_verified?: boolean;
  verified_skill_ids?: string[];
}): VerificationTier {
  if (person.staff_role) return "staff";
  const id = Boolean(person.is_verified);
  const skill = Boolean(person.skill_verified) || (person.verified_skill_ids?.length ?? 0) > 0;
  if (id && skill) return "full";
  if (id || skill) return "half";
  return "none";
}

/**
 * Three badges, all the same seal shape:
 *
 *  - staff: the seal filled solid brand green with a bold white tick -
 *    "this account speaks for Duleko".
 *  - fully verified: the seal hollow, bold brand-green outline and tick.
 *  - half verified: the same hollow seal in orange - ID or a skill
 *    certificate checked, not both yet.
 */
export function VerifiedBadge({
  staffRole,
  verified,
  skillVerified,
  size = 16,
  className,
}: {
  staffRole?: StaffRole | null;
  /** ID check approved. */
  verified?: boolean;
  /** A skill certificate approved. */
  skillVerified?: boolean;
  size?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const tier = verificationTier({ staff_role: staffRole, is_verified: verified, skill_verified: skillVerified });
  if (tier === "none") return null;

  const label =
    tier === "staff" ? t("staffBadgeLabel") : tier === "full" ? t("fullyVerifiedLabel") : t("halfVerifiedLabel");
  const stroke = tier === "full" ? "stroke-brand-700" : "stroke-accent-600";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("inline-block shrink-0 align-middle", className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {tier === "staff" ? (
        <>
          <path d={SEAL_PATH} className="fill-brand-700" />
          <path
            d={CHECK_PATH}
            fill="none"
            stroke="white"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path d={SEAL_PATH} fill="none" className={stroke} strokeWidth="2.5" strokeLinejoin="round" />
          <path
            d={CHECK_PATH}
            fill="none"
            className={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
