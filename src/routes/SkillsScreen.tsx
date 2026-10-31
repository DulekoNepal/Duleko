import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useCanGoBack, useParams, useRouter, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Award, Briefcase, Check, ChevronRight, IdCard, Pencil, Plus } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { VerifiedBadge, verificationTier, type VerificationTier } from "@/components/duleko/VerifiedBadge";
import { useMyKyc } from "@/components/duleko/kyc/KycParts";
import { ProfileEditors, type EditorKind } from "@/components/duleko/profile/ProfileEditors";
import { EmptyNote, EmptyPrompt, SectionSkeleton } from "@/components/duleko/profile/ProfileUI";
import { useMyProfileData } from "@/components/duleko/profile/use-my-profile-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, FullPageLoader } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useI18n, type StringKey } from "@/lib/i18n";
import { getProfile, getUserSkills } from "@/lib/queries";
import type { Certificate, Profile, UserSkillDetail } from "@/lib/types";
import { cn, formatMoney, formatNumber, skillName } from "@/lib/utils";

/**
 * Skills and badge: where a tap on a profile cover leads (DulekoCover).
 * Your own (/skills) lists your skills with what Duleko has checked, a
 * way to send a certificate for the rest and to add or change skills,
 * and the two steps behind the badge, each opening Get verified.
 * Someone else's (/worker/<handle>/skills) is the same, read-only.
 * ?skill= scrolls to that skill and lights it up.
 */

type StepState = "done" | "waiting" | "todo";

const STEP_LABEL: Record<StepState, StringKey> = {
  done: "verifyStepDone",
  waiting: "verifyStepWaiting",
  todo: "verifyStepTodo",
};

const TIER_LABEL: Record<VerificationTier, StringKey> = {
  full: "fullyVerifiedLabel",
  half: "halfVerifiedLabel",
  none: "coverNotVerified",
  staff: "coverDulekoTeam",
};

function BackButton() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: "/profile" }))}
      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function StepBadge({ state }: { state: StepState }) {
  const { t } = useI18n();
  return (
    <Badge tone={state === "done" ? "success" : state === "waiting" ? "warning" : "neutral"} className="shrink-0">
      {state === "done" && <Check className="h-3 w-3" aria-hidden />}
      {t(STEP_LABEL[state])}
    </Badge>
  );
}

/**
 * The badge and the two checks behind it. On your own page each check
 * opens its step in Get verified; on someone else's it only says which
 * checks are done.
 */
function BadgeCard({
  person,
  steps,
  own,
}: {
  person: Pick<Profile, "staff_role" | "is_verified" | "verified_skill_ids">;
  steps: { id: StepState; skill: StepState };
  own: boolean;
}) {
  const { t } = useI18n();
  const tier = verificationTier(person);
  const rows: { step: "id" | "certificates"; icon: typeof IdCard; label: StringKey; state: StepState }[] = [
    { step: "id", icon: IdCard, label: own ? "verifyChooseIdTitle" : "skillsStepIdOther", state: steps.id },
    {
      step: "certificates",
      icon: Award,
      label: own ? "verifyChooseCertTitle" : "skillsStepSkillOther",
      state: steps.skill,
    },
  ];
  return (
    <section id="badge" className="animate-in-up rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-sm sm:p-4">
      <div className="flex items-center gap-3">
        <VerifiedBadge
          staffRole={person.staff_role}
          verified={person.is_verified}
          skillVerified={person.verified_skill_ids.length > 0}
          size={28}
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{t(TIER_LABEL[tier])}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {tier === "staff" ? t("kycStaffBody") : t("verifyLevelsBody")}
          </p>
        </div>
      </div>
      {tier !== "staff" && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {rows.map(({ step, icon: Icon, label, state }) => {
            const inner = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{t(label)}</span>
                <StepBadge state={state} />
                {own && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
              </>
            );
            return (
              <li key={step}>
                {own ? (
                  <Link
                    to="/verify"
                    search={{ step }}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-2.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Every skill with where it stands: checked by Duleko, a certificate being
 * checked, or (your own only) a button to send one.
 */
function SkillStatusList({
  skills,
  verifiedIds,
  certificates,
  own,
  focus,
}: {
  skills: UserSkillDetail[];
  verifiedIds: string[];
  certificates: Certificate[];
  own: boolean;
  focus?: string;
}) {
  const { t, lang } = useI18n();
  // Verified skills first, the rest in profile order.
  const ordered = [...skills].sort((a, b) => Number(verifiedIds.includes(b.id)) - Number(verifiedIds.includes(a.id)));
  return (
    <ul className="-my-1 divide-y divide-slate-100">
      {ordered.map((s) => {
        const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
        const verified = verifiedIds.includes(s.id);
        const pending = !verified && certificates.some((c) => c.skill_id === s.id && c.status === "pending");
        return (
          <li
            key={s.id}
            id={`skill-${s.id}`}
            className={cn(
              "-mx-2 flex min-w-0 scroll-mt-36 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-700",
              focus === s.id && "bg-brand-50 ring-1 ring-brand-200",
            )}
          >
            <SkillTile skillId={s.id} category={s.category} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
              <p className="truncate text-xs text-slate-500">
                {s.rate_amount != null
                  ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                  : t("rateNotSet")}
              </p>
            </div>
            {verified ? (
              <Badge tone="success" className="shrink-0">
                <Check className="h-3 w-3" aria-hidden />
                {t("certStatusApproved")}
              </Badge>
            ) : pending ? (
              <Badge tone="warning" className="shrink-0">
                {t("certStatusPending")}
              </Badge>
            ) : own ? (
              <Link
                to="/verify"
                search={{ step: "certificates" }}
                aria-label={t("skillsVerifyAria", { skill: label })}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                <Award className="h-3.5 w-3.5" aria-hidden />
                {t("skillsVerify")}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The skill named in ?skill=: scrolled to, lit up for a moment. */
function useFocusedSkill(ready: boolean) {
  const { skill } = useSearch({ strict: false }) as { skill?: string };
  const [focus, setFocus] = useState<string | undefined>(skill);
  useEffect(() => {
    if (!ready || !skill) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`skill-${skill}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    const timer = setTimeout(() => setFocus(undefined), 2400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [ready, skill]);
  return focus;
}

/** /skills - your own skills and badge, with ways to add skills and get them checked. */
export function MySkillsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { skills, certificates } = useMyProfileData();
  const kyc = useMyKyc();
  const [editor, setEditor] = useState<EditorKind | null>(null);
  const focus = useFocusedSkill(skills.isSuccess);

  if (!profile) return <SignInRequiredScreen title={t("skillsPageTitle")} />;

  const list = skills.data ?? [];
  const certs = certificates.data ?? [];
  const verifiedCount = list.filter((s) => profile.verified_skill_ids.includes(s.id)).length;
  const steps = {
    id: profile.is_verified ? "done" : kyc.data?.status === "pending" ? "waiting" : "todo",
    skill:
      profile.verified_skill_ids.length > 0 ? "done" : certs.some((c) => c.status === "pending") ? "waiting" : "todo",
  } satisfies Record<string, StepState>;

  return (
    <>
      <AppHeader title={t("skillsPageTitle")} subtitle={t("skillsPageMine")} back={<BackButton />} />
      <PageContainer>
        <div className="mx-auto max-w-xl space-y-3">
          <BadgeCard person={profile} steps={steps} own />
          <SectionCard
            compact
            icon={Briefcase}
            title={t("skillsAndRates")}
            badge={list.length > 0 ? list.length : undefined}
            action={
              list.length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setEditor("skills")}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {t("edit")}
                </Button>
              ) : undefined
            }
          >
            {skills.isPending ? (
              <SectionSkeleton />
            ) : list.length === 0 ? (
              <EmptyPrompt
                icon={Plus}
                title={t("addYourSkills")}
                hint={t("noSkillsYetProfileHint")}
                onClick={() => setEditor("skills")}
              />
            ) : (
              <>
                <p className="-mt-1 mb-2 text-xs text-slate-500">
                  {t("skillsChecked", {
                    count: formatNumber(verifiedCount, lang),
                    total: formatNumber(list.length, lang),
                  })}
                </p>
                <SkillStatusList
                  skills={list}
                  verifiedIds={profile.verified_skill_ids}
                  certificates={certs}
                  own
                  focus={focus}
                />
                <Button variant="outline" className="mt-3 w-full" onClick={() => setEditor("skills")}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("skillsEdit")}
                </Button>
              </>
            )}
          </SectionCard>
        </div>
      </PageContainer>
      <ProfileEditors open={editor} onClose={() => setEditor(null)} />
    </>
  );
}

/** /worker/<handle>/skills - someone else's skills and badge, read-only. */
export function WorkerSkillsScreen() {
  const { t, lang } = useI18n();
  const { workerId: handle } = useParams({ from: "/worker/$workerId/skills" });
  const worker = useQuery({ queryKey: ["profile", handle], queryFn: () => getProfile(handle) });
  const id = worker.data?.id ?? "";
  const skills = useQuery({
    queryKey: ["user-skills", id],
    queryFn: () => getUserSkills(id),
    enabled: Boolean(id),
  });
  const focus = useFocusedSkill(skills.isSuccess);

  if (worker.isPending) return <FullPageLoader />;
  if (!worker.data) {
    return (
      <PageContainer>
        <EmptyState title={t("somethingWrong")} />
      </PageContainer>
    );
  }

  const w = worker.data;
  const list = skills.data ?? [];
  const verifiedCount = list.filter((s) => w.verified_skill_ids.includes(s.id)).length;
  const steps = {
    id: w.is_verified ? "done" : "todo",
    skill: w.verified_skill_ids.length > 0 ? "done" : "todo",
  } satisfies Record<string, StepState>;

  return (
    <>
      <AppHeader title={t("skillsPageTitle")} subtitle={w.full_name} back={<BackButton />} />
      <PageContainer>
        <div className="mx-auto max-w-xl space-y-3">
          <BadgeCard person={w} steps={steps} own={false} />
          <SectionCard
            compact
            icon={Briefcase}
            title={t("skillsAndRates")}
            badge={list.length > 0 ? list.length : undefined}
          >
            {skills.isPending ? (
              <SectionSkeleton />
            ) : list.length === 0 ? (
              <EmptyNote>{t("noSkillsYetProfile")}</EmptyNote>
            ) : (
              <>
                <p className="-mt-1 mb-2 text-xs text-slate-500">
                  {t("skillsChecked", {
                    count: formatNumber(verifiedCount, lang),
                    total: formatNumber(list.length, lang),
                  })}
                </p>
                <SkillStatusList
                  skills={list}
                  verifiedIds={w.verified_skill_ids}
                  certificates={[]}
                  own={false}
                  focus={focus}
                />
              </>
            )}
          </SectionCard>
        </div>
      </PageContainer>
    </>
  );
}
