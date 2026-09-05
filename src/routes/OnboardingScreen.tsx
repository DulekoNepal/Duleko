import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/duleko/Layout";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { createProfile, listSkills, saveContact, setUserSkills, uploadAvatar } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { isValidNepaliPhone, normalisePhone } from "@/lib/utils";

const TOTAL_STEPS = 3;

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
      const profile = await createProfile(user.id, {
        full_name: fullName.trim(),
        about: about.trim() || null,
        avatar_url: avatarUrl,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        is_available: true,
        language: lang,
      });
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
    <div className="min-h-dvh bg-slate-50">
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
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-brand-600 transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        {step === 1 && (
          <>
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={fullName || "?"} src={avatarPreview} size={72} />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700">
                <Camera className="h-4 w-4" aria-hidden />
                {avatarPreview ? t("changePhoto") : t("addPhoto")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onPickPhoto(e.target.files?.[0])}
                />
              </label>
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

            <Field label={`${t("aboutYou")} (${t("optional")})`}>
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
            <p className="mb-4 text-sm text-slate-600">{t("whereYouAre")}</p>
            <LocationFields value={location} onChange={setLocation} />
            {errors.district && <p className="-mt-2 mb-3 text-sm text-red-600">{errors.district}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-base font-semibold text-slate-900">{t("yourSkills")}</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">
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
                <Field label={t("othersSkillNoteLabel")}>
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

        <div className="mt-6">
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
              {t("finishSetup")}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
