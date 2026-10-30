import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { settleCallDeal } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";

/** Every screen that shows call deals or their numbers - refreshed after a settle or a removal. */
export const CALL_DEAL_KEYS = [["activity-stats"], ["call-deals"], ["staff-call-deals"], ["activity-list"], ["activity-item"]];

/**
 * Staff settle a disputed call deal (8400): count it after all, or settle
 * it as no deal. One confirm step that says what happens, with an optional
 * note that goes into both people's alert.
 */
export function SettleDealDialog({
  dealId,
  count,
  names,
  onClose,
  onDone,
}: {
  /** The deal being settled, or null when closed. */
  dealId: string | null;
  /** true = count it, false = no deal. */
  count: boolean;
  /** "Customer → Worker", shown at the top. */
  names?: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (dealId) setNote("");
  }, [dealId]);

  const settle = useMutation({
    mutationFn: () => settleCallDeal(dealId!, count, note),
    onSuccess: () => {
      toast(t(count ? "dealsCountedToast" : "dealsNoDealToast"));
      onClose();
      onDone?.();
    },
    onError: (error) => toast(errorMessage(error), "error"),
    // Settled here, or by someone else first: either way the lists are stale.
    onSettled: () => {
      for (const key of CALL_DEAL_KEYS) void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <Dialog
      open={Boolean(dealId)}
      onClose={onClose}
      title={t(count ? "dealsSettleCountTitle" : "dealsSettleNoTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={count ? "primary" : "danger"} loading={settle.isPending} onClick={() => settle.mutate()}>
            {t(count ? "dealsCount" : "dealsNoDeal")}
          </Button>
        </>
      }
    >
      {names && <p className="mb-2 text-sm font-semibold text-slate-900">{names}</p>}
      <p className="mb-3.5 text-sm leading-relaxed text-slate-600">
        {t(count ? "dealsSettleCountBody" : "dealsSettleNoBody")}
      </p>
      <Field label={t("dealsSettleNote")} hint={t("dealsSettleNoteHint")} className="mb-0">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
      </Field>
    </Dialog>
  );
}
