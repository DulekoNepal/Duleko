import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useCanGoBack, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Info, LocateFixed, Minus, Plus, Users, X } from "lucide-react";
import { AppHeader } from "@/components/duleko/Layout";
import { DulekoMap, type DulekoMapHandle, type MapPin } from "@/components/duleko/map/DulekoMap";
import { useMapView } from "@/components/duleko/map/use-map-view";
import { JobCard } from "@/components/duleko/jobs/JobParts";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { RatingLine } from "@/components/duleko/WorkerList";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useHomeArea } from "@/hooks/use-home-area";
import { useLivePosition, useMyLocation } from "@/hooks/use-my-location";
import { useToast } from "@/hooks/use-toast";
import { listJobPostsInBounds, listSkills, mapPeople, type MapBounds, type MapPerson } from "@/lib/queries";
import { cn, formatNumber, skillName } from "@/lib/utils";
import type { JobPost } from "@/lib/types";

export type MapShow = "people" | "jobs" | "both";

function BackButton() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: "/home" }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

/** Rounded to ~1 km, so small drags reuse the last answer. */
function boundsKey(b: MapBounds | null): string | null {
  if (!b) return null;
  return [b.south, b.west, b.north, b.east].map((v) => v.toFixed(2)).join(",");
}

/**
 * The map of skilled people and open work requests: pins by area (people
 * are ~300 m unless they chose to show their exact spot), clusters when
 * zoomed out, your live position as a blue dot. Tapping a pin opens its
 * card at the bottom.
 */
export function MapScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const search = useSearch({ from: "/map" });
  const navigate = useNavigate({ from: "/map" });
  const [homeArea] = useHomeArea();
  const view = useMapView(homeArea);
  const saved = useMyLocation();
  const mapRef = useRef<DulekoMapHandle>(null);

  const show: MapShow = search.show ?? "both";
  const skill = search.skill ?? null;
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selected, setSelected] = useState<MapPin | null>(null);

  // Live GPS: straight away for someone who already said yes to location,
  // otherwise from the first tap on "Show where I am".
  const [tracking, setTracking] = useState(profile?.location_consent === "granted");
  const [flyOnFix, setFlyOnFix] = useState(false);
  const live = useLivePosition(tracking);
  const me = live.position ?? (saved ? { lat: saved.lat, lng: saved.lng } : null);

  useEffect(() => {
    if (flyOnFix && live.position) {
      mapRef.current?.flyTo(live.position.lat, live.position.lng, 16);
      setFlyOnFix(false);
    }
  }, [flyOnFix, live.position]);
  useEffect(() => {
    if (live.denied && flyOnFix) {
      toast(t("mapLocationDenied"), "error");
      setFlyOnFix(false);
    }
  }, [live.denied, flyOnFix, t, toast]);

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });

  const key = boundsKey(bounds);
  const people = useQuery({
    queryKey: ["map", "people", key, skill],
    queryFn: () => mapPeople(bounds!, skill),
    enabled: Boolean(bounds) && show !== "jobs",
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const jobs = useQuery({
    queryKey: ["map", "jobs", key, skill],
    queryFn: () => listJobPostsInBounds(bounds!, skill),
    enabled: Boolean(bounds) && show !== "people",
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const peopleById = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p])), [people.data]);
  const jobsById = useMemo(() => new Map((jobs.data ?? []).map((j) => [j.id, j])), [jobs.data]);

  const pins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = [];
    if (show !== "jobs") {
      for (const p of people.data ?? []) {
        out.push({ id: p.id, kind: "person", lat: p.lat, lng: p.lng, label: p.full_name, available: p.is_available });
      }
    }
    if (show !== "people") {
      for (const j of jobs.data ?? []) {
        if (j.lat != null && j.lng != null) out.push({ id: j.id, kind: "job", lat: j.lat, lng: j.lng, label: j.title });
      }
    }
    return out;
  }, [people.data, jobs.data, show]);

  const loading = (show !== "jobs" && people.isFetching) || (show !== "people" && jobs.isFetching);
  const nothing = Boolean(bounds) && !loading && pins.length === 0;

  function setShow(next: MapShow) {
    setSelected(null);
    navigate({ search: (prev) => ({ ...prev, show: next === "both" ? undefined : next }), replace: true });
  }

  // Two switches; one of them always stays on.
  function toggle(which: "people" | "jobs") {
    const peopleOn = show !== "jobs";
    const jobsOn = show !== "people";
    const nextPeople = which === "people" ? !peopleOn : peopleOn;
    const nextJobs = which === "jobs" ? !jobsOn : jobsOn;
    if (!nextPeople && !nextJobs) return;
    setShow(nextPeople && nextJobs ? "both" : nextPeople ? "people" : "jobs");
  }

  function locate() {
    if (live.position) {
      mapRef.current?.flyTo(live.position.lat, live.position.lng, 16);
      return;
    }
    setTracking(true);
    setFlyOnFix(true);
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors",
      active ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-surface text-slate-700 hover:bg-slate-50",
    );
  const control =
    "flex h-10 w-10 items-center justify-center bg-surface text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600";

  const person = selected?.kind === "person" ? peopleById.get(selected.id) : undefined;
  const job = selected?.kind === "job" ? jobsById.get(selected.id) : undefined;

  return (
    <>
      <AppHeader title={t("mapTitle")} back={<BackButton />} />
      {/* Fills the screen between the header and the tab bar (phones) or
          under the top bar (tablets and up). */}
      <div className="relative h-[calc(100dvh-118px-var(--sat)-var(--sab))] md:mx-auto md:h-[calc(100dvh-148px)] lg:h-[calc(100dvh-156px)] md:max-w-5xl md:px-4 lg:px-6">
        <div className="relative h-full overflow-hidden md:rounded-2xl md:border md:border-slate-200">
          {view.ready && (
            <DulekoMap
              ref={mapRef}
              key={`${view.lat},${view.lng}`}
              center={view}
              zoom={view.zoom}
              gestures="greedy"
              scale
              pins={pins}
              me={live.position ?? me}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onMapTap={() => setSelected(null)}
              onBoundsChange={setBounds}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {/* ---- What's shown ------------------------------------------ */}
          <div className="no-scrollbar absolute inset-x-0 top-0 z-[1000] flex gap-2 overflow-x-auto px-3 pt-3">
            <button type="button" className={chip(show !== "jobs")} onClick={() => toggle("people")} aria-pressed={show !== "jobs"}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t("mapPeople")}
              {show !== "jobs" && people.data && (
                <span className="rounded-full bg-white/25 px-1.5 text-[10px]">{formatNumber(people.data.length, lang)}</span>
              )}
            </button>
            <button type="button" className={chip(show !== "people")} onClick={() => toggle("jobs")} aria-pressed={show !== "people"}>
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              {t("mapJobs")}
              {show !== "people" && jobs.data && (
                <span className="rounded-full bg-white/25 px-1.5 text-[10px]">
                  {formatNumber(jobs.data.filter((j) => j.lat != null).length, lang)}
                </span>
              )}
            </button>
            <Select
              value={skill ?? ""}
              onChange={(e) => {
                setSelected(null);
                navigate({ search: (prev) => ({ ...prev, skill: e.target.value || undefined }), replace: true });
              }}
              aria-label={t("jobsAllSkills")}
              className="h-8 w-auto shrink-0 rounded-full border-slate-200 py-0 pl-3 pr-8 text-xs font-semibold shadow-sm"
              style={{ fontSize: 12 }}
            >
              <option value="">{t("jobsAllSkills")}</option>
              {(skills.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {skillName(s, lang)}
                </option>
              ))}
            </Select>
          </div>

          {/* ---- Controls ---------------------------------------------- */}
          <div className="absolute right-3 top-14 z-[1000] flex flex-col gap-2">
            <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl shadow-md">
              <button type="button" className={control} onClick={() => mapRef.current?.zoomIn()} aria-label={t("mapZoomIn")}>
                <Plus className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" className={control} onClick={() => mapRef.current?.zoomOut()} aria-label={t("mapZoomOut")}>
                <Minus className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className={cn(control, "rounded-xl shadow-md", live.position && "text-blue-600")}
              onClick={locate}
              aria-label={t("mapLocateMe")}
              title={t("mapLocateMe")}
            >
              <LocateFixed className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* ---- What's tapped, or a note ------------------------------- */}
          <div className="absolute inset-x-0 bottom-0 z-[1000] px-3 pb-6 md:pb-4">
            {person ? (
              <PersonSheet person={person} onClose={() => setSelected(null)} />
            ) : job ? (
              <JobSheet job={job} onClose={() => setSelected(null)} />
            ) : (
              <p className="mx-auto flex w-fit max-w-full items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-[11px] text-slate-600 shadow-md">
                <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                {loading ? t("mapLoading") : nothing ? t("mapNothingHere") : t("mapAreaNote")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SheetShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="animate-in-up relative mx-auto max-w-md">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute -top-3 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-slate-500 shadow-md hover:text-slate-800"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      {children}
    </div>
  );
}

function PersonSheet({ person, onClose }: { person: MapPerson; onClose: () => void }) {
  const { t, lang } = useI18n();
  const skills = person.skills.slice(0, 3).map((s) => skillName(s, lang)).join(" · ");
  return (
    <SheetShell onClose={onClose}>
      <Link
        to="/worker/$workerId"
        params={{ workerId: person.id }}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3 shadow-lg transition-colors hover:border-brand-300"
      >
        <Avatar name={person.full_name} src={person.avatar_url} size={48} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-sm font-semibold text-slate-900">{person.full_name}</span>
            <VerifiedBadge staffRole={person.staff_role} verified={person.is_verified} size={14} />
          </span>
          {skills && <span className="block truncate text-xs text-slate-600">{skills}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                person.is_available ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500",
              )}
            >
              {person.is_available ? t("availableShort") : t("busyShort")}
            </span>
            <RatingLine rating={person.rating} count={person.rating_count} />
            {person.exact && <span className="text-[11px] text-slate-400">{t("mapExactSpot")}</span>}
          </span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white">
          {t("view")}
        </span>
      </Link>
    </SheetShell>
  );
}

function JobSheet({ job, onClose }: { job: JobPost; onClose: () => void }) {
  return (
    <SheetShell onClose={onClose}>
      <div className="rounded-2xl shadow-lg">
        <JobCard post={job} />
      </div>
    </SheetShell>
  );
}
