import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Globe2, MapPin, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SKILL_CATEGORY_ORDER, groupSkillsByCategory } from "@/components/duleko/SkillGrid";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createJobPost, getUserSkills, listSkills } from "@/lib/queries";
import { ALL_DISTRICTS, municipalitiesOf } from "@/lib/nepal";
import { errorMessage } from "@/lib/supabase";
import { PRICE_UNITS, PRICE_UNIT_LABEL, type PriceUnit } from "@/lib/price-units";
import { JOB_KIND_LOOK, jobBudgetText } from "./JobParts";
import { cn, formatDate, skillName, todayKey } from "@/lib/utils";
import { getCurrentPosition } from "@/lib/geolocation";
import type { JobPostKind, Profile, SkillCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<SkillCategory, StringKey> = {
  trades: "skillCategoryTrades",
  professional: "skillCategoryProfessional",
  personal: "skillCategoryPersonal",
};

/**
 * The two kinds of post, told apart by more than a word: hiring is blue
 * with a searching person, offering is orange with a megaphone - the same
 * colours and icons as the tags on every post card.
 */
const KINDS: {
  kind: JobPostKind;
  label: StringKey;
  hint: StringKey;
  selected: string;
  icon: string;
  title: string;
}[] = [
  {
    kind: "hire",
    label: "postKindHire",
    hint: "postKindHireHint",
    // The navy is made for light pages; dark mode gets a brighter blue.
    selected: "border-navy-600 bg-navy-50 dark:border-sky-400",
    icon: "bg-navy-600 text-white dark:bg-sky-500",
    title: "text-navy-700",
  },
  {
    kind: "offer",
    label: "postKindOffer",
    hint: "postKindOfferHint",
    selected: "border-accent-500 bg-accent-50",
    icon: "bg-accent-500 text-white",
    title: "text-accent-600",
  },
];

/**
 * Posting on the board, either way round (6700). "I need someone": what
 * kind of work, where, which day and (optionally) the budget. "I offer a
 * service": which of your skills, where you work, and (optionally) your
 * rate. Opens with the poster's own place filled in - or the area Home
 * is showing - so most people only type the title.
 */
export function PostJobDialog({
  open,
  onClose,
  profile,
  defaultDistrict,
  defaultSkill,
  defaultKind = "hire",
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  defaultDistrict?: string | null;
  defaultSkill?: string | null;
  defaultKind?: JobPostKind;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const startDistrict = defaultDistrict ?? profile.district ?? "";
  const ownPlace = startDistrict === profile.district;

  const [kind, setKind] = useState<JobPostKind>(defaultKind);
  const offering = kind === "offer";
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
  // What the price is for; null is the whole job.
  const [priceUnit, setPriceUnit] = useState<PriceUnit | null>(null);
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
  // You can only offer what's on your profile (6700).
  const mySkills = useQuery({
    queryKey: ["user-skills", profile.id],
    queryFn: () => getUserSkills(profile.id),
    enabled: open && offering,
  });
  const groups = groupSkillsByCategory(skills.data ?? []);
  const knownMunicipalities = municipalitiesOf(district);

  const mutation = useMutation({
    mutationFn: () =>
      createJobPost(profile.id, {
        kind,
        skill_id: skillId,
        title: title.trim(),
        details: details.trim() || null,
        district,
        municipality: municipality.trim() || null,
        // An offer post has no exact place, pin or day; the database sets its last day.
        location_text: offering ? null : place.trim(),
        work_date: offering ? null : workDate,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        // A unit means nothing without an amount.
        price_unit: budgetMin || budgetMax ? priceUnit : null,
        lat: offering ? null : (pin?.lat ?? null),
        lng: offering ? null : (pin?.lng ?? null),
      }),
    onSuccess: (post) => {
      toast(t(offering ? "postOfferPosted" : "postJobPosted"));
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
    if (!offering && place.trim().length < 2) next.place = t("required");
    if (!offering && workDate < todayKey()) next.workDate = t("errJobDatePast");
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
      title={t(offering ? "offerYourService" : "postJob")}
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
            {t(offering ? "postOfferSubmit" : "postJobSubmit")}
          </Button>
        </>
      }
    >
      <p className="mb-1.5 text-[13px] font-medium text-slate-700">{t("postKindQuestion")}</p>
      <div role="radiogroup" aria-label={t("postKindQuestion")} className="mb-4 grid grid-cols-2 gap-2">
        {KINDS.map(({ kind: option, label, hint, selected: selectedLook, icon: iconLook, title: titleLook }) => {
          const selected = kind === option;
          const Icon = JOB_KIND_LOOK[option].icon;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setKind(option);
                setSkillId("");
                setErrors({});
              }}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-2.5 text-left transition-colors",
                selected ? selectedLook : "border-slate-200 bg-surface hover:border-slate-300",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  selected ? iconLook : "bg-slate-100 text-slate-500",
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className={cn("text-sm font-bold", selected ? titleLook : "text-slate-800")}>{t(label)}</span>
              <span className="text-xs leading-snug text-slate-500">{t(hint)}</span>
            </button>
          );
        })}
      </div>

      {offering ? (
        <Field label={t("postOfferSkill")} error={errors.skill}>
          {mySkills.data && mySkills.data.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {t("postOfferNoSkills")}{" "}
              <Link to="/profile" onClick={onClose} className="font-semibold underline underline-offset-2">
                {t("jobAddSkills")}
              </Link>
            </p>
          ) : (
            <Select
              value={skillId}
              onChange={(e) => {
                setSkillId(e.target.value);
                clear("skill");
              }}
              disabled={mySkills.isLoading}
            >
              <option value="">{t("postJobSkillPick")}</option>
              {(mySkills.data ?? []).map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.id === "other" && skill.custom_label ? skill.custom_label : skillName(skill, lang)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
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
      )}

      <Field label={t("postJobTitle")} error={errors.title}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            clear("title");
          }}
          placeholder={t(offering ? "postOfferTitlePlaceholder" : "postJobTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={`${t("postJobDetails")} (${t("optional")})`}>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t(offering ? "postOfferDetailsPlaceholder" : "postJobDetailsPlaceholder")}
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

      {!offering && (
        <>
          <Field label={t("postJobPlace")} error={errors.place} hint={t("postJobPlaceHint")}>
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
        </>
      )}

      <Field
        label={`${t(offering ? "postOfferRate" : "postJobBudget")} (${t("optional")})`}
        error={errors.budget}
        hint={t(offering ? "postOfferRateHint" : "postJobBudgetHint")}
      >
        <div>
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
              aria-label={`${t(offering ? "postOfferRate" : "postJobBudget")}: ${t("postJobBudgetMin")}`}
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
              aria-label={`${t(offering ? "postOfferRate" : "postJobBudget")}: ${t("postJobBudgetMax")}`}
            />
          </div>
          {/* Only once there's an amount: one tap says what it's for. Most
              jobs stay on "Whole job" and never think about it. */}
          {(budgetMin || budgetMax) && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-xs font-medium text-slate-600">{t("postPricePer")}</p>
              <div role="radiogroup" aria-label={t("postPricePer")} className="flex flex-wrap gap-1.5">
                {[null, ...PRICE_UNITS].map((unit) => {
                  const selected = priceUnit === unit;
                  return (
                    <button
                      key={unit ?? "whole"}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPriceUnit(unit)}
                      className={cn(
                        "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-surface text-slate-700 hover:border-brand-300",
                      )}
                    >
                      {t(unit ? PRICE_UNIT_LABEL[unit] : "priceUnitWhole")}
                    </button>
                  );
                })}
              </div>
              {!errors.budget && (
                <p className="mt-2 text-xs text-slate-500">
                  {t("postPricePreview", {
                    price:
                      jobBudgetText(
                        {
                          budget_min: budgetMin ? Number(budgetMin) : null,
                          budget_max: budgetMax ? Number(budgetMax) : null,
                          price_unit: priceUnit,
                        },
                        lang,
                        t,
                      ) ?? "",
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      </Field>

      {!offering && (
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
      )}

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
        <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        {t(offering ? "postOfferPublicNote" : "postJobPublicNote")}
      </p>
    </Dialog>
  );
}
