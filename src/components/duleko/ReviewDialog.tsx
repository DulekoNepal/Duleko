import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { StarPicker } from "./Rating";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { submitReview } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";

export function ReviewDialog({
  open,
  onClose,
  engagementId,
  reviewerProfileId,
  revieweeProfileId,
  revieweeName,
}: {
  open: boolean;
  onClose: () => void;
  engagementId: string;
  reviewerProfileId: string;
  revieweeProfileId: string;
  revieweeName: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitReview({
        engagement_id: engagementId,
        reviewer_profile_id: reviewerProfileId,
        reviewee_profile_id: revieweeProfileId,
        rating,
        comment: comment.trim() || null,
      }),
    onSuccess: () => {
      toast(t("reviewThanks"));
      queryClient.invalidateQueries({ queryKey: ["engagements"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", revieweeProfileId] });
      setRating(0);
      setComment("");
      onClose();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("reviewFor", { name: revieweeName })}
      footer={
        <Button
          className="w-full"
          disabled={rating === 0}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t("submitReview")}
        </Button>
      }
    >
      <p className="mb-3 text-sm text-slate-600">{t("reviewTitle")}</p>
      <div className="mb-4">
        <p className="mb-1.5 text-sm font-medium text-slate-700">{t("yourRating")}</p>
        <StarPicker value={rating} onChange={setRating} disabled={mutation.isPending} />
      </div>
      <Field label={`${t("reviewComment")} (${t("optional")})`}>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("reviewCommentPlaceholder")}
          maxLength={500}
          rows={3}
        />
      </Field>
    </Dialog>
  );
}
