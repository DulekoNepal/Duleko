import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getUserSkills } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

/**
 * Draws someone's Professional ID card fresh from their real profile -
 * never a screenshot - and saves it: a file download on the website,
 * straight into the gallery in the Android app. Your own card from your
 * Profile, and any member's card from theirs for the three staff.
 */
export function useDownloadCard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Profile) => {
      // The same cached copy the profile screen shows - fetched now only
      // if the tap beat it, so the card never goes out without skills.
      const skills = await queryClient.fetchQuery({
        queryKey: ["user-skills", profile.id],
        queryFn: () => getUserSkills(profile.id),
      });
      // Loaded on tap: the card drawer brings a QR encoder and React's
      // server renderer, which nobody needs just to open a profile.
      const { profileCardFilename, renderProfileCard, saveProfileCard } = await import("@/lib/profileCard");
      const blob = await renderProfileCard(profile, skills);
      return saveProfileCard(blob, profileCardFilename(profile));
    },
    onSuccess: (result) => {
      if (result === "denied") toast(t("cardSaveDenied"), "error");
      else toast(t(result === "saved" ? "cardSavedToGallery" : "cardDownloaded"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });
}
