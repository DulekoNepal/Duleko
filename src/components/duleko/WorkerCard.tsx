import { Link } from "@tanstack/react-router";
import { MapPin, Navigation } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "./Rating";
import { useI18n } from "@/lib/i18n";
import { formatNumber, locationLine, skillName } from "@/lib/utils";
import type { WorkerCardData } from "@/lib/types";

export function WorkerCard({ worker }: { worker: WorkerCardData }) {
  const { t, lang } = useI18n();
  const place = locationLine(worker, lang);
  const skills = worker.skills ?? [];

  return (
    <Link
      to="/worker/$workerId"
      params={{ workerId: worker.id }}
      className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="flex gap-3">
        <Avatar name={worker.full_name} src={worker.avatar_url} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900">{worker.full_name}</h3>
            <Badge tone={worker.is_available ? "success" : "muted"}>
              {worker.is_available ? t("availableNow") : t("notAvailable")}
            </Badge>
          </div>

          <div className="mt-1">
            <RatingStars value={Number(worker.rating)} count={worker.rating_count} />
          </div>

          {place && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {place}
            </p>
          )}

          {worker.distance_km != null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-brand-700">
              <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("distanceAway", { km: formatNumber(worker.distance_km, lang) })}
            </p>
          )}

          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.slice(0, 3).map((s) => (
                <Badge key={s.id} tone="brand">
                  <span aria-hidden>{s.emoji}</span>
                  {skillName(s, lang)}
                </Badge>
              ))}
              {skills.length > 3 && <Badge tone="neutral">+{skills.length - 3}</Badge>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
