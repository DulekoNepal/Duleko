import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Award, Check, FileText, Image as ImageIcon, Plus, ShieldCheck, Upload, X } from "lucide-react";
import { useMyProfileData } from "@/components/duleko/profile/use-my-profile-data";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";
import { CardSkeleton } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type StringKey } from "@/lib/i18n";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { addCertificate } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { CertificateStatus, UserSkillDetail } from "@/lib/types";
import { cn, formatNumber, skillName } from "@/lib/utils";

/** The most a profile holds - certificates being checked and approved ones (8600). */
export const MAX_CERTIFICATES = 5;

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

const STATUS: Record<CertificateStatus, { label: StringKey; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "certStatusPending", tone: "warning" },
  approved: { label: "certStatusApproved", tone: "success" },
  rejected: { label: "certStatusRejected", tone: "danger" },
};

interface Row {
  key: number;
  file: File | null;
  skillId: string | null;
  title: string;
}

let nextKey = 1;
const newRow = (skillId: string | null = null): Row => ({ key: nextKey++, file: null, skillId, title: "" });

/**
 * Get verified > Duleko certification: the certificates already sent, and
 * a form for several more at once - each its own photo (or PDF) and the
 * skill it shows - up to five on the profile in all. Staff check each one
 * (8300); an approved one verifies that skill.
 */
export function CertificatesStep() {
  const { t, lang } = useI18n();
  const { user, profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { certificates, skills } = useMyProfileData();
  const mySkills = skills.data ?? [];
  const onlySkill = mySkills.length === 1 ? mySkills[0].id : null;

  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [showMissing, setShowMissing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // With one skill there's nothing to choose.
  useEffect(() => {
    if (onlySkill) setRows((rs) => rs.map((r) => (r.skillId ? r : { ...r, skillId: onlySkill })));
  }, [onlySkill]);

  const held = (certificates.data ?? []).filter((c) => c.status !== "rejected").length;
  const room = Math.max(0, MAX_CERTIFICATES - held);
  const label = (s: UserSkillDetail) => s.custom_label || skillName(s, lang);
  const skillLabel = (id: string | null) => {
    const s = mySkills.find((x) => x.id === id);
    return s ? label(s) : "";
  };

  const filled = rows.filter((r) => r.file || r.title.trim());
  const ready = filled.length > 0 && filled.every((r) => r.file && r.skillId);

  const send = useMutation({
    mutationFn: async (toSend: Row[]) => {
      let done = 0;
      setProgress({ done, total: toSend.length });
      try {
        for (const row of toSend) {
          const title = row.title.trim() || skillLabel(row.skillId);
          await addCertificate(user!.id, profile!.id, title, row.skillId, row.file!);
          done += 1;
          // Sent ones leave the form, so a retry sends only what's left.
          setRows((rs) => rs.filter((r) => r.key !== row.key));
          setProgress({ done, total: toSend.length });
        }
      } catch (e) {
        throw Object.assign(new Error(errorMessage(e)), { done });
      }
    },
    onSuccess: () => {
      setRows([newRow(onlySkill)]);
      setShowMissing(false);
      toast(t("certStepSent"));
      window.scrollTo({ top: 0 });
    },
    onError: (e: Error & { done?: number }) =>
      toast(
        e.done ? t("certStepUploadFailed", { done: formatNumber(e.done, lang), reason: e.message }) : e.message,
        "error",
      ),
    onSettled: () => {
      setProgress(null);
      void queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] });
    },
  });

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pick(key: number, file: File | undefined) {
    if (!file) return;
    // Photos are shrunk before upload; a PDF goes up as-is.
    const limit = file.type === "application/pdf" ? 5 * 1024 * 1024 : MAX_PHOTO_INPUT_BYTES;
    if (file.size > limit) {
      toast(t("photoTooBig"), "error");
      return;
    }
    update(key, { file });
  }

  function submit() {
    setShowMissing(true);
    if (!ready || send.isPending) return;
    send.mutate(filled.slice(0, room));
  }

  if (certificates.isPending || skills.isPending) return <CardSkeleton count={2} />;

  return (
    <>
      <p className="flex gap-2 rounded-2xl border border-brand-200/70 bg-brand-50 px-3.5 py-3 text-sm leading-relaxed text-brand-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t("certCheckHint")}
      </p>

      {/* What's already on the profile. */}
      {(certificates.data ?? []).length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-surface p-3.5 shadow-sm sm:p-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{t("certStepYours")}</h2>
            <span className="text-xs font-medium text-slate-500">
              {t("certStepCount", { count: formatNumber(held, lang) })}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {(certificates.data ?? []).map((c) => {
              const status = STATUS[c.status];
              const Icon = c.file_type === "application/pdf" ? FileText : ImageIcon;
              return (
                <li key={c.id} className="flex items-center gap-2.5 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-brand-700"
                  >
                    {c.title}
                    {c.skill_id && skillLabel(c.skill_id) && c.title !== skillLabel(c.skill_id) && (
                      <span className="text-slate-500"> · {skillLabel(c.skill_id)}</span>
                    )}
                  </a>
                  <Badge tone={status.tone} className="shrink-0 px-1.5 text-[10px] sm:px-2 sm:text-[11px]">
                    {t(status.label)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {mySkills.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-surface px-5 py-7 text-center">
          <Award className="h-7 w-7 text-slate-400" aria-hidden />
          <p className="mt-2 max-w-xs text-sm text-slate-600">{t("certStepNeedSkill")}</p>
          <Link
            to="/profile"
            className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand-700 px-3.5 text-sm font-medium text-white hover:bg-brand-800"
          >
            {t("certStepAddSkills")}
          </Link>
        </section>
      ) : room === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-surface px-4 py-3.5 text-sm text-slate-600">
          {t("certStepFull")}
        </p>
      ) : (
        <section aria-labelledby="cert-add-title" className="space-y-2.5">
          <div className="px-0.5">
            <h2 id="cert-add-title" className="text-sm font-semibold text-slate-900">
              {t("certStepAddTitle")}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {t("certStepAddBody", { count: formatNumber(room, lang) })}
            </p>
          </div>

          {rows.slice(0, room).map((row, i) => (
            <CertificateRow
              key={row.key}
              index={i}
              row={row}
              skills={mySkills}
              skillText={label}
              removable={rows.length > 1}
              missing={showMissing && Boolean(row.file || row.title.trim()) && !(row.file && row.skillId)}
              onPick={(file) => pick(row.key, file)}
              onChange={(patch) => update(row.key, patch)}
              onRemove={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
            />
          ))}

          {rows.length < room && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, newRow(onlySkill)])}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("certStepAddAnother")}
            </button>
          )}

          {showMissing && !ready && (
            <p className="px-0.5 text-sm text-amber-700" role="status">
              {t("certStepMissing")}
            </p>
          )}

          <Button size="lg" className="w-full" loading={send.isPending} onClick={submit}>
            {progress
              ? t("kycUploading", { done: formatNumber(progress.done, lang), total: formatNumber(progress.total, lang) })
              : t("certStepSend")}
          </Button>
        </section>
      )}
    </>
  );
}

/** One certificate to send: its file, the skill it shows, and an optional name. */
function CertificateRow({
  index,
  row,
  skills,
  skillText,
  removable,
  missing,
  onPick,
  onChange,
  onRemove,
}: {
  index: number;
  row: Row;
  skills: UserSkillDetail[];
  skillText: (s: UserSkillDetail) => string;
  removable: boolean;
  missing: boolean;
  onPick: (file: File | undefined) => void;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { t, lang } = useI18n();
  const file = row.file;
  const FileIcon = file?.type === "application/pdf" ? FileText : ImageIcon;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-3.5 shadow-sm sm:p-4",
        missing ? "border-amber-300" : file && row.skillId ? "border-brand-300" : "border-slate-200",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">
          {t("certStepItem", { n: formatNumber(index + 1, lang) })}
        </h3>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("certStepRemove")}
            title={t("certStepRemove")}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <Label>{t("certStepPhoto")}</Label>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors focus-within:border-brand-500",
          file ? "border-brand-300 bg-brand-50/50" : "border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
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
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <div className="mt-3">
        <Label>{t("certSkillLabel")}</Label>
        <div role="radiogroup" aria-label={t("certSkillLabel")} className="mt-1.5 flex flex-wrap gap-2">
          {skills.map((s) => {
            const on = row.skillId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ skillId: s.id })}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-[13px] font-medium transition-colors",
                  on
                    ? "border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600"
                    : "border-slate-200 bg-surface text-slate-700 hover:border-brand-300",
                )}
              >
                <SkillTile skillId={s.id} category={s.category} className="h-7 w-7" />
                {skillText(s)}
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      <Field label={t("certStepName")} className="mb-0 mt-3">
        <Input
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={100}
          placeholder={t("profileCertNamePlaceholder")}
        />
      </Field>
    </div>
  );
}
