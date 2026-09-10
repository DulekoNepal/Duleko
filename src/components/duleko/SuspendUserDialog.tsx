import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";

/** Admin-tier-only confirmation before suspend_profile signs someone out for good. */
export function SuspendUserDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
  loading?: boolean;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("suspendConfirmTitle")}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            {t("cancel")}
          </Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={() => onConfirm(reason.trim() || null)}>
            {t("suspendUser")}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-slate-600">{t("suspendConfirmBody")}</p>
      <Field label={t("suspendReasonPlaceholder")}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} />
      </Field>
    </Dialog>
  );
}
