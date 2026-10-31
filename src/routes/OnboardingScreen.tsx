import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { HeaderToggles } from "@/components/duleko/Layout";
import type { LocationValue } from "@/components/duleko/LocationFields";
import { MobileNumberInput } from "@/components/duleko/PhonePinFields";
import { PlaceSearch } from "@/components/duleko/PlaceSearch";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { useI18n, type StringKey } from "@/lib/i18n";
import { useTextRule } from "@/lib/text-rules";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { applyReferral, createProfile, getMyProfile, listSkills, saveContact, setUserSkills, updateProfile, uploadAvatar } from "@/lib/queries";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { signInMobile } from "@/lib/phone-auth";
import {
  cleanReferralCode,
  clearPendingReferral,
  looksLikeReferralCode,
  readPendingReferral,
  referralErrorKey,
} from "@/lib/referral";
import { errorMessage } from "@/lib/supabase";
import { cn, isValidNepaliPhone, normalisePhone, skillName } from "@/lib/utils";

/**
 * Three short steps, one question each: who you are, where you are, what
 * you do. Everything else - who may call you (it starts at "people I've
 * accepted work from"), about you, payment details, ward and area - waits
 * in Profile for when it's needed, so joining takes a minute.
 */
const STEPS: { title: StringKey; blurb: StringKey }[] = [
  { title: "onbNameTitle", blurb: "onbNameBlurb" },
  { title: "onbPlaceTitle", blurb: "onbPlaceBlurb" },
  { title: "onbSkillsTitle", blurb: "onbSkillsBlurb" },
];

export function OnboardingScreen() {
  const { t, lang } = useI18n();
  const { user, refreshProfile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Joined with a mobile number: that's their phone here too, already
  // checked as free at sign-up, so it isn't asked for twice.
  const accountMobile = signInMobile(user);
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(accountMobile ?? "");
  // From an invite link (?ref=), or typed here. Optional, and folded away
  // unless a link already filled it in.
  const [referralCode, setReferralCode] = useState(readPendingReferral);
  const [showReferral, setShowReferral] = useState(() => Boolean(readPendingReferral()));
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
  const [skillQuery, setSkillQuery] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const rule = useTextRule();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const skills = useQuery({ queryKey: ["skills"], queryFn: listSkills });
  const shownSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    const all = skills.data ?? [];
    if (!q) return all;
    // Picked ones stay in view while searching, so they can be unpicked.
    return all.filter(
      (s) =>
        skillIds.includes(s.id) || s.name_en.toLowerCase().includes(q) || s.name_ne.toLowerCase().includes(q),
    );
  }, [skills.data, skillQuery, skillIds]);

  const save = useMutation({
    mutationFn: async (withSkills: boolean) => {
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
        : await createProfile(user.id, { ...profileInput, about: null, is_available: true, call_permission: "everyone" });
      await saveContact(profile.id, normalisePhone(phone));
      if (withSkills && skillIds.length > 0) {
        await setUserSkills(
          profile.id,
          skillIds.map((skill_id) => ({
            skill_id,
            custom_label: skill_id === "other" ? otherLabel.trim() || null : null,
            custom_note: skill_id === "other" ? otherNote.trim() || null : null,
          })),
        );
      }
      // Also optional: a code that doesn't go through never stops someone
      // joining - they can add it from Settings in their first week.
      let referral: { ok: true; name: string } | { ok: false; reason: string } | null = null;
      const code = cleanReferralCode(referralCode);
      if (code) {
        try {
          const { referrer_name } = await applyReferral(code);
          referral = { ok: true, name: referrer_name };
        } catch (err) {
          const key = referralErrorKey(err);
          // Already added by an earlier attempt at this same form.
          if (key !== "referralErrUsed") referral = { ok: false, reason: key ? t(key) : errorMessage(err) };
        }
        clearPendingReferral();
      }
      return { profile, referral };
    },
    onSuccess: async ({ referral }) => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await refreshProfile();
      if (referral?.ok) toast(t("referralApplied", { name: referral.name }));
      else if (referral) toast(t("referralErrLater", { reason: referral.reason }), "error");
      else toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 1) {
      if (fullName.trim().length < 2) next.fullName = t("required");
      if (rule(fullName)) return false;
      if (!isValidNepaliPhone(phone)) next.phone = t("phoneInvalid");
      const code = cleanReferralCode(referralCode);
      if (code && !looksLikeReferralCode(code)) next.referral = t("referralErrFormat");
    }
    if (step === 2) {
      if (!location.district) next.district = t("onbPlaceRequired");
    }
    if (step === 3 && skillIds.includes("other") && rule(otherLabel, otherNote)) return false;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onPickPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const current = STEPS[step - 1];
  const last = step === STEPS.length;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-30 bg-surface pt-[var(--sat)]">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setErrors({});
                setStep(step - 1);
              }}
              className="-ml-1.5 inline-flex items-center gap-1 rounded-lg p-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              aria-label={t("back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <span className="flex-1 text-xs font-medium text-slate-500">
            {t("stepOf", { current: step, total: STEPS.length })}
          </span>
          <HeaderToggles />
        </div>
        <div className="mx-auto flex max-w-md gap-1.5 px-4" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < step ? "bg-brand-600" : "bg-slate-200")}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-[calc(1rem+var(--sab,0px))] pt-6">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">{t(current.title)}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">{t(current.blurb)}</p>

        {step === 1 && (
          <>
            <div className="mb-5 flex justify-center">
              <label className="relative cursor-pointer">
                <Avatar name={fullName || "?"} src={avatarPreview} size={80} className="ring-4 ring-slate-100" />
                <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-white shadow ring-2 ring-surface">
                  <Camera className="h-4 w-4" aria-hidden />
                </span>
                <span className="sr-only">{avatarPreview ? t("changePhoto") : t("addPhoto")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onPickPhoto(e.target.files?.[0])}
                />
              </label>
            </div>

            <Field label={t("onbFullName")} error={errors.fullName || rule(fullName)}>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                maxLength={80}
                className="h-12"
              />
            </Field>

            <Field
              label={t("onbMobile")}
              hint={accountMobile ? t("onboardPhoneLocked") : undefined}
              error={errors.phone}
            >
              <MobileNumberInput value={phone} onChange={setPhone} readOnly={Boolean(accountMobile)} className="h-12" />
            </Field>

            {showReferral ? (
              <Field label={t("referralFieldLabel")} hint={t("referralFieldHint")} error={errors.referral}>
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="SANJ42"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={16}
                  className="h-12 font-mono tracking-widest"
                />
              </Field>
            ) : (
              <button
                type="button"
                onClick={() => setShowReferral(true)}
                className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                {t("onbHaveInvite")}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            )}
          </>
        )}

        {step === 2 && <PlaceSearch value={location} onChange={setLocation} error={errors.district} />}

        {step === 3 && (
          <>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                placeholder={t("onbSearchSkills")}
                aria-label={t("onbSearchSkills")}
                className="h-12 pl-9 pr-9"
                autoComplete="off"
              />
              {skillQuery && (
                <button
                  type="button"
                  onClick={() => setSkillQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  aria-label={t("activityClearSearch")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {skillIds.length > 0 && (
              <p className="mb-3 text-xs font-medium text-brand-700">
                {t("onbPicked", {
                  skills: skillIds
                    .map((id) => skills.data?.find((s) => s.id === id))
                    .filter(Boolean)
                    .map((s) => skillName(s!, lang))
                    .join(", "),
                })}
              </p>
            )}

            <SkillPicker
              skills={shownSkills}
              selected={skillIds}
              onToggle={(id) => setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))}
            />
            {skillQuery.trim() && shownSkills.length === 0 && (
              <p className="text-sm text-slate-500">{t("onbNoSkillMatch")}</p>
            )}

            {skillIds.includes("other") && (
              <div className="mt-4 rounded-xl border border-slate-200 p-3">
                <Field label={t("othersSkillLabel")} error={rule(otherLabel)}>
                  <Input
                    value={otherLabel}
                    onChange={(e) => setOtherLabel(e.target.value)}
                    placeholder={t("othersSkillPlaceholder")}
                    maxLength={60}
                  />
                </Field>
                <Field label={t("othersSkillNoteLabel")} className="mb-0" error={rule(otherNote)}>
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

        {/* The one big button stays at the bottom of the screen. */}
        <div className="sticky bottom-0 mt-auto bg-surface pb-1 pt-6">
          {!last ? (
            <Button
              size="lg"
              className="h-12 w-full"
              onClick={() => {
                if (validateStep()) setStep(step + 1);
              }}
            >
              {t("next")}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="h-12 w-full"
                loading={save.isPending && save.variables}
                disabled={save.isPending || skillIds.length === 0}
                onClick={() => {
                  if (validateStep()) save.mutate(true);
                }}
              >
                <Check className="h-4 w-4" aria-hidden />
                {t("finishSetup")}
              </Button>
              <Button
                variant="ghost"
                className="mt-1.5 w-full text-slate-500"
                loading={save.isPending && !save.variables}
                disabled={save.isPending}
                onClick={() => save.mutate(false)}
              >
                {t("onbOnlyHiring")}
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
