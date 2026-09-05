import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import type { CancellationReason } from "@/lib/types";

const REASONS: CancellationReason[] = [
  "schedule_conflict",
  "change_of_plans",
  "price_disagreement",
  "found_someone_else",
  "no_longer_needed",
  "other",
];

const REASON_KEY: Record<CancellationReason, "cancelReasonScheduleConflict" | "cancelReasonChangeOfPlans" | "cancelReasonPriceDisagreement" | "cancelReasonFoundSomeoneElse" | "cancelReasonNoLongerNeeded" | "reasonOther"> = {
  schedule_conflict: "cancelReasonScheduleConflict",
  change_of_plans: "cancelReasonChangeOfPlans",
  price_disagreement: "cancelReasonPriceDisagreement",
  found_someone_else: "cancelReasonFoundSomeoneElse",
  no_longer_needed: "cancelReasonNoLongerNeeded",
  other: "reasonOther",
};

/** Cancelling a job always requires picking a reason (and a note, if "Other"). */
export function CancelReasonDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: CancellationReason, note: string | null) => void;
  loading?: boolean;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<CancellationReason>("schedule_conflict");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (reason === "other" && note.trim().length === 0) {
      setError(t("cancelReasonNoteRequired"));
      return;
    }
    onConfirm(reason, note.trim() || null);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("cancelReasonTitle")}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            {t("cancel")}
          </Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={submit}>
            {t("confirmCancel")}
          </Button>
        </div>
      }
    >
      <Field label={t("cancelReasonPrompt")}>
        <Select
          value={reason}
          onChange={(e) => {
            setReason(e.target.value as CancellationReason);
            setError(null);
          }}
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(REASON_KEY[r])}
            </option>
          ))}
        </Select>
      </Field>

      {reason === "other" && (
        <Field label={t("reportDetails")} error={error ?? undefined}>
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            rows={3}
            maxLength={300}
          />
        </Field>
      )}
    </Dialog>
  );
}
