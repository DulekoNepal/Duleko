import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { reportUser } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { ReportReason } from "@/lib/types";

export function ReportDialog({
  open,
  onClose,
  reporterProfileId,
  reportedProfileId,
}: {
  open: boolean;
  onClose: () => void;
  reporterProfileId: string;
  reportedProfileId: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");

  const reasons: { value: ReportReason; label: string }[] = [
    { value: "spam", label: t("reasonSpam") },
    { value: "fake_profile", label: t("reasonFake") },
    { value: "abusive", label: t("reasonAbusive") },
    { value: "no_show", label: t("reasonNoShow") },
    { value: "unsafe", label: t("reasonUnsafe") },
    { value: "other", label: t("reasonOther") },
  ];

  const mutation = useMutation({
    mutationFn: () =>
      reportUser({
        reporter_profile_id: reporterProfileId,
        reported_profile_id: reportedProfileId,
        reason,
        details: details.trim() || null,
      }),
    onSuccess: () => {
      toast(t("reportSent"));
      setDetails("");
      onClose();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("reportTitle")}
      footer={
        <Button
          className="w-full"
          variant="danger"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t("report")}
        </Button>
      }
    >
      <Field label={t("reportReason")}>
        <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`${t("reportDetails")} (${t("optional")})`}>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={600} />
      </Field>
    </Dialog>
  );
}
