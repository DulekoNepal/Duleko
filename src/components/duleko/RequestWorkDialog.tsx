import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { createEngagement, getUserSkills } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { skillName, todayKey } from "@/lib/utils";
import type { Profile, WorkerCardData } from "@/lib/types";

type Worker = Pick<Profile, "id" | "full_name"> & Partial<WorkerCardData>;

export function RequestWorkDialog({
  open,
  onClose,
  worker,
  employerProfileId,
  defaultLocation,
  defaultSkillId,
}: {
  open: boolean;
  onClose: () => void;
  worker: Worker;
  employerProfileId: string;
  defaultLocation?: string;
  defaultSkillId?: string | null;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [workDate, setWorkDate] = useState(todayKey());
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [payment, setPayment] = useState("");
  const [skillId, setSkillId] = useState(defaultSkillId ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const workerSkills = useQuery({
    queryKey: ["user-skills", worker.id],
    queryFn: () => getUserSkills(worker.id),
    enabled: open,
    initialData: worker.skills,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createEngagement({
        employer_profile_id: employerProfileId,
        worker_profile_id: worker.id,
        skill_id: skillId || null,
        title: title.trim(),
        details: details.trim() || null,
        work_date: workDate,
        location_text: location.trim(),
        payment_amount: payment.trim() ? Number(payment) : null,
      }),
    onSuccess: () => {
      toast(t("requestSent"));
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
      reset();
      onClose();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function reset() {
    setTitle("");
    setDetails("");
    setWorkDate(todayKey());
    setPayment("");
    setErrors({});
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = t("required");
    if (location.trim().length < 2) next.location = t("required");
    if (workDate < todayKey()) next.workDate = t("dateInPast");
    if (worker.id === employerProfileId) next.title = t("cannotRequestSelf");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("requestTitle", { name: worker.full_name })}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            {t("cancel")}
          </Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            onClick={() => {
              if (validate()) mutation.mutate();
            }}
          >
            {t("sendRequest")}
          </Button>
        </div>
      }
    >
      <Field label={t("jobTitle")} error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("jobTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      {(workerSkills.data?.length ?? 0) > 0 && (
        <Field label={t("skills")}>
          <Select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">—</option>
            {(workerSkills.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {skillName(s, lang)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={t("workDate")} error={errors.workDate}>
        <Input
          type="date"
          value={workDate}
          min={todayKey()}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </Field>

      <Field label={t("workLocation")} error={errors.location}>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("workLocationPlaceholder")}
          maxLength={160}
        />
      </Field>

      <Field label={`${t("payment")} (${t("optional")})`} hint={t("paymentHint")}>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          placeholder={t("paymentPlaceholder")}
        />
      </Field>

      <Field label={`${t("jobDetails")} (${t("optional")})`}>
        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={800}
          rows={3}
        />
      </Field>
    </Dialog>
  );
}
