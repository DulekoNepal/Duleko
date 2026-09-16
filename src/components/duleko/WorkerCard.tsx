import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { SkillChip } from "./SkillIcon";
import { RatingStars } from "./Rating";
import { VerifiedBadge } from "./VerifiedBadge";
import { useI18n } from "@/lib/i18n";
import { cn, formatNumber, locationShort, skillName } from "@/lib/utils";
import type { WorkerCardData } from "@/lib/types";

/**
 * One person in a list of search results. The job of this card is to
 * answer, in one glance: who, how well rated, how far, what they do, and
 * can they take work right now.
 *
 * So it reads top-down in that order rather than as four rows of equal
 * weight - name and rating lead, the where/how-far line is one muted
 * line, their own words come next, and the trades sit at the bottom as
 * neutral chips, all one navy icon family, so a scan of the list reads
 * as one clean set of results rather than a wall of clashing hues.
 *
 * Built on the shared Card/CardBody, the same as the hero and pending-work
 * cards above it on Home - one white bordered block with the same hover
 * lift, so a list of these reads as more of the same page rather than a
 * different component that happens to sit nearby.
 */
export function WorkerCard({ worker, online }: { worker: WorkerCardData; online?: boolean }) {
  const { t, lang } = useI18n();
  const place = locationShort(worker, lang);
  const skills = worker.skills ?? [];
  const blurb = worker.about?.trim();

  // A brand-new worker has no rating yet - rather than filling that slot
  // with a "New on Duleko" label, this card just leaves it out, so the
  // meta line below is place/distance only for them instead of stretching
  // to fit an extra badge. Built as a list (not inline JSX) so the dot
  // separators between parts never dangle at the start or double up.
  const metaParts = [
    worker.rating_count > 0 && (
      <RatingStars key="rating" value={Number(worker.rating)} count={worker.rating_count} size={13} />
    ),
    place && (
      <span key="place" className="inline-flex min-w-0 items-center gap-1">
        <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate">{place}</span>
      </span>
    ),
    worker.distance_km != null && (
      <span key="distance" className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700">
        <Navigation className="h-3 w-3" aria-hidden />
        {t("distanceAway", { km: formatNumber(worker.distance_km, lang) })}
      </span>
    ),
  ].filter(Boolean);

  return (
    <Link
      to="/worker/$workerId"
      params={{ workerId: worker.id }}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card interactive className="h-full">
        <CardBody className="flex items-start gap-3 p-3.5">
          <Avatar name={worker.full_name} src={worker.avatar_url} size={52} online={online} />

          <div className="min-w-0 flex-1">
            {/* Name and availability share the top line - both are the
                headline facts, and pairing them frees the line below for
                rating, place and distance to sit together as one compact
                meta row instead of three stacked ones. */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-1 font-semibold leading-tight text-slate-900">
                <span className="truncate">{worker.full_name}</span>
                <VerifiedBadge staffRole={worker.staff_role} verified={worker.is_verified} />
              </h3>
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  worker.is_available ? "bg-green-500" : "bg-slate-300",
                )}
              />
              <span className="sr-only">{worker.is_available ? t("availableNow") : t("notAvailable")}</span>
            </div>

            {/* Rating, where, and how far - one meta line, all answering
                "should I tap this card" together rather than spread across
                separate rows. Whichever parts exist just line up with a dot
                between them, so a new worker with no rating yet still reads
                cleanly instead of leaving a gap or a stray leading dot. */}
            {metaParts.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                {metaParts.map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <span aria-hidden className="text-slate-300">
                        ·
                      </span>
                    )}
                    {part}
                  </Fragment>
                ))}
              </div>
            )}

            {blurb && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{blurb}</p>}

            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {skills.slice(0, 3).map((s) => (
                  <SkillChip key={s.id} skillId={s.id} compact>
                    {skillName(s, lang)}
                  </SkillChip>
                ))}
                {skills.length > 3 && (
                  <span className="text-[11px] font-medium text-slate-400">
                    +{formatNumber(skills.length - 3, lang)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quiet affordance that the whole card opens a profile. */}
          <ChevronRight
            className="h-4 w-4 shrink-0 self-center text-slate-300 transition-colors duration-200 group-hover:text-brand-500"
            aria-hidden
          />
        </CardBody>
      </Card>
    </Link>
  );
}
