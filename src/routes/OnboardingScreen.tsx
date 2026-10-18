import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Camera, Check, MapPin, Pencil, Trash2, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionIcon } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { CallPermissionChoice } from "@/components/duleko/ContactPrivacyRows";
import { HeaderToggles } from "@/components/duleko/Layout";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { MobileNumberInput } from "@/components/duleko/PhonePinFields";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { PaymentCard } from "@/components/duleko/payments/PaymentCard";
import { PaymentMethodForm, type PaymentFormResult } from "@/components/duleko/payments/PaymentMethodForm";
import { AddPaymentTiles, MAX_PAYMENT_METHODS } from "@/components/duleko/payments/PaymentMethodsManager";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  createProfile,
  getMyProfile,
  listSkills,
  saveContact,
  savePaymentMethod,
  setUserSkills,
  updateProfile,
  uploadAvatar,
} from "@/lib/queries";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { signInMobile } from "@/lib/phone-auth";
import { errorMessage } from "@/lib/supabase";
import { cn, isValidNepaliPhone, normalisePhone } from "@/lib/utils";
import type { CallPermission, PaymentKind } from "@/lib/types";

const TOTAL_STEPS = 4;
const STEP_ICONS = [User, MapPin, Briefcase, Wallet] as const;

/** Payment details typed in during sign-up, saved once the profile exists. */
interface PaymentDraft extends PaymentFormResult {
  key: number;
}

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
  const [callPermission, setCallPermission] = useState<CallPermission>("accepted_work");
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
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [payForm, setPayForm] = useState<{ index: number | null; kind: PaymentKind } | null>(null);
  // Ones already saved by an earlier attempt, so a retry doesn't add them twice.
  const savedPayments = useRef(new Set<number>());
  const nextPaymentKey = useRef(1);

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
        call_permission: callPermission,
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
      // Optional, like the photo: a failure here never stops someone joining.
      let paymentsFailed = false;
      for (const p of payments) {
        if (savedPayments.current.has(p.key)) continue;
        try {
          await savePaymentMethod({ folder: user.id, owner: profile.id, draft: p.draft, qr: p.qr });
          savedPayments.current.add(p.key);
        } catch {
          paymentsFailed = true;
        }
      }
      if (paymentsFailed) toast(t("onboardPayFailed"), "error");
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
    if (file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-surface pt-[var(--sat)]">
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
          <HeaderToggles />
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
                  "h-1.5 flex-1 rounded-full transition-colors duration-200",
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
            <div className="mb-4 flex items-center gap-2">
              <SectionIcon icon={STEP_ICONS[step - 1]} />
              <h2 className="text-base font-semibold text-slate-900">
                {step === 1
                  ? t("basicInfo")
                  : step === 2
                    ? t("whereYouAre")
                    : step === 3
                      ? t("yourSkills")
                      : t("onboardPayTitle")}
              </h2>
            </div>

            {step === 1 && (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="relative">
                    <Avatar name={fullName || "?"} src={avatarPreview} size={72} className="shadow-md ring-4 ring-surface" />
                    <label className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface text-slate-700 shadow ring-1 ring-slate-200 transition-transform hover:scale-105">
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

                <Field
                  label={t("phoneNumber")}
                  hint={accountMobile ? t("onboardPhoneLocked") : t("phoneHint")}
                  error={errors.phone}
                >
                  {accountMobile ? (
                    <MobileNumberInput value={phone} onChange={setPhone} readOnly />
                  ) : (
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  )}
                </Field>

                <CallPermissionChoice value={callPermission} onChange={setCallPermission} />

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
            {step === 4 && (
              <>
                <p className="-mt-2 mb-4 text-sm text-slate-500">{t("onboardPayIntro")}</p>
                {payments.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {payments.map((p, index) => (
                      <PaymentCard
                        key={p.key}
                        compact
                        method={{ ...p.draft, qr_url: p.qrPreview, is_primary: index === 0 }}
                        actions={
                          <>
                            <Button variant="outline" size="sm" onClick={() => setPayForm({ index, kind: p.draft.kind })}>
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              {t("payEdit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setPayments((list) => list.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              {t("payRemove")}
                            </Button>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
                {payments.length < MAX_PAYMENT_METHODS && (
                  <>
                    {payments.length > 0 && <p className="mb-2 text-xs font-semibold text-slate-500">{t("payAddTitle")}</p>}
                    <AddPaymentTiles onAdd={(kind) => setPayForm({ index: null, kind })} />
                  </>
                )}
                <PaymentMethodForm
                  open={Boolean(payForm)}
                  existing={
                    payForm?.index != null && payments[payForm.index]
                      ? { ...payments[payForm.index].draft, qr_url: payments[payForm.index].qrPreview }
                      : null
                  }
                  initialKind={payForm?.kind}
                  onClose={() => setPayForm(null)}
                  onSubmit={(result) => {
                    setPayments((list) => {
                      const editing = payForm?.index;
                      if (editing == null) return [...list, { ...result, key: nextPaymentKey.current++ }];
                      const before = list[editing];
                      return list.map((p, i) =>
                        i === editing
                          ? { ...result, key: before.key, qr: result.qr ?? (result.removeQr ? null : before.qr) }
                          : p,
                      );
                    });
                    setPayForm(null);
                  }}
                />
              </>
            )}
          </CardBody>
        </Card>

        <div className="mt-4">
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
            <>
              <Button size="lg" className="w-full" loading={save.isPending} onClick={() => save.mutate()}>
                <Check className="h-4 w-4" aria-hidden />
                {t("finishSetup")}
              </Button>
              {payments.length === 0 && (
                <Button variant="ghost" className="mt-2 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
                  {t("onboardPaySkip")}
                </Button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
