import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Camera, Download, Eye, IdCard, Link2 as LinkIcon, MoreHorizontal, Pencil, Share2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuDivider, MenuItem, MenuLabel, MenuPanel } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { updateProfile, uploadAvatar, uploadCover } from "@/lib/queries";
import { copyLink, profileUrl, shareProfile } from "@/lib/share";
import { errorMessage } from "@/lib/supabase";
import { cn, formatNumber } from "@/lib/utils";
import {
  HeroBody,
  HeroCard,
  HeroCover,
  HeroIdentity,
  HeroSummary,
  HeroTopRow,
  StatStrip,
  StatusStrip,
  type StatItem,
} from "./ProfileUI";
import { useDownloadCard } from "./use-download-card";
import { useMyProfileData } from "./use-my-profile-data";

const PHOTO_TYPES = "image/jpeg,image/png,image/webp";

/**
 * Uploads a new profile or cover photo, showing it straight away while it
 * goes up. Shared by the header and the "Add a profile photo" step.
 */
export function usePhotoUpload(kind: "avatar" | "cover") {
  const { t } = useI18n();
  const { user, profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  // A blob: URL holds the whole photo in memory until it is let go.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !profile) return;
      const url = kind === "avatar" ? await uploadAvatar(user.id, file) : await uploadCover(user.id, file);
      await updateProfile(profile.id, kind === "avatar" ? { avatar_url: url } : { cover_url: url });
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => {
      setPreview(null);
      toast(errorMessage(error), "error");
    },
  });

  function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  }

  return { preview, pick, pending: upload.isPending };
}

export type PhotoUpload = ReturnType<typeof usePhotoUpload>;

/** A label that opens the photo picker - style it like any button. */
export function PhotoPicker({
  upload,
  className,
  children,
}: {
  upload: PhotoUpload;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("cursor-pointer", upload.pending && "pointer-events-none opacity-70", className)}>
      {children}
      <input
        type="file"
        accept={PHOTO_TYPES}
        className="sr-only"
        disabled={upload.pending}
        onChange={(e) => {
          upload.pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export type StatTarget = "reviews" | "skills" | "calendar";

/**
 * Who you are at a glance, the way others meet you: cover, photo, name and
 * headline, then the four numbers and the one switch you use every day -
 * whether you're taking work. Edge to edge on a phone, a card from sm up.
 */
export function ProfileHero({
  avatar,
  cover,
  onEdit,
  onJump,
}: {
  avatar: PhotoUpload;
  cover: PhotoUpload;
  /** Opens the intro editor - name, headline and about. */
  onEdit: () => void;
  onJump: (target: StatTarget) => void;
}) {
  const { t, lang } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { skills, busyDays } = useMyProfileData();
  const [menuOpen, setMenuOpen] = useState(false);

  // The ⋯ menu closes on a tap anywhere else, or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDownAnywhere(e: PointerEvent) {
      if ((e.target as HTMLElement | null)?.closest("[data-profile-menu]")) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownAnywhere, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownAnywhere, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleAvailable = useMutation({
    mutationFn: (next: boolean) => updateProfile(profile!.id, { is_available: next }),
    onSuccess: () => refreshProfile(),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const share = useMutation({
    mutationFn: () =>
      shareProfile(profile!.public_slug, profile!.full_name, t("shareProfileText", { name: profile!.full_name })),
    onSuccess: (result) => {
      if (result === "copied") toast(t("linkCopied"));
      else if (result === "failed") toast(t("copyFailed"), "error");
      // "shared" and "cancelled" both already spoke for themselves.
    },
  });

  const copy = useMutation({
    mutationFn: () => copyLink(profileUrl(profile!.public_slug)),
    onSuccess: (result) => (result === "copied" ? toast(t("linkCopied")) : toast(t("copyFailed"), "error")),
  });

  const downloadCard = useDownloadCard();

  if (!profile) return null;

  // Shown as already flipped while the save is on its way.
  const available = toggleAvailable.isPending ? Boolean(toggleAvailable.variables) : profile.is_available;
  const rated = profile.rating_count > 0;

  function menuAction(action: () => void) {
    return () => {
      setMenuOpen(false);
      action();
    };
  }

  const stats: StatItem[] = [
    {
      label: t("ratingLabel"),
      value: rated ? formatNumber(Number(profile.rating).toFixed(1), lang) : t("newShort"),
      star: rated,
      onClick: () => onJump("reviews"),
    },
    { label: t("reviews"), value: formatNumber(profile.rating_count, lang), onClick: () => onJump("reviews") },
    { label: t("skills"), value: formatNumber(skills.data?.length ?? 0, lang), onClick: () => onJump("skills") },
    { label: t("busyDaysLabel"), value: formatNumber(busyDays.length, lang), onClick: () => onJump("calendar") },
  ];

  return (
    <HeroCard lifted={menuOpen}>
      <HeroCover src={cover.preview ?? profile.cover_url}>
        <PhotoPicker
          upload={cover}
          className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-black/35 px-2.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-black/50 focus-within:ring-2 focus-within:ring-white @2xl:right-4 @2xl:top-4"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only @lg:not-sr-only">{t("changeCover")}</span>
        </PhotoPicker>
      </HeroCover>

      <HeroBody>
        <HeroTopRow
          name={profile.full_name}
          src={avatar.preview ?? profile.avatar_url}
          badge={
            <PhotoPicker
              upload={avatar}
              className="absolute bottom-0.5 right-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-white shadow ring-2 ring-surface transition-colors hover:bg-brand-800 focus-within:ring-brand-300"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{t("changePhoto")}</span>
            </PhotoPicker>
          }
          actions={
            // Everything about your own profile sits behind one ⋯ button:
            // editing first, then sharing, then the staff tools.
            <div className="relative mt-3 flex min-w-0 items-center" data-profile-menu>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                loading={downloadCard.isPending || share.isPending}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t("profileOptions")}
                title={t("profileOptions")}
              >
                {!(downloadCard.isPending || share.isPending) && <MoreHorizontal className="h-4 w-4" aria-hidden />}
              </Button>

              {menuOpen && (
                <MenuPanel className="w-60">
                  <MenuItem icon={Pencil} label={t("editProfile")} onClick={menuAction(onEdit)} />
                  <MenuDivider />
                  <MenuItem icon={Share2} label={t("shareProfile")} onClick={menuAction(() => share.mutate())} />
                  <MenuItem icon={LinkIcon} label={t("copyLink")} onClick={menuAction(() => copy.mutate())} />
                  <MenuItem icon={Eye} label={t("viewPublicProfile")} onClick={menuAction(() => navigate({ to: "/worker/$workerId", params: { workerId: profile.id } }))} />
                  <MenuItem icon={Download} label={t("downloadCardShort")} onClick={menuAction(() => downloadCard.mutate(profile))} />
                  {profile.staff_role && (
                    <>
                      <MenuDivider />
                      <MenuLabel>{t("profileStaffMenu")}</MenuLabel>
                      <MenuItem icon={ShieldCheck} label={t("moderation")} onClick={menuAction(() => navigate({ to: "/moderation" }))} />
                      <MenuItem icon={IdCard} label={t("kycQueueTitle")} onClick={menuAction(() => navigate({ to: "/staff/verify" }))} />
                      <MenuItem icon={Wallet} label={t("staffFeesShortcut")} onClick={menuAction(() => navigate({ to: "/staff/fees" }))} />
                      <MenuItem icon={Activity} label={t("activityShortcut")} onClick={menuAction(() => navigate({ to: "/staff/activity" }))} />
                    </>
                  )}
                </MenuPanel>
              )}
            </div>
          }
        />

        <HeroIdentity person={profile} />

        <HeroSummary>
          <StatStrip items={stats} />
          {/* Whether you're taking work - the switch you use most. */}
          <StatusStrip
            on={available}
            title={available ? t("profileAvailOnTitle") : t("profileAvailOffTitle")}
            hint={available ? t("availabilityOnHint") : t("availabilityOffHint")}
          >
            <Switch
              checked={available}
              disabled={toggleAvailable.isPending}
              onChange={(next) => toggleAvailable.mutate(next)}
              aria-label={t("availableForWork")}
            />
          </StatusStrip>
        </HeroSummary>
      </HeroBody>
    </HeroCard>
  );
}
