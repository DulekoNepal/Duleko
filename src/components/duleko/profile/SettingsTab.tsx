import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Info, Languages, LogOut, Mail, MapPinned, MessageSquare, Navigation, Trash2, Users } from "lucide-react";
import { AppearancePicker } from "@/components/duleko/AppearancePicker";
import { CalendarPicker } from "@/components/duleko/CalendarPicker";
import { ContactPrivacyRows } from "@/components/duleko/ContactPrivacyRows";
import { DulekoPagesHub } from "@/components/duleko/DulekoPagesHub";
import { ListGroup, ListRow } from "@/components/duleko/SettingsList";
import { CONTACT_EMAIL } from "@/components/duleko/site/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useMyLocation } from "@/hooks/use-my-location";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPosition } from "@/lib/geolocation";
import { useI18n } from "@/lib/i18n";
import {
  clearLocation,
  deleteMyAccount,
  getNotificationPrefs,
  saveNotificationPrefs,
  setLocationConsent,
  setShowExactLocation,
  shareLocation,
  updateProfile,
  verifyPassword,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Lang, NotificationPrefs } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

/**
 * Settings, grouped the way a phone's own settings are: how Duleko looks
 * and talks to you, who can see and reach you, your account, and help.
 * Two columns once there's room.
 */
export function SettingsTab({ onOpenAbout }: { onOpenAbout: () => void }) {
  const { t, lang } = useI18n();
  const { profile, refreshProfile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const alertPrefs = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    queryFn: () => getNotificationPrefs(profile!.id),
    enabled: Boolean(profile?.id),
  });

  const saveAlerts = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) =>
      saveNotificationPrefs(profile!.id, {
        email_enabled: alertPrefs.data?.email_enabled ?? true,
        sms_enabled: alertPrefs.data?.sms_enabled ?? false,
        ...patch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs", profile?.id] });
      toast(t("alertPrefsSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  // One switch instead of a button: turning it on records consent and
  // shares a fresh location right away (the same thing AutoShareLocation
  // then keeps doing silently on every future login, no dialog, no
  // button); turning it off withdraws consent and wipes the stored
  // coordinates, same tap.
  const toggleLocationSharing = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await setLocationConsent(profile!.id, "granted");
        await new Promise<void>((resolve, reject) => {
          getCurrentPosition(
            (pos) => {
              shareLocation(profile!.id, pos.coords.latitude, pos.coords.longitude).then(resolve, reject);
            },
            () => reject(new Error(t("locationPermissionDenied"))),
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        });
      } else {
        await setLocationConsent(profile!.id, "declined");
        await clearLocation(profile!.id);
      }
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["my-location"] });
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return null;
  const sharing = profile.location_consent === "granted";
  // Optimistic: an alert switch shows its new state while it saves.
  const pendingAlerts = saveAlerts.isPending ? saveAlerts.variables : undefined;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2 @3xl:items-start">
        <div className="min-w-0 space-y-5">
          <ListGroup title={t("settingsPreferences")}>
            <AppearancePicker />
            <LanguagePicker />
            <CalendarPicker />
          </ListGroup>

          <ListGroup title={t("notifications")}>
            <ListRow
              icon={Mail}
              title={t("emailAlerts")}
              hint={t("emailAlertsHint")}
              trailing={
                <Switch
                  size="sm"
                  checked={pendingAlerts?.email_enabled ?? alertPrefs.data?.email_enabled ?? true}
                  disabled={saveAlerts.isPending}
                  onChange={(next) => saveAlerts.mutate({ email_enabled: next })}
                  aria-label={t("emailAlerts")}
                />
              }
            />
            <ListRow
              icon={MessageSquare}
              title={t("smsAlerts")}
              hint={t("smsAlertsHint")}
              trailing={
                <Switch
                  size="sm"
                  checked={pendingAlerts?.sms_enabled ?? alertPrefs.data?.sms_enabled ?? false}
                  disabled={saveAlerts.isPending}
                  onChange={(next) => saveAlerts.mutate({ sms_enabled: next })}
                  aria-label={t("smsAlerts")}
                />
              }
            />
          </ListGroup>
        </div>

        <div className="min-w-0 space-y-5">
          <ListGroup title={t("settingsPrivacy")}>
            <ListRow
              icon={Navigation}
              title={t("shareLocation")}
              hint={
                sharing
                  ? profile.location_shared_at
                    ? t("locationShared", { time: relativeTime(profile.location_shared_at, lang) })
                    : t("locationSharedPending")
                  : t("shareLocationHint")
              }
              trailing={
                <Switch
                  size="sm"
                  checked={toggleLocationSharing.isPending ? Boolean(toggleLocationSharing.variables) : sharing}
                  disabled={toggleLocationSharing.isPending}
                  onChange={(next) => toggleLocationSharing.mutate(next)}
                  aria-label={t("shareLocation")}
                />
              }
            />
            {sharing && <ExactSpotRow />}
            <ContactPrivacyRows />
          </ListGroup>

          <ListGroup title={t("accountTitle")}>
            <ListRow icon={Users} title={t("myFriends")} to="/friends" />
            <ListRow
              icon={Eye}
              title={t("viewPublicProfile")}
              hint={t("shareProfileHint")}
              to="/worker/$workerId"
              params={{ workerId: profile.id }}
            />
          </ListGroup>

          <ListGroup title={t("profileHelpAbout")}>
            <ListRow icon={Info} title={t("aboutTitle")} hint={t("profileAboutDulekoHint")} onClick={onOpenAbout} />
            <ListRow icon={Mail} title={t("footerContactUs")} hint={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
          </ListGroup>

          <ListGroup>
            <ListRow icon={LogOut} title={t("signOut")} tone="danger" onClick={() => setSignOutOpen(true)} />
          </ListGroup>

          {/* Deliberately quiet, but still here: Play Store policy
              needs in-app deletion to stay discoverable. */}
          <div className="text-center">
            <button
              type="button"
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-500 hover:underline"
              onClick={() => setDeleteOpen(true)}
            >
              {t("deleteAccount")}
            </button>
          </div>
        </div>
      </div>

      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} />
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  );
}

/** Profile > Settings > About Duleko: every page of the website, with a way back. */
export function AboutDulekoView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("profileTabSettings")}
        </button>
        <h3 className="min-w-0 truncate text-base font-bold text-slate-900">{t("aboutTitle")}</h3>
      </div>
      <p className="px-1 text-xs leading-relaxed text-slate-500">{t("hubHint")}</p>
      <DulekoPagesHub wide />
    </div>
  );
}

/**
 * Settings > Language: one row, Nepali or English, each named in its own
 * script so either reader can find theirs. Also saved to the account, so
 * emails and texts from Duleko come in the same language.
 */
function LanguagePicker() {
  const { t, lang, setLang } = useI18n();
  const { profile } = useSession();

  function choose(next: Lang) {
    setLang(next);
    if (profile) void updateProfile(profile.id, { language: next }).catch(() => {});
  }

  return (
    <ListRow
      icon={Languages}
      title={t("language")}
      trailing={
        <Segmented
          label={t("language")}
          value={lang}
          onChange={choose}
          options={[
            { value: "ne", label: "नेपाली", lang: "ne" },
            { value: "en", label: "English", lang: "en" },
          ]}
        />
      }
    />
  );
}

/**
 * "Show my exact spot on the map": off, others see the ~300 m area around
 * the point you last shared; on, the point itself.
 */
function ExactSpotRow() {
  const { t } = useI18n();
  const { profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useMyLocation();
  const save = useMutation({
    mutationFn: (next: boolean) => setShowExactLocation(profile!.id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-location"] }),
    onError: (error) => toast(errorMessage(error), "error"),
  });
  return (
    <ListRow
      icon={MapPinned}
      title={t("mapShowExact")}
      hint={t("mapShowExactHint")}
      trailing={
        <Switch
          size="sm"
          checked={save.isPending ? Boolean(save.variables) : Boolean(location?.show_exact)}
          disabled={!location || save.isPending}
          onChange={(next) => save.mutate(next)}
          aria-label={t("mapShowExact")}
        />
      }
    />
  );
}

/**
 * One tap on the button should never be the whole action - a plain
 * Cancel/Sign out is enough here since it's reversible, unlike deleting.
 */
function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("signOutConfirmTitle")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onClose();
              void signOut();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("signOut")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{t("signOutConfirmBody")}</p>
    </Dialog>
  );
}

/**
 * Proving it is really you, rather than a plain Yes/No, so this can't be
 * tapped through by accident - there is no undo.
 */
function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { user, signOut } = useSession();
  const { toast } = useToast();
  const [confirmWord, setConfirmWord] = useState("");
  const [password, setPassword] = useState("");

  // Google sign-ins have no password to check against, so those confirm by
  // typing the word instead. A restored session doesn't always carry
  // `identities`, so app_metadata is read as a second signal rather than
  // wrongly downgrading a password account to the typed confirmation.
  const signInMethods = [
    ...(user?.identities?.map((i) => i.provider) ?? []),
    ...((user?.app_metadata?.providers as string[] | undefined) ?? []),
    user?.app_metadata?.provider,
  ];
  const hasPassword = signInMethods.includes("email");
  const ready = hasPassword ? password.length > 0 : confirmWord.trim().toUpperCase() === t("deleteAccountWord");

  const remove = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("somethingWrong"));
      if (hasPassword) {
        try {
          await verifyPassword(user.email ?? "", password);
        } catch {
          throw new Error(t("wrongPassword"));
        }
      }
      await deleteMyAccount(user.id);
    },
    onSuccess: async () => {
      close();
      toast(t("deleteAccountDone"));
      await signOut();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function close() {
    setConfirmWord("");
    setPassword("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("deleteAccount")}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t("cancel")}
          </Button>
          <Button variant="danger" loading={remove.isPending} disabled={!ready} onClick={() => remove.mutate()}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("deleteAccount")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{t("deleteAccountBody")}</p>

      {hasPassword ? (
        <Field label={t("deleteAccountPasswordLabel")} className="mt-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter" && ready) remove.mutate();
            }}
          />
        </Field>
      ) : (
        // Signed in with Google: there is no password of ours to check.
        <Field label={t("deleteAccountConfirmLabel")} className="mt-4">
          <Input
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            placeholder={t("deleteAccountWord")}
            autoComplete="off"
          />
        </Field>
      )}
    </Dialog>
  );
}
