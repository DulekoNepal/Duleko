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

/**
 * Two distinct badges, both the same spiky seal shape, both in the brand
 * green - so at a glance one reads as "this account speaks for Duleko"
 * and the other as "this person got checked out":
 *
 *  - staff (moderator/admin/technical_admin): the seal filled solid
 *    brand-700, with a bold white tick - the same mark across every
 *    tier, since viewers only need to know "this is staff", not which.
 *  - verified: the same seal, hollow - brand-700 outline only - with a
 *    brand-700 tick. Lighter weight on purpose, so it never gets
 *    mistaken for the staff mark.
 */
export function VerifiedBadge({
  staffRole,
  verified,
  size = 16,
  className,
}: {
  staffRole?: StaffRole | null;
  verified?: boolean;
  size?: number;
  className?: string;
}) {
  const { t } = useI18n();
  if (!staffRole && !verified) return null;

  const label = staffRole ? t("staffBadgeLabel") : t("verifiedBadgeLabel");

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
      {staffRole ? (
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
          <path
            d={SEAL_PATH}
            fill="none"
            className="stroke-brand-700"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={CHECK_PATH}
            fill="none"
            className="stroke-brand-700"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
