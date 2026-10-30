import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Image as ImageIcon, ShieldCheck, Upload } from "lucide-react";
import { CallPermissionChoice, callChoice } from "@/components/duleko/ContactPrivacyRows";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useTextRule } from "@/lib/text-rules";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import {
  addCertificate,
  listSkills,
  saveContact,
  setUserSkills,
  updateProfile,
  type UserSkillInput,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber, isValidNepaliPhone, normalisePhone, skillName } from "@/lib/utils";
import type { CallPermission } from "@/lib/types";
import { useMyProfileData } from "./use-my-profile-data";

/** Which part of the profile is being edited - one focused sheet each. */
export type EditorKind = "intro" | "details" | "skills" | "certificate";

/**
 * Every editor on your Profile. Each is a short sheet for one section,
 * saved on its own - change your phone without touching your skills.
 */
export function ProfileEditors({ open, onClose }: { open: EditorKind | null; onClose: () => void }) {
  return (
    <>
      <IntroEditor open={open === "intro"} onClose={onClose} />
      <DetailsEditor open={open === "details"} onClose={onClose} />
      <SkillsEditor open={open === "skills"} onClose={onClose} />
      <CertificateEditor open={open === "certificate"} onClose={onClose} />
    </>
  );
}

/** "12/100" under a field with a length limit. */
function Counter({ value, max }: { value: string; max: number }) {
  const { lang } = useI18n();
  return (
    <span className={cn("tabular-nums", value.length >= max ? "text-amber-700" : "text-slate-400")}>
      {formatNumber(value.length, lang)}/{formatNumber(max, lang)}
    </span>
  );
}

function SaveFooter({
  onCancel,
  onSave,
  saving,
  disabled,
  label,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <>
      <Button variant="outline" onClick={onCancel}>
        {t("cancel")}
      </Button>
      <Button loading={saving} disabled={disabled} onClick={onSave}>
        {!saving && <Check className="h-4 w-4" aria-hidden />}
        {label ?? t("save")}
      </Button>
    </>
  );
}

/** A small heading that splits a longer sheet into parts. */
function SheetSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={cn("min-w-0", className)}>
      <h3 id={id} className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Intro: name, headline, about
// ---------------------------------------------------------------------

function IntroEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const nameLocked = Boolean(profile?.is_verified);
  const rule = useTextRule();

  useEffect(() => {
    if (!open || !profile) return;
    setName(profile.full_name);
    setHeadline(profile.bio ?? "");
    setAbout(profile.about ?? "");
    setNameError(null);
    // Seed once per opening, not on every profile refetch while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(profile!.id, {
        ...(nameLocked ? {} : { full_name: name.trim() }),
        bio: headline.trim() || null,
        about: about.trim() || null,
        language: lang,
      }),
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  function submit() {
    if (!name.trim()) {
      setNameError(t("profileNameRequired"));
      return;
    }
    if (rule(nameLocked ? null : name, headline, about)) return;
    save.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("profileEditIntro")}
      footer={<SaveFooter onCancel={onClose} onSave={submit} saving={save.isPending} />}
    >
      <Field label={t("yourName")} error={nameError ?? (nameLocked ? undefined : rule(name))}>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          // 6600: a verified name is the name on the ID - staff change it.
          readOnly={nameLocked}
          aria-describedby={nameLocked ? "profile-name-locked" : undefined}
          className={cn(nameLocked && "cursor-not-allowed bg-slate-50 text-slate-600")}
          maxLength={80}
          autoComplete="name"
        />
      </Field>
      {nameLocked && (
        <p
          id="profile-name-locked"
          className="-mt-2 mb-3.5 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs leading-relaxed text-brand-800"
        >
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("kycNameLocked")}
        </p>
      )}
      <Field label={`${t("bio")} (${t("optional")})`} hint={t("bioHint")} error={rule(headline)}>
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={100}
          placeholder={t("profileHeadlinePlaceholder")}
        />
      </Field>
      <div className="mb-1">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="profile-about">{t("aboutYou")}</Label>
          <span className="text-xs">
            <Counter value={about} max={600} />
          </span>
        </div>
        <Textarea
          id="profile-about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={6}
          maxLength={600}
          placeholder={t("profileAboutPlaceholder")}
        />
        {rule(about) && <p className="mt-1 text-xs text-red-600">{rule(about)}</p>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Contact & details: phones, where you are, age and education
// ---------------------------------------------------------------------

function DetailsEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { contact } = useMyProfileData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [callPermission, setCallPermission] = useState<CallPermission>("accepted_work");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    province: null,
    district: null,
    municipality: null,
    ward: null,
    locality: null,
  });
  const [errors, setErrors] = useState<{ phone?: string; altPhone?: string; age?: string }>({});
  const rule = useTextRule();

  useEffect(() => {
    if (!open || !profile) return;
    setPhone(contact.data?.phone ?? "");
    setAltPhone(contact.data?.alt_phone ?? "");
    setCallPermission(callChoice(profile.call_permission));
    setAge(profile.age != null ? String(profile.age) : "");
    setEducation(profile.education ?? "");
    setLocation({
      province: profile.province,
      district: profile.district,
      municipality: profile.municipality,
      ward: profile.ward,
      locality: profile.locality,
    });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ageNumber = age.trim() ? Number(age) : null;
  // 6600: once verified, an age already given stays as the ID says.
  const ageLocked = Boolean(profile?.is_verified && profile.age != null);

  const save = useMutation({
    mutationFn: async () => {
      await updateProfile(profile!.id, {
        ...(ageLocked ? {} : { age: ageNumber }),
        education: education.trim() || null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
        call_permission: callPermission,
      });
      if (phone) await saveContact(profile!.id, normalisePhone(phone), altPhone ? normalisePhone(altPhone) : null);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["contact", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      await refreshProfile();
      toast(t("profileSaved"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  // Checked on Save rather than per keystroke: no red text while typing.
  function submit() {
    const next: typeof errors = {};
    if (phone && !isValidNepaliPhone(phone)) next.phone = t("phoneInvalid");
    if (altPhone && !isValidNepaliPhone(altPhone)) next.altPhone = t("phoneInvalid");
    // Duleko is for adults (Terms, Registration Policy).
    if (!ageLocked && ageNumber != null && (!Number.isInteger(ageNumber) || ageNumber < 18 || ageNumber > 100)) {
      next.age = t("profileAgeRule");
    }
    setErrors(next);
    if (Object.keys(next).length === 0 && !rule(education)) save.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("profileEditDetails")}
      footer={<SaveFooter onCancel={onClose} onSave={submit} saving={save.isPending} />}
    >
      <div className="space-y-5">
        <SheetSection title={t("profileSectionPhones")}>
          <Field label={t("phoneNumber")} hint={t("phoneHint")} error={errors.phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label={`${t("altPhone")} (${t("optional")})`} error={errors.altPhone}>
            <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
          </Field>
          <CallPermissionChoice value={callPermission} onChange={setCallPermission} />
        </SheetSection>

        <SheetSection title={t("whereYouAre")} className="border-t border-slate-100 pt-4">
          <LocationFields value={location} onChange={setLocation} />
        </SheetSection>

        <SheetSection title={t("profileSectionPersonal")} className="border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <Field
              label={ageLocked ? t("age") : `${t("age")} (${t("optional")})`}
              hint={ageLocked ? t("kycAgeLocked") : undefined}
              error={errors.age}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                readOnly={ageLocked}
                className={cn(ageLocked && "cursor-not-allowed bg-slate-50 text-slate-600")}
              />
            </Field>
            <Field label={`${t("highestEducation")} (${t("optional")})`} error={rule(education)}>
              <Input value={education} onChange={(e) => setEducation(e.target.value)} maxLength={100} />
            </Field>
          </div>
        </SheetSection>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Skills & rates
// ---------------------------------------------------------------------

interface SkillDraft {
  rate_amount: string;
  rate_unit: string;
  custom_label: string;
  custom_note: string;
}

const emptyDraft: SkillDraft = { rate_amount: "", rate_unit: "", custom_label: "", custom_note: "" };

function SkillsEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { skills: mySkills } = useMyProfileData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const allSkills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000, enabled: open });
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SkillDraft>>({});
  const rule = useTextRule();

  useEffect(() => {
    if (!open) return;
    const rows = mySkills.data ?? [];
    setSelected(rows.map((s) => s.id));
    const next: Record<string, SkillDraft> = {};
    for (const s of rows) {
      next[s.id] = {
        rate_amount: s.rate_amount != null ? String(s.rate_amount) : "",
        rate_unit: s.rate_unit ?? "",
        custom_label: s.custom_label ?? "",
        custom_note: s.custom_note ?? "",
      };
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setDrafts((prev) => (prev[id] ? prev : { ...prev, [id]: { ...emptyDraft } }));
  }

  function draftFor(id: string): SkillDraft {
    return drafts[id] ?? emptyDraft;
  }

  function setDraft(id: string, patch: Partial<SkillDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));
  }

  const save = useMutation({
    mutationFn: () => {
      const entries: UserSkillInput[] = selected.map((id) => {
        const d = draftFor(id);
        return {
          skill_id: id,
          custom_label: id === "other" ? d.custom_label.trim() || null : null,
          custom_note: id === "other" ? d.custom_note.trim() || null : null,
          rate_amount: d.rate_amount.trim() ? Number(d.rate_amount) : null,
          rate_unit: d.rate_amount.trim() && d.rate_unit.trim() ? d.rate_unit.trim() : null,
        };
      });
      return setUserSkills(profile!.id, entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast(t("profileSaved"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  const catalogue = allSkills.data ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("skillsAndRates")}
      className="sm:max-w-2xl"
      footer={
        <SaveFooter
          onCancel={onClose}
          onSave={() => {
            const other = selected.includes("other") ? draftFor("other") : null;
            if (!rule(other?.custom_label, other?.custom_note)) save.mutate();
          }}
          saving={save.isPending}
        />
      }
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm text-slate-600">{t("profileSkillsPickHint")}</p>
        <span className="shrink-0 text-xs font-semibold text-brand-700">
          {t("profileSkillsSelected", { count: formatNumber(selected.length, lang) })}
        </span>
      </div>
      {allSkills.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-9 rounded-full" />
          ))}
        </div>
      ) : (
        <SkillPicker skills={catalogue} selected={selected} onToggle={toggle} />
      )}

      {selected.length > 0 && catalogue.length > 0 && (
        <SheetSection title={t("profileRatesTitle")} className="mt-5 border-t border-slate-100 pt-4">
          <p className="-mt-1 mb-3 text-xs text-slate-500">{t("rateHint")}</p>
          <ul className="space-y-2.5">
            {selected.map((id) => {
              const skill = catalogue.find((s) => s.id === id);
              if (!skill) return null;
              const d = draftFor(id);
              return (
                <li key={id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <p className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <SkillTile skillId={skill.id} category={skill.category} className="h-8 w-8 rounded-lg bg-surface ring-1 ring-slate-200" />
                      <span className="truncate">{skillName(skill, lang)}</span>
                    </p>
                    <div className="flex items-center gap-1.5 sm:w-72 sm:shrink-0">
                      <span className="shrink-0 text-sm font-medium text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="h-9 w-24 shrink-0 bg-surface"
                        value={d.rate_amount}
                        onChange={(e) => setDraft(id, { rate_amount: e.target.value })}
                        placeholder={t("rateAmountPlaceholder")}
                        aria-label={`${skillName(skill, lang)} - ${t("rateAmountPlaceholder")}`}
                      />
                      <span className="shrink-0 text-sm text-slate-400">/</span>
                      <Input
                        className="h-9 min-w-0 flex-1 bg-surface"
                        value={d.rate_unit}
                        onChange={(e) => setDraft(id, { rate_unit: e.target.value })}
                        placeholder={t("rateUnitPlaceholder")}
                        maxLength={30}
                        aria-label={`${skillName(skill, lang)} - ${t("rateUnitPlaceholder")}`}
                      />
                    </div>
                  </div>
                  {id === "other" && (
                    <div className="mt-3 grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                      <Field label={t("othersSkillLabel")} className="mb-0 sm:mb-0" error={rule(d.custom_label)}>
                        <Input
                          value={d.custom_label}
                          onChange={(e) => setDraft(id, { custom_label: e.target.value })}
                          placeholder={t("othersSkillPlaceholder")}
                          maxLength={60}
                          className="h-9 bg-surface"
                        />
                      </Field>
                      <Field label={t("othersSkillNoteLabel")} className="mb-0 mt-2.5 sm:mt-0" error={rule(d.custom_note)}>
                        <Input
                          value={d.custom_note}
                          onChange={(e) => setDraft(id, { custom_note: e.target.value })}
                          placeholder={t("othersSkillNotePlaceholder")}
                          maxLength={300}
                          className="h-9 bg-surface"
                        />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </SheetSection>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------
// Certificate: the skill it proves, its name, the file. Staff check it (8300).
// ---------------------------------------------------------------------

function CertificateEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { user, profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { skills } = useMyProfileData();
  const mySkills = skills.data ?? [];
  const [skillId, setSkillId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setFile(null);
    setSkillId(null);
  }, [open]);

  // With one skill there's nothing to choose.
  const chosenSkill = skillId ?? (mySkills.length === 1 ? mySkills[0].id : null);

  const upload = useMutation({
    mutationFn: () => addCertificate(user!.id, profile!.id, title.trim(), chosenSkill, file!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] });
      toast(t("profileSaved"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e), "error"),
  });

  function choose(next: File | undefined) {
    if (!next) return;
    // Photos are shrunk before upload; a PDF goes up as-is.
    const limit = next.type === "application/pdf" ? 5 * 1024 * 1024 : MAX_PHOTO_INPUT_BYTES;
    if (next.size > limit) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setFile(next);
  }

  const ready = Boolean(title.trim() && file && chosenSkill);
  const FileIcon = file?.type === "application/pdf" ? FileText : ImageIcon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("addCertificate")}
      footer={
        <SaveFooter
          onCancel={onClose}
          onSave={() => upload.mutate()}
          saving={upload.isPending}
          disabled={!ready}
          label={t("upload")}
        />
      }
    >
      <p className="mb-3.5 flex gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t("certCheckHint")}
      </p>
      <div className="mb-3.5">
        <Label>{t("certSkillLabel")}</Label>
        {skills.isSuccess && mySkills.length === 0 ? (
          <p className="mt-1.5 text-sm text-slate-500">{t("certNeedSkill")}</p>
        ) : (
          <div role="radiogroup" aria-label={t("certSkillLabel")} className="mt-1.5 flex flex-wrap gap-2">
            {mySkills.map((s) => {
              const on = chosenSkill === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSkillId(s.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-medium transition-colors",
                    on
                      ? "border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600"
                      : "border-slate-200 bg-surface text-slate-700 hover:border-brand-300",
                  )}
                >
                  <SkillTile skillId={s.id} category={s.category} className="h-8 w-8 rounded-full bg-slate-50" />
                  {s.custom_label || skillName(s, lang)}
                  {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Field label={t("certificateTitlePlaceholder")}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={t("profileCertNamePlaceholder")} />
      </Field>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors focus-within:border-brand-500",
          file ? "border-brand-300 bg-brand-50/50" : "border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            file ? "bg-brand-100 text-brand-700" : "bg-surface text-slate-500 ring-1 ring-slate-200",
          )}
        >
          {file ? <FileIcon className="h-5 w-5" aria-hidden /> : <Upload className="h-5 w-5" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{file ? file.name : t("profileCertChoose")}</span>
          <span className="block text-xs text-slate-500">
            {file
              ? `${formatNumber((file.size / (1024 * 1024)).toFixed(1), lang)} MB · ${t("profileCertChange")}`
              : t("uploadCertificateHint")}
          </span>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
    </Dialog>
  );
}
