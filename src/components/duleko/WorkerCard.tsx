import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SkillChip } from "./SkillIcon";
import { RatingStars } from "./Rating";
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
 * light chips that let each skill's own colour through.
 */
export function WorkerCard({ worker, online }: { worker: WorkerCardData; online?: boolean }) {
  const { t, lang } = useI18n();
  const place = locationShort(worker, lang);
  const skills = worker.skills ?? [];
  const blurb = worker.about?.trim();

  return (
    <Link
      to="/worker/$workerId"
      params={{ workerId: worker.id }}
      className="group relative block rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-slate-200/60 active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={worker.full_name} src={worker.avatar_url} size={56} online={online} />

        <div className="min-w-0 flex-1">
          {/* The name gets the whole line - Nepali names are long, and a
              status pill beside it was cutting them off. Rating and
              availability then share the line below: both are status, and
              together they still leave the name its full width. */}
          <h3 className="truncate font-semibold leading-tight text-slate-900">
            {worker.full_name}
          </h3>

          <div className="mt-1 flex items-center justify-between gap-2">
            <RatingStars value={Number(worker.rating)} count={worker.rating_count} />

            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                worker.is_available ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  worker.is_available ? "bg-green-500" : "bg-slate-400",
                )}
              />
              {worker.is_available ? t("availableNow") : t("notAvailable")}
            </span>
          </div>

          {/* Where, and how far - one line, since they answer one question. */}
          {(place || worker.distance_km != null) && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              {place && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{place}</span>
                </span>
              )}
              {place && worker.distance_km != null && (
                <span aria-hidden className="text-slate-300">
                  ·
                </span>
              )}
              {worker.distance_km != null && (
                <span className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700">
                  <Navigation className="h-3.5 w-3.5" aria-hidden />
                  {t("distanceAway", { km: formatNumber(worker.distance_km, lang) })}
                </span>
              )}
            </p>
          )}

          {blurb && <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">{blurb}</p>}

          {skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
      </div>
    </Link>
  );
}
