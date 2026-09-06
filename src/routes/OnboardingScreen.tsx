import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Camera, Check, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/duleko/Layout";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  createProfile,
  getMyProfile,
  listSkills,
  saveContact,
  setUserSkills,
  updateProfile,
  uploadAvatar,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, isValidNepaliPhone, normalisePhone } from "@/lib/utils";

const TOTAL_STEPS = 3;
const STEP_ICONS = [User, MapPin, Briefcase] as const;

export function OnboardingScreen() {
  const { t, lang } = useI18n();
  const { user, refreshProfile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue>({
    province: null,
    district: null,
    municipality: null,
    ward: null,
    locality: null,
  });
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [otherLabel, setOtherLabel] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      let avatarUrl: string | null = null;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(user.id, avatarFile);
        } catch {
          // A failed photo upload should never block someone from joining.
          avatarUrl = null;
        }
      }
      // If a previous attempt got this far but failed on the phone step
      // below (a duplicate number, say), the profile row already exists -
      // update it instead of trying to insert a second one for this user
      // and hitting the one-profile-per-account constraint.
      const existing = await getMyProfile(user.id);
      const profileInput = {
        full_name: fullName.trim(),
        about: about.trim() || null,
        // Don't overwrite a photo a previous attempt already uploaded just
        // because this retry didn't re-pick one.
        avatar_url: avatarUrl ?? existing?.avatar_url ?? null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
      };
      const profile = existing
        ? await updateProfile(existing.id, profileInput)
        : await createProfile(user.id, { ...profileInput, is_available: true });
      await saveContact(profile.id, normalisePhone(phone));
      if (skillIds.length > 0) {
        await setUserSkills(
          profile.id,
          skillIds.map((skill_id) => ({
            skill_id,
            custom_label: skill_id === "other" ? otherLabel.trim() || null : null,
            custom_note: skill_id === "other" ? otherNote.trim() || null : null,
          })),
        );
      }
      return profile;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 1) {
      if (fullName.trim().length < 2) next.fullName = t("required");
      if (!isValidNepaliPhone(phone)) next.phone = t("phoneInvalid");
    }
    if (step === 2) {
      if (!location.district) next.district = t("required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onPickPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label={t("back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">{t("onboardingTitle")}</h1>
            <p className="text-xs text-slate-500">
              {t("stepOf", { current: step, total: TOTAL_STEPS })}
            </p>
          </div>
          <LanguageToggle />
        </div>

        {/* Step dots - a clearer sense of progress and what's left than a bare bar. */}
        <div className="mx-auto flex max-w-lg items-center gap-1.5 px-4 pb-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "current" : "upcoming";
            return (
              <span
                key={n}
                aria-hidden
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  state === "upcoming" ? "bg-slate-100" : "bg-brand-600",
                )}
              />
            );
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <Card>
          <CardBody>
            <div className="mb-5 flex items-center gap-2">
              <SectionIcon icon={STEP_ICONS[step - 1]} />
              <h2 className="text-base font-semibold text-slate-900">
                {step === 1 ? t("basicInfo") : step === 2 ? t("whereYouAre") : t("yourSkills")}
              </h2>
            </div>

            {step === 1 && (
              <>
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <Avatar name={fullName || "?"} src={avatarPreview} size={88} className="shadow-md ring-4 ring-white" />
                    <label className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 transition-transform hover:scale-105">
                      <Camera className="h-4 w-4" aria-hidden />
                      <span className="sr-only">{avatarPreview ? t("changePhoto") : t("addPhoto")}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => onPickPhoto(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>

                <Field label={t("yourName")} error={errors.fullName}>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    autoComplete="name"
                    maxLength={80}
                  />
                </Field>

                <Field label={t("phoneNumber")} hint={t("phoneHint")} error={errors.phone}>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>

                <Field label={`${t("aboutYou")} (${t("optional")})`} className="mb-0">
                  <Textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder={t("aboutPlaceholder")}
                    maxLength={600}
                    rows={3}
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <LocationFields value={location} onChange={setLocation} />
                {errors.district && <p className="-mt-2 mb-3 text-sm text-red-600">{errors.district}</p>}
              </>
            )}

            {step === 3 && (
              <>
                <p className="-mt-2 mb-4 text-sm text-slate-500">
                  {t("skillsHint")} {t("skillsNoneHint")}
                </p>
                <SkillPicker
                  skills={skills.data ?? []}
                  selected={skillIds}
                  onToggle={(id) =>
                    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
                  }
                />

                {skillIds.includes("other") && (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-3">
                    <Field label={t("othersSkillLabel")}>
                      <Input
                        value={otherLabel}
                        onChange={(e) => setOtherLabel(e.target.value)}
                        placeholder={t("othersSkillPlaceholder")}
                        maxLength={60}
                      />
                    </Field>
                    <Field label={t("othersSkillNoteLabel")} className="mb-0">
                      <Input
                        value={otherNote}
                        onChange={(e) => setOtherNote(e.target.value)}
                        placeholder={t("othersSkillNotePlaceholder")}
                        maxLength={300}
                      />
                    </Field>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        <div className="mt-5">
          {step < TOTAL_STEPS ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (validateStep()) setStep(step + 1);
              }}
            >
              {t("next")}
            </Button>
          ) : (
            <Button size="lg" className="w-full" loading={save.isPending} onClick={() => save.mutate()}>
              <Check className="h-4 w-4" aria-hidden />
              {t("finishSetup")}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
