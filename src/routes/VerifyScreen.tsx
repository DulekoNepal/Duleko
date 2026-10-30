import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useCanGoBack, useRouter, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Hourglass,
  IdCard,
  Lock,
  ShieldAlert,
  X,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { useMyProfileData } from "@/components/duleko/profile/use-my-profile-data";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { KYC_DOC_ICON, KYC_DOC_LABEL, useMyKyc, useRejectionText } from "@/components/duleko/kyc/KycParts";
import { KycPhotos } from "@/components/duleko/kyc/KycStaffParts";
import { CertificatesStep } from "@/components/duleko/kyc/CertificatesStep";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import type { VerifyStep } from "@/router";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { KYC_DOC_TYPES, kycHasBack, submitKyc, type KycDraft } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { KycDocType, KycSubmission } from "@/lib/types";
import { cn, formatNumber, relativeTime, skillName } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

type Picked = { front: File | null; back: File | null };
type PickedAll = Record<KycDocType, Picked>;

const EMPTY: PickedAll = {
  citizenship: { front: null, back: null },
  national_id: { front: null, back: null },
  driving_license: { front: null, back: null },
  passport: { front: null, back: null },
};

function isComplete(type: KycDocType, p: Picked): boolean {
  return Boolean(p.front && (p.back || !kycHasBack(type)));
}

function isStarted(p: Picked): boolean {
  return Boolean(p.front || p.back);
}

/** Back to the two buttons from a step; from there, to wherever you came from (or your profile). */
function BackButton({ step }: { step?: VerifyStep }) {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() =>
        step
          ? router.navigate({ to: "/verify" })
          : canGoBack
            ? router.history.back()
            : router.navigate({ to: "/profile" })
      }
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={step ? t("verifyBackToChoices") : t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

const HEADER: Record<"choose" | VerifyStep, { title: StringKey; subtitle: StringKey }> = {
  choose: { title: "kycTitle", subtitle: "verifyLevelsTitle" },
  id: { title: "verifyChooseIdTitle", subtitle: "verifyIdHeader" },
  certificates: { title: "verifyChooseCertTitle", subtitle: "verifyCertHeader" },
};

/**
 * Get verified: two buttons, one for each check behind the badge (8300).
 * "ID check (KYC)" (?step=id) sends a photo of one ID - the national ID
 * card first, or citizenship, driving licence or passport; approval gives
 * the verified badge (6300). "Duleko certification" (?step=certificates)
 * sends up to five certificates, one per skill (8600); each approved one
 * verifies that skill. One check gives the orange badge, both the green.
 */
export function VerifyScreen() {
  const { t } = useI18n();
  const { profile } = useSession();
  const search = useSearch({ strict: false }) as { step?: VerifyStep };
  const step = profile?.staff_role ? undefined : search.step;

  if (!profile) return <SignInRequiredScreen title={t("kycTitle")} />;

  const header = HEADER[step ?? "choose"];

  return (
    <>
      <AppHeader title={t(header.title)} subtitle={t(header.subtitle)} back={<BackButton step={step} />} />
      <PageContainer>
        <div className="mx-auto max-w-xl space-y-3">
          {profile.staff_role ? (
            <StatusPanel
              icon={<VerifiedBadge staffRole={profile.staff_role} size={28} />}
              title={t("kycStaffTitle")}
              body={t("kycStaffBody")}
            >
              <Link to="/staff/verify" className="text-sm font-semibold text-brand-700 hover:underline">
                {t("kycQueueTitle")}
              </Link>
            </StatusPanel>
          ) : step === "id" ? (
            <IdStep />
          ) : step === "certificates" ? (
            <CertificatesStep />
          ) : (
            <VerifyChoices />
          )}
        </div>
      </PageContainer>
    </>
  );
}

/** ID check (KYC): verified, waiting, or the form - with what was sent. */
function IdStep() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const kyc = useMyKyc();
  if (!profile) return null;
  const latest = kyc.data;

  if (profile.is_verified) {
    return (
      <>
        <StatusPanel
          icon={<VerifiedBadge verified skillVerified={profile.verified_skill_ids.length > 0} size={28} />}
          title={t("kycVerifiedTitle")}
          body={t("kycVerifiedBody")}
        >
          <BackToChoices />
        </StatusPanel>
        {latest && latest.documents.length > 0 && <SentDocuments title={t("kycTheIdYouSent")} documents={latest.documents} />}
      </>
    );
  }
  if (kyc.isPending) return <CardSkeleton count={2} />;
  if (kyc.isError) {
    return <ErrorState message={errorMessage(kyc.error)} onRetry={() => kyc.refetch()} retryLabel={t("retry")} />;
  }
  if (latest?.status === "pending") {
    return (
      <>
        <StatusPanel
          icon={<Hourglass className="h-6 w-6 text-brand-700" aria-hidden />}
          title={t("kycPendingTitle")}
          body={t("kycPendingBody", { when: relativeTime(latest.created_at, lang) })}
        >
          <BackToChoices />
        </StatusPanel>
        {/* While it waits: the photos you sent. */}
        {latest.documents.length > 0 && <SentDocuments title={t("kycYouSent")} documents={latest.documents} />}
      </>
    );
  }
  return (
    <KycForm
      rejected={latest?.status === "rejected" ? latest : null}
      // After a "no": what you sent, right under the reason, so you can see what to fix.
      lastSent={
        latest?.status === "rejected" && latest.documents.length > 0 ? (
          <SentDocuments title={t("kycYouSentLastTime")} documents={latest.documents} />
        ) : null
      }
    />
  );
}

type StepState = "done" | "waiting" | "todo";

const STEP_LABEL: Record<StepState, StringKey> = {
  done: "verifyStepDone",
  waiting: "verifyStepWaiting",
  todo: "verifyStepTodo",
};

function StepBadge({ state, className }: { state: StepState; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge tone={state === "done" ? "success" : state === "waiting" ? "warning" : "neutral"} className={className}>
      {state === "done" && <Check className="h-3 w-3" aria-hidden />}
      {t(STEP_LABEL[state])}
    </Badge>
  );
}

/**
 * The two buttons - ID check (KYC) and Duleko certification - each with
 * where it stands. One gives the orange badge, both the green one.
 */
function VerifyChoices() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const kyc = useMyKyc();
  const { certificates, skills } = useMyProfileData();
  if (!profile) return null;

  const id: StepState = profile.is_verified ? "done" : kyc.data?.status === "pending" ? "waiting" : "todo";
  const skill: StepState =
    profile.verified_skill_ids.length > 0
      ? "done"
      : certificates.data?.some((c) => c.status === "pending")
        ? "waiting"
        : "todo";
  const verifiedNames = (skills.data ?? [])
    .filter((s) => profile.verified_skill_ids.includes(s.id))
    .map((s) => s.custom_label || skillName(s, lang))
    .join(", ");

  const choices: { step: VerifyStep; icon: typeof IdCard; title: StringKey; body: string; state: StepState }[] = [
    { step: "id", icon: IdCard, title: "verifyChooseIdTitle", body: t("verifyChooseIdBody"), state: id },
    {
      step: "certificates",
      icon: Award,
      title: "verifyChooseCertTitle",
      body: skill === "done" && verifiedNames ? t("verifySkillDone", { skills: verifiedNames }) : t("verifyChooseCertBody"),
      state: skill,
    },
  ];

  return (
    <>
      <section className="animate-in-up flex items-center gap-2.5 rounded-xl border border-slate-200 bg-surface p-3 shadow-sm sm:gap-3 sm:rounded-2xl sm:p-4">
        <VerifiedBadge verified={profile.is_verified} skillVerified={profile.verified_skill_ids.length > 0} size={24} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{t("verifyLevelsTitle")}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t("verifyLevelsBody")}</p>
        </div>
      </section>

      {/* Phones: a compact row each - icon, title and line, status, chevron. From 640px: two cards side by side. */}
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {choices.map(({ step, icon: Icon, title, body, state }, i) => (
          <Link
            key={step}
            to="/verify"
            search={{ step }}
            className={cn(
              "animate-in-up group flex items-center gap-3 rounded-xl border bg-surface p-3 shadow-sm transition-all hover:shadow-md",
              "sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-2xl sm:p-4 sm:hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
              state === "done" ? "border-brand-300 hover:border-brand-400" : "border-slate-200 hover:border-brand-300",
            )}
            style={{ "--delay": `${i * 60}ms` } as React.CSSProperties}
          >
            <span className="flex shrink-0 items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 sm:h-12 sm:w-12 sm:rounded-xl">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </span>
              <StepBadge state={state} className="hidden sm:inline-flex" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 sm:mt-3">
                <span className="truncate text-sm font-semibold text-slate-900 sm:text-base">{t(title)}</span>
                <StepBadge state={state} className="shrink-0 px-1.5 text-[10px] sm:hidden" />
              </span>
              <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600 sm:mt-1 sm:line-clamp-none sm:flex-1 sm:text-[13px] sm:leading-relaxed">
                {body}
              </span>
              <span className="mt-3 hidden items-center gap-1 text-sm font-semibold text-brand-700 sm:inline-flex">
                {t(state === "todo" ? "verifyStart" : "verifyOpen")}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 sm:hidden" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  );
}

/** The member's own ID photos - private to them and Duleko staff. */
function SentDocuments({ title, documents }: { title: string; documents: KycSubmission["documents"] }) {
  const { t } = useI18n();
  return (
    <section className="animate-in-up rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mb-3 mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        {t("kycOnlyYouAndStaff")}
      </p>
      <KycPhotos documents={documents} />
    </section>
  );
}

function BackToChoices() {
  const { t } = useI18n();
  return (
    <Link to="/verify" className="text-sm font-semibold text-brand-700 hover:underline">
      {t("verifyBackToChoices")}
    </Link>
  );
}

function StatusPanel({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="animate-in-up flex flex-col items-center rounded-2xl border border-slate-200 bg-surface px-5 py-7 text-center shadow-sm">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">{icon}</span>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-600">{body}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------

function KycForm({
  rejected,
  lastSent,
}: {
  rejected: Pick<KycSubmission, "rejection_code" | "rejection_note"> | null;
  /** The photos sent last time, shown under the reason they weren't accepted. */
  lastSent?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  const { user, profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rejectionText = useRejectionText();
  const [picked, setPicked] = useState<PickedAll>(EMPTY);
  // The national ID card comes first and starts open.
  const [open, setOpen] = useState<KycDocType | null>("national_id");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const complete = KYC_DOC_TYPES.filter((type) => isComplete(type, picked[type]));
  const partial = KYC_DOC_TYPES.filter((type) => isStarted(picked[type]) && !isComplete(type, picked[type]));
  const ready = complete.length > 0 && partial.length === 0;

  const send = useMutation({
    mutationFn: () => {
      const drafts: KycDraft[] = complete.map((type) => ({
        type,
        front: picked[type].front!,
        back: kycHasBack(type) ? picked[type].back : null,
      }));
      return submitKyc(user!.id, drafts, (done, total) => setProgress({ done, total }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-kyc", profile?.id] });
      toast(t("kycSent"));
      window.scrollTo({ top: 0 });
    },
    onError: (e) => toast(errorMessage(e), "error"),
    onSettled: () => setProgress(null),
  });

  function pick(type: KycDocType, side: keyof Picked, file: File | null) {
    if (file && file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setPicked((prev) => ({ ...prev, [type]: { ...prev[type], [side]: file } }));
  }

  return (
    <>
      {rejected && (
        <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{t("kycRejectedTitle")}</h2>
            <p className="mt-0.5 text-sm text-slate-700">
              {rejectionText(rejected.rejection_code, rejected.rejection_note)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("kycRejectedHint")}</p>
          </div>
        </section>
      )}
      {lastSent}

      <section className="rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-sm sm:p-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BadgeCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-slate-700">{t("kycIntro")}</p>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {t("kycPrivacy")}
        </p>
      </section>

      <section aria-labelledby="kyc-docs-title">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-0.5">
          <h2 id="kyc-docs-title" className="text-sm font-semibold text-slate-900">
            {t("kycYourId")}
          </h2>
          <p
            className={cn("text-xs font-semibold", complete.length > 0 ? "text-green-700" : "text-amber-700")}
            aria-live="polite"
          >
            {complete.length > 0 ? t("kycHaveOne") : t("kycNeedOne")}
          </p>
        </div>
        <div className="space-y-2">
          {KYC_DOC_TYPES.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              picked={picked[type]}
              anyComplete={complete.length > 0}
              open={open === type}
              onToggle={() => setOpen((cur) => (cur === type ? null : type))}
              onPick={(side, file) => pick(type, side, file)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-surface p-3.5 sm:p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kycTipsTitle")}</h2>
        <ul className="space-y-1.5 text-sm text-slate-700">
          {[t("kycTipWhole"), t("kycTipLight"), t("kycTipName", { name: profile?.full_name ?? "" })].map((tip) => (
            <li key={tip} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {partial.length > 0 && (
        <p className="px-0.5 text-sm text-amber-700" role="status">
          {t("kycPartial", { doc: t(KYC_DOC_LABEL[partial[0]]) })}
        </p>
      )}

      <Button size="lg" className="w-full" disabled={!ready} loading={send.isPending} onClick={() => send.mutate()}>
        {progress
          ? t("kycUploading", { done: formatNumber(progress.done, lang), total: formatNumber(progress.total, lang) })
          : t("kycSubmit")}
      </Button>
    </>
  );
}

function DocumentCard({
  type,
  picked,
  anyComplete,
  open,
  onToggle,
  onPick,
}: {
  type: KycDocType;
  picked: Picked;
  anyComplete: boolean;
  open: boolean;
  onToggle: () => void;
  onPick: (side: keyof Picked, file: File | null) => void;
}) {
  const { t } = useI18n();
  const Icon = KYC_DOC_ICON[type];
  const hasBack = kycHasBack(type);
  const done = isComplete(type, picked);
  const started = isStarted(picked);
  const panelId = `kyc-doc-${type}`;

  const chip = done ? (
    <Badge tone="success">
      <Check className="h-3 w-3" aria-hidden />
      {t("kycAdded")}
    </Badge>
  ) : started ? (
    <Badge tone="warning">{picked.front ? t("kycBackMissing") : t("kycFrontMissing")}</Badge>
  ) : anyComplete ? (
    <Badge tone="muted">{t("kycOptional")}</Badge>
  ) : type === "national_id" ? (
    <Badge tone="success">{t("kycDocRecommended")}</Badge>
  ) : (
    <Badge tone="neutral">{t("kycRequiredOne")}</Badge>
  );

  return (
    <section
      className={cn(
        "rounded-2xl border bg-surface shadow-sm transition-colors",
        done ? "border-brand-300" : started ? "border-amber-200" : "border-slate-200",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{t(KYC_DOC_LABEL[type])}</span>
        {chip}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="grid grid-cols-2 gap-2.5 border-t border-slate-100 p-3">
          <PhotoSlot
            label={hasBack ? t("kycFront") : t("kycPhotoPage")}
            file={picked.front}
            onPick={(file) => onPick("front", file)}
          />
          {hasBack && <PhotoSlot label={t("kycBack")} file={picked.back} onPick={(file) => onPick("back", file)} />}
        </div>
      )}
    </section>
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/** One side of a document: an empty box to tap, or the photo with Change and Remove. */
function PhotoSlot({ label, file, onPick }: { label: string; file: File | null; onPick: (file: File | null) => void }) {
  const { t } = useI18n();
  const preview = useObjectUrl(file);
  const input = (
    <input
      type="file"
      accept={ACCEPT}
      className="sr-only"
      onChange={(e) => {
        const next = e.target.files?.[0];
        if (next) onPick(next);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium text-slate-600">{label}</p>
      {file && preview ? (
        <div className="relative">
          <label className="block cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-600">
            <img src={preview} alt={label} className="aspect-[3/2] w-full bg-slate-100 object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim/70 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white">
              {t("kycChangePhoto")}
            </span>
            {input}
          </label>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label={t("kycRemovePhoto")}
            title={t("kycRemovePhoto")}
            className="absolute right-1.5 top-1.5 rounded-full bg-scrim/60 p-1 text-white transition-colors hover:bg-scrim/80"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <label className="flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 focus-within:border-brand-500">
          <Camera className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold">{t("kycAddPhoto")}</span>
          {input}
        </label>
      )}
    </div>
  );
}
