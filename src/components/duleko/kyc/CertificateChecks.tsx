import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Award, Check, ExternalLink, FileText, X } from "lucide-react";
import { SectionCard } from "@/components/duleko/ProfileParts";
import { SkillTile } from "@/components/duleko/SkillIcon";
import type { Photo } from "@/components/duleko/kyc/KycStaffParts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import { listPendingCertificates, reviewCertificate, type CertificateToCheck } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { CertificateRejection } from "@/lib/types";
import { cn, relativeTime, skillName } from "@/lib/utils";

const REASONS: CertificateRejection[] = ["unclear", "name_mismatch", "not_valid", "other"];

const REASON_SHORT: Record<CertificateRejection, StringKey> = {
  unclear: "kycReasonShortUnclear",
  name_mismatch: "kycReasonShortNameMismatch",
  not_valid: "certReasonShortNotValid",
  other: "kycReasonShortOther",
};

/**
 * Staff: certificates waiting for a check, under the ID checks. Approving
 * one verifies the skill picked here - the member's own pick is selected
 * to start with - and gives the skill half of the badge (8300).
 */
export function CertificateChecks({ onOpenPhoto }: { onOpenPhoto: (photo: Photo) => void }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ["certificate-queue"], queryFn: listPendingCertificates });
  // The skill each certificate will be approved for, where staff changed it.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<CertificateToCheck | null>(null);
  const [code, setCode] = useState<CertificateRejection>("unclear");
  const [note, setNote] = useState("");

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["certificate-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["kyc-queue-count"] });
  }

  const skillFor = (c: CertificateToCheck) =>
    picked[c.id] ?? (c.owner.skills.some((s) => s.id === c.skill_id) ? c.skill_id : null) ?? c.owner.skills[0]?.id ?? null;

  const review = useMutation({
    mutationFn: ({ item, approve }: { item: CertificateToCheck; approve: boolean }) =>
      reviewCertificate({
        certificateId: item.id,
        approve,
        skillId: approve ? skillFor(item) : null,
        reason: approve ? null : code,
        note: approve ? null : note,
      }),
    onSuccess: (_, { approve }) => {
      setRejecting(null);
      toast(t(approve ? "certApprovedToast" : "kycRejectedToast"));
      refresh();
    },
    onError: (error) => {
      toast(errorMessage(error), "error");
      refresh();
    },
  });

  return (
    <>
      <SectionCard compact icon={Award} title={t("checksTabCertificates")} badge={queue.data?.length || undefined}>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("certQueueHowTo")}</p>
        {queue.isPending ? (
          <CardSkeleton count={1} />
        ) : queue.isError ? (
          <ErrorState message={errorMessage(queue.error)} onRetry={() => queue.refetch()} retryLabel={t("retry")} />
        ) : queue.data.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">{t("certQueueEmpty")}</p>
        ) : (
          <ul className="grid gap-3 @3xl:grid-cols-2">
            {queue.data.map((item) => {
              const busy = review.isPending && review.variables?.item.id === item.id;
              const skill = skillFor(item);
              const isPdf = item.file_type === "application/pdf";
              return (
                <li key={item.id} className="rounded-xl border border-slate-200 bg-surface p-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={item.owner.full_name} src={item.owner.avatar_url} size={44} profileId={item.owner.id} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/worker/$workerId"
                        params={{ workerId: item.owner.id }}
                        className="block truncate text-[15px] font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {item.owner.full_name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {item.title} · {t("kycQueueSent", { when: relativeTime(item.created_at, lang) })}
                      </p>
                    </div>
                  </div>

                  {isPdf ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                    >
                      <FileText className="h-5 w-5" aria-hidden />
                      {t("certQueueOpen")}
                      <ExternalLink className="ml-auto h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenPhoto({ src: item.file_url, title: item.title })}
                      aria-label={t("certQueueOpen")}
                      className="group mt-3 block w-full overflow-hidden rounded-xl ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      <img
                        src={item.file_url}
                        alt={item.title}
                        loading="lazy"
                        className="aspect-[3/2] w-full bg-slate-100 object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    </button>
                  )}

                  <p className="mb-1.5 mt-3 text-xs font-semibold text-slate-700">{t("certQueuePickSkill")}</p>
                  {item.owner.skills.length === 0 ? (
                    <p className="text-xs text-amber-700">{t("certQueueNoSkills")}</p>
                  ) : (
                    <div role="radiogroup" aria-label={t("certQueuePickSkill")} className="flex flex-wrap gap-1.5">
                      {item.owner.skills.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={skill === s.id}
                          onClick={() => setPicked((p) => ({ ...p, [item.id]: s.id }))}
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-xs font-semibold transition-colors",
                            skill === s.id
                              ? "border-brand-600 bg-brand-50 text-brand-800"
                              : "border-slate-300 bg-surface text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          <SkillTile skillId={s.id} category={s.category} className="h-6 w-6" />
                          {s.custom_label || skillName(s, lang)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3.5 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      loading={busy && review.variables?.approve}
                      disabled={busy || !skill}
                      onClick={() => review.mutate({ item, approve: true })}
                    >
                      {!(busy && review.variables?.approve) && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {t("kycApprove")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setCode("unclear");
                        setNote("");
                        setRejecting(item);
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      {t("kycReject")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("kycRejectTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={review.isPending}
              disabled={code === "other" && !note.trim()}
              onClick={() => rejecting && review.mutate({ item: rejecting, approve: false })}
            >
              {t("kycRejectSend")}
            </Button>
          </>
        }
      >
        {rejecting && (
          <p className="mb-3 text-sm font-medium text-slate-700">
            {rejecting.owner.full_name} · {rejecting.title}
          </p>
        )}
        <div role="radiogroup" aria-label={t("kycRejectTitle")} className="mb-3.5 flex flex-wrap gap-2">
          {REASONS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={code === c}
              onClick={() => setCode(c)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                code === c
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-300 bg-surface text-slate-700 hover:bg-slate-50",
              )}
            >
              {t(REASON_SHORT[c])}
            </button>
          ))}
        </div>
        <Field
          label={code === "other" ? t("kycRejectNoteNeeded") : t("kycRejectNote")}
          hint={t("kycRejectNoteHint")}
          className="mb-0"
        >
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} />
        </Field>
      </Dialog>
    </>
  );
}
