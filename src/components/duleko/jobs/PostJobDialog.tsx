import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Globe2, MapPin, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SKILL_CATEGORY_ORDER, groupSkillsByCategory } from "@/components/duleko/SkillGrid";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createJobPost, listSkills } from "@/lib/queries";
import { ALL_DISTRICTS, municipalitiesOf } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { cn, formatDate, skillName, todayKey } from "@/lib/utils";
import { getCurrentPosition } from "@/lib/geolocation";
import type { Profile, SkillCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<SkillCategory, StringKey> = {
  trades: "skillCategoryTrades",
  professional: "skillCategoryProfessional",
  personal: "skillCategoryPersonal",
};

/**
 * "Post a job": what kind of work, where, which day and (optionally) the
 * budget. Opens with the poster's own place filled in - or the area Home
 * is showing - so most people only type the title.
 */
export function PostJobDialog({
  open,
  onClose,
  profile,
  defaultDistrict,
  defaultSkill,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  defaultDistrict?: string | null;
  defaultSkill?: string | null;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const startDistrict = defaultDistrict ?? profile.district ?? "";
  const ownPlace = startDistrict === profile.district;

  const [skillId, setSkillId] = useState(defaultSkill ?? "");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [district, setDistrict] = useState(startDistrict);
  const [municipality, setMunicipality] = useState(ownPlace ? (profile.municipality ?? "") : "");
  const [place, setPlace] = useState(
    ownPlace
      ? [profile.locality, profile.ward ? `${lang === "ne" ? "वडा" : "Ward"} ${profile.ward}` : null]
          .filter(Boolean)
          .join(", ")
      : "",
  );
  const [workDate, setWorkDate] = useState(todayKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function pinHere() {
    setLocating(true);
    getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast(t("mapLocationDenied"), "error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000, enabled: open });
  const groups = groupSkillsByCategory(skills.data ?? []);
  const knownMunicipalities = municipalitiesOf(district);

  const mutation = useMutation({
    mutationFn: () =>
      createJobPost(profile.id, {
        skill_id: skillId,
        title: title.trim(),
        details: details.trim() || null,
        district,
        municipality: municipality.trim() || null,
        location_text: place.trim(),
        work_date: workDate,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
      }),
    onSuccess: (post) => {
      toast(t("postJobPosted"));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      onClose();
      navigate({ to: "/jobs/$jobId", params: { jobId: post.id } });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!skillId) next.skill = t("errJobSkillRequired");
    if (title.trim().length < 3) next.title = t("required");
    if (!district) next.district = t("required");
    if (place.trim().length < 2) next.place = t("required");
    if (workDate < todayKey()) next.workDate = t("errJobDatePast");
    const lo = budgetMin ? Number(budgetMin) : null;
    const hi = budgetMax ? Number(budgetMax) : null;
    if ((lo != null && !(lo > 0)) || (hi != null && !(hi > 0))) next.budget = t("errJobBadAmount");
    else if (lo != null && hi != null && hi < lo) next.budget = t("postJobBudgetOrder");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const clear = (key: string) => setErrors((prev) => ({ ...prev, [key]: "" }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("postJob")}
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            {t("cancel")}
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => {
              if (validate()) mutation.mutate();
            }}
          >
            {t("postJobSubmit")}
          </Button>
        </>
      }
    >
      <Field label={t("postJobSkill")} error={errors.skill}>
        <Select
          value={skillId}
          onChange={(e) => {
            setSkillId(e.target.value);
            clear("skill");
          }}
        >
          <option value="">{t("postJobSkillPick")}</option>
          {SKILL_CATEGORY_ORDER.map((category) =>
            groups[category].length > 0 ? (
              <optgroup key={category} label={t(CATEGORY_LABEL[category])}>
                {groups[category].map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skillName(skill, lang)}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </Select>
      </Field>

      <Field label={t("postJobTitle")} error={errors.title}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            clear("title");
          }}
          placeholder={t("postJobTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={`${t("postJobDetails")} (${t("optional")})`}>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t("postJobDetailsPlaceholder")}
          maxLength={800}
          rows={3}
          className="min-h-20"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("district")} error={errors.district}>
          <Select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setMunicipality("");
              clear("district");
            }}
          >
            <option value="">{t("selectDistrict")}</option>
            {ALL_DISTRICTS.map((d) => (
              <option key={d.en} value={d.en}>
                {lang === "ne" ? d.ne : d.en}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`${t("municipality")} (${t("optional")})`}>
          {knownMunicipalities.length > 0 ? (
            <Select value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
              <option value="">-</option>
              {knownMunicipalities.map((m) => (
                <option key={m.en} value={m.en}>
                  {lang === "ne" ? m.ne : m.en}
                </option>
              ))}
            </Select>
          ) : (
            <Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} maxLength={80} />
          )}
        </Field>
      </div>

      <Field label={t("postJobPlace")} error={errors.place}>
        <Input
          value={place}
          onChange={(e) => {
            setPlace(e.target.value);
            clear("place");
          }}
          placeholder={t("postJobPlacePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={t("postJobDate")} error={errors.workDate}>
        <div>
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            aria-expanded={calendarOpen}
            className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-surface px-3 text-sm font-medium text-slate-900 transition-colors duration-200 hover:border-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
              {formatDate(workDate, lang)}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", calendarOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {calendarOpen && (
            <div className="mt-3">
              <AvailabilityCalendar
                days={[]}
                weeks={6}
                selectedDay={workDate}
                onSelectDay={(day) => {
                  setWorkDate(day);
                  clear("workDate");
                  setCalendarOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </Field>

      <Field label={`${t("postJobBudget")} (${t("optional")})`} error={errors.budget} hint={t("postJobBudgetHint")}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetMin}
            onChange={(e) => {
              setBudgetMin(e.target.value);
              clear("budget");
            }}
            placeholder={t("postJobBudgetMin")}
            aria-label={`${t("postJobBudget")}: ${t("postJobBudgetMin")}`}
          />
          <span className="text-slate-400" aria-hidden>
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={budgetMax}
            onChange={(e) => {
              setBudgetMax(e.target.value);
              clear("budget");
            }}
            placeholder={t("postJobBudgetMax")}
            aria-label={`${t("postJobBudget")}: ${t("postJobBudgetMax")}`}
          />
        </div>
      </Field>

      <Field label={`${t("postJobPin")} (${t("optional")})`} hint={pin ? undefined : t("postJobPinHint")}>
        {pin ? (
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
            <MapPin className="h-4 w-4 shrink-0 fill-brand-600 text-brand-600 [&>circle]:fill-brand-50" aria-hidden />
            <span className="min-w-0 flex-1 text-xs text-brand-900">{t("postJobPinSet")}</span>
            <button
              type="button"
              onClick={() => setPin(null)}
              aria-label={t("postJobPinRemove")}
              className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" loading={locating} onClick={pinHere}>
            <MapPin className="h-4 w-4" aria-hidden />
            {t("postJobPinAdd")}
          </Button>
        )}
      </Field>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
        <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        {t("postJobPublicNote")}
      </p>
    </Dialog>
  );
}
