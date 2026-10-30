import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Briefcase, Camera, GraduationCap, Cake, IdCard, Info, MapPin, Pencil, Phone, Plus, Trash2, type LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { KycProfileCard } from "@/components/duleko/kyc/KycParts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import { removeCertificate } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Certificate } from "@/lib/types";
import { cn, formatNumber, locationLine } from "@/lib/utils";
import type { EditorKind } from "./ProfileEditors";
import { PhotoPicker, type PhotoUpload } from "./ProfileHero";
import {
  AboutText,
  CertificateList,
  EmptyPrompt,
  FACT_LIST,
  Fact,
  ProfileColumn,
  ProfileColumns,
  SectionAction,
  SectionSkeleton,
  SkillRateList,
} from "./ProfileUI";
import { useMyProfileData } from "./use-my-profile-data";

const CALL_RULE_LABEL: Record<string, StringKey> = {
  everyone: "callEveryone",
  accepted_work: "callAcceptedWork",
  nobody: "callNobody",
};

/**
 * Your profile as a page of sections, in the order people read one: the
 * intro, the work you do and what it costs, then the facts. On a wide
 * screen the facts sit in a column beside the rest. Reviews open from the
 * header's Rating and Reviews numbers instead (ReviewsDialog).
 */
export function OverviewTab({ onEdit, avatar }: { onEdit: (kind: EditorKind) => void; avatar: PhotoUpload }) {
  return (
    <div className="space-y-3 md:space-y-4">
      <FinishProfileCard onEdit={onEdit} avatar={avatar} />
      <KycProfileCard />

      <ProfileColumns>
        <ProfileColumn>
          <AboutCard onEdit={onEdit} className="order-1 @3xl:order-none" />
          <SkillsCard onEdit={onEdit} className="order-3 @3xl:order-none" />
        </ProfileColumn>
        <ProfileColumn>
          <DetailsCard onEdit={onEdit} className="order-2 @3xl:order-none" />
          <CertificatesCard onEdit={onEdit} className="order-4 @3xl:order-none" />
        </ProfileColumn>
      </ProfileColumns>
    </div>
  );
}

// ---------------------------------------------------------------------

/**
 * What's still missing, as one-tap steps that open the right editor. Gone
 * once everything is filled in - a finished profile needs no banner.
 */
function FinishProfileCard({ onEdit, avatar }: { onEdit: (kind: EditorKind) => void; avatar: PhotoUpload }) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { skills, contact, certificates } = useMyProfileData();
  // Until these load, "missing" would only be a guess.
  if (!profile || !skills.isSuccess || !contact.isFetched || !certificates.isSuccess) return null;

  const steps: { done: boolean; label: string; icon: LucideIcon; editor?: EditorKind }[] = [
    { done: Boolean(profile.avatar_url || avatar.preview), label: t("profileItemPhoto"), icon: Camera },
    { done: Boolean(profile.about?.trim() || profile.bio?.trim()), label: t("profileItemAbout"), icon: Info, editor: "intro" },
    { done: skills.data.length > 0, label: t("profileItemSkills"), icon: Briefcase, editor: "skills" },
    { done: Boolean(profile.district), label: t("profileItemLocation"), icon: MapPin, editor: "details" },
    { done: Boolean(contact.data?.phone), label: t("profileItemPhone"), icon: Phone, editor: "details" },
    { done: certificates.data.length > 0, label: t("profileItemCertificate"), icon: Award, editor: "certificate" },
  ];
  const missing = steps.filter((s) => !s.done);
  if (missing.length === 0) return null;

  const percent = Math.round(((steps.length - missing.length) / steps.length) * 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const chip =
    "inline-flex h-8 items-center gap-1.5 rounded-full border border-brand-200 bg-surface px-3 text-xs font-semibold text-brand-800 transition-colors hover:border-brand-400 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";

  return (
    <section className="animate-in-up rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/80 via-surface to-surface p-3.5 shadow-sm sm:p-4">
      <div className="flex items-center gap-3.5">
        <div
          className="relative h-12 w-12 shrink-0"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
        >
          <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="5" className="stroke-brand-100" />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
              className="stroke-brand-600 transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-slate-900">
            {formatNumber(percent, lang)}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-slate-900">
            {t("profileFinishTitle")}
            <span className="text-xs font-medium text-brand-700">
              {missing.length === 1
                ? t("profileStepsLeftOne")
                : t("profileStepsLeft", { count: formatNumber(missing.length, lang) })}
            </span>
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{t("profileCompleteHint")}</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {missing.map(({ label, icon: Icon, editor }) => (
          <li key={label}>
            {editor ? (
              <button type="button" onClick={() => onEdit(editor)} className={chip}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ) : (
              <PhotoPicker upload={avatar} className={chip}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </PhotoPicker>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------

function AboutCard({ onEdit, className }: { onEdit: (kind: EditorKind) => void; className?: string }) {
  const { t } = useI18n();
  const { profile } = useSession();
  if (!profile) return null;
  const about = profile.about?.trim() ?? "";

  return (
    <SectionCard
      compact
      icon={Info}
      title={t("about")}
      className={className}
      action={about ? <SectionAction label={t("edit")} onClick={() => onEdit("intro")} /> : undefined}
    >
      {about ? (
        <AboutText text={about} />
      ) : (
        <EmptyPrompt icon={Pencil} title={t("profileItemAbout")} hint={t("noAboutYet")} onClick={() => onEdit("intro")} />
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------

function SkillsCard({ onEdit, className }: { onEdit: (kind: EditorKind) => void; className?: string }) {
  const { t, lang } = useI18n();
  const { skills } = useMyProfileData();
  const list = skills.data ?? [];

  return (
    <div id="profile-skills" className={cn("scroll-mt-36", className)}>
      <SectionCard
        compact
        icon={Briefcase}
        title={t("skillsAndRates")}
        badge={list.length > 0 ? list.length : undefined}
        action={list.length > 0 ? <SectionAction label={t("edit")} onClick={() => onEdit("skills")} /> : undefined}
      >
        {skills.isPending ? (
          <SectionSkeleton />
        ) : list.length === 0 ? (
          <EmptyPrompt icon={Plus} title={t("addYourSkills")} hint={t("noSkillsYetProfileHint")} onClick={() => onEdit("skills")} />
        ) : (
          <SkillRateList skills={list} onRateMissing={() => onEdit("skills")} />
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------

function DetailsCard({ onEdit, className }: { onEdit: (kind: EditorKind) => void; className?: string }) {
  const { t, lang } = useI18n();
  const { profile } = useSession();
  const { contact } = useMyProfileData();
  if (!profile) return null;
  const place = locationLine(profile, lang);
  const notAdded = (label: string) => (
    <button
      type="button"
      onClick={() => onEdit("details")}
      className="font-semibold text-brand-700 hover:underline"
    >
      {label}
    </button>
  );

  return (
    <SectionCard
      compact
      icon={IdCard}
      title={t("profileContactDetails")}
      className={className}
      action={<SectionAction label={t("edit")} onClick={() => onEdit("details")} />}
    >
      <dl className={FACT_LIST}>
        <Fact icon={MapPin} label={t("whereYouAre")}>
          {place || notAdded(t("profileItemLocation"))}
        </Fact>
        <Fact icon={Phone} label={t("phoneNumber")}>
          {contact.data?.phone ? (
            <>
              <span className="tabular-nums">{contact.data.phone}</span>
              {contact.data.alt_phone && (
                <span className="block tabular-nums text-slate-600">{contact.data.alt_phone}</span>
              )}
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {t("profilePhoneSeenBy", { who: t(CALL_RULE_LABEL[profile.call_permission] ?? "callAcceptedWork") })}
              </span>
            </>
          ) : contact.isPending ? (
            <span className="skeleton block h-4 w-28" />
          ) : (
            notAdded(t("profileItemPhone"))
          )}
        </Fact>
        {profile.education && (
          <Fact icon={GraduationCap} label={t("highestEducation")}>
            {profile.education}
          </Fact>
        )}
        {profile.age != null && (
          <Fact icon={Cake} label={t("age")}>
            {t("yearsOld", { count: formatNumber(profile.age, lang) })}
          </Fact>
        )}
        <Fact icon={IdCard} label={t("memberId")}>
          <span className="font-mono text-[13px] tracking-wide">{profile.member_no}</span>
        </Fact>
      </dl>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------

function CertificatesCard({ onEdit, className }: { onEdit: (kind: EditorKind) => void; className?: string }) {
  const { t, lang } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { certificates, skills } = useMyProfileData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<Certificate | null>(null);
  const list = certificates.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => removeCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] });
      setRemoving(null);
      // An approved certificate carried the skill half of the badge.
      if (removing?.status === "approved") void refreshProfile();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <>
      <SectionCard
        compact
        icon={Award}
        title={t("certificates")}
        badge={list.length > 0 ? list.length : undefined}
        className={className}
        action={list.length > 0 ? <SectionAction icon={Plus} label={t("profileAdd")} onClick={() => onEdit("certificate")} /> : undefined}
      >
        {certificates.isPending ? (
          <SectionSkeleton rows={1} />
        ) : list.length === 0 ? (
          <EmptyPrompt icon={Plus} title={t("addCertificate")} hint={t("certificatesHint")} onClick={() => onEdit("certificate")} />
        ) : (
          <CertificateList certificates={list} skills={skills.data ?? []} onRemove={setRemoving} />
        )}
      </SectionCard>

      <Dialog
        open={removing != null}
        onClose={() => setRemoving(null)}
        title={t("profileCertRemoveTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>
              {!remove.isPending && <Trash2 className="h-4 w-4" aria-hidden />}
              {t("profileRemove")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t("profileCertRemoveBody", { title: removing?.title ?? "" })}</p>
      </Dialog>
    </>
  );
}
