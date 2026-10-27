import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Gift, Info, KeyRound, Smartphone, Languages, LogOut, Mail, MapPin, MessageSquare, Store, Trash2, Users } from "lucide-react";
import { AppearancePicker } from "@/components/duleko/AppearancePicker";
import { InviteFriendsDialog } from "@/components/duleko/profile/InviteFriendsDialog";
import { CalendarPicker } from "@/components/duleko/CalendarPicker";
import { ContactPrivacyRows } from "@/components/duleko/ContactPrivacyRows";
import { DulekoPagesHub } from "@/components/duleko/DulekoPagesHub";
import { MobileNumberInput, PinField } from "@/components/duleko/PhonePinFields";
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
import { useI18n } from "@/lib/i18n";
import { AccountAuthError, checkMyPin, getMyPin, setMyPin, type MyPin } from "@/lib/account-auth";
import { OLD_PIN_LENGTH, PIN_LENGTH, authPhone, isNepaliMobile, isWeakPin, pinToPassword, signInMobile } from "@/lib/phone-auth";
import {
  deleteMyAccount,
  getNotificationPrefs,
  saveNotificationPrefs,
  updateProfile,
  verifyPassword,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import type { Lang, NotificationPrefs } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

// The map (Leaflet) loads only when someone opens their work area.
const WorkAreaPicker = lazy(() =>
  import("@/components/duleko/map/WorkAreaPicker").then((m) => ({ default: m.WorkAreaPicker })),
);

/**
 * Settings, grouped the way a phone's own settings are: how Duleko looks
 * and talks to you, who can see and reach you, your account, and help.
 * Two columns once there's room.
 */
export function SettingsTab({ onOpenAbout }: { onOpenAbout: () => void }) {
  const { t } = useI18n();
  const { user, profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addPinOpen, setAddPinOpen] = useState(false);
  // The number + PIN this account signs in with, if any (migration 8100).
  const myPin = useMyPin();

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

  if (!profile) return null;
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
            {/* A mobile-number account has no email to send to. */}
            {user?.email && (
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
            )}
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
            <WorkAreaRow />
            <ContactPrivacyRows />
          </ListGroup>

          <ListGroup title={t("accountTitle")}>
            {myPin.data ? (
              <ListRow
                icon={KeyRound}
                title={t("changePin")}
                hint={t("changePinHint", { phone: myPin.data.phone })}
                onClick={() => setChangePinOpen(true)}
              />
            ) : myPin.isSuccess ? (
              <ListRow icon={Smartphone} title={t("addPin")} hint={t("addPinHint")} onClick={() => setAddPinOpen(true)} />
            ) : null}
            <ListRow icon={Gift} title={t("referralInvite")} hint={t("referralInviteHint")} onClick={() => setInviteOpen(true)} />
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
      <InviteFriendsDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      {myPin.data && (
        <ChangePinDialog pin={myPin.data} open={changePinOpen} onClose={() => setChangePinOpen(false)} />
      )}
      <AddPinDialog open={addPinOpen} onClose={() => setAddPinOpen(false)} />
    </>
  );
}

function useMyPin() {
  const { user } = useSession();
  return useQuery({ queryKey: ["my-pin", user?.id], queryFn: getMyPin, enabled: Boolean(user) });
}

/**
 * Settings > Change PIN, for an account that signs in with a mobile number.
 * The current PIN first (4 digits, or an older 6), then the new 4-digit
 * one twice - the same rules as when the account was made.
 */
function ChangePinDialog({ pin, open, onClose }: { pin: MyPin; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mobile = pin.phone;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [masked, setMasked] = useState(true);
  const [errors, setErrors] = useState<{ current?: string; next?: string; again?: string }>({});

  const save = useMutation({
    mutationFn: () => setMyPin({ pin: next, currentPin: current }),
    onSuccess: () => {
      close();
      toast(t("pinChanged"));
      queryClient.invalidateQueries({ queryKey: ["my-pin"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function submit() {
    const found: typeof errors = {};
    if (current.length !== pin.length) found.current = t("authPinIncomplete");
    if (next.length !== PIN_LENGTH) found.next = t("authPinIncomplete");
    else if (isWeakPin(next)) found.next = t("authPinWeak");
    else if (next === current) found.next = t("pinSameAsOld");
    if (!found.next && again !== next) found.again = t("authPinsDontMatch");
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  function close() {
    setCurrent("");
    setNext("");
    setAgain("");
    setMasked(true);
    setErrors({});
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("changePin")}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t("cancel")}
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            <KeyRound className="h-4 w-4" aria-hidden />
            {t("changePin")}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        {t("changePinHint", { phone: mobile })}
        {pin.length === OLD_PIN_LENGTH && <> {t("pinUpgradeHint")}</>}
      </p>
      <PinField
        label={t("currentPin")}
        length={pin.length}
        value={current}
        onChange={setCurrent}
        masked={masked}
        onToggleMasked={() => setMasked((v) => !v)}
        error={errors.current}
        disabled={save.isPending}
      />
      <PinField
        label={t("newPin")}
        hint={t("authPinCreateHint")}
        value={next}
        onChange={setNext}
        masked={masked}
        error={errors.next}
        disabled={save.isPending}
      />
      <PinField
        label={t("newPinAgain")}
        value={again}
        onChange={setAgain}
        masked={masked}
        error={errors.again}
        disabled={save.isPending}
        className="mb-0"
      />
    </Dialog>
  );
}

/**
 * Settings > Add mobile number + PIN: a second way in for an email or
 * Google account. Their email sign-in stays exactly as it was.
 */
function AddPinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [masked, setMasked] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; pin?: string }>({});

  const save = useMutation({
    mutationFn: () => setMyPin({ pin, phone }),
    onSuccess: () => {
      close();
      toast(t("pinAdded"));
      queryClient.invalidateQueries({ queryKey: ["my-pin"] });
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function submit() {
    const found: typeof errors = {};
    if (!isNepaliMobile(phone)) found.phone = t("authPhoneInvalid");
    if (pin.length !== PIN_LENGTH) found.pin = t("authPinIncomplete");
    else if (isWeakPin(pin)) found.pin = t("authPinWeak");
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  function close() {
    setPhone("");
    setPin("");
    setMasked(false);
    setErrors({});
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("addPin")}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t("cancel")}
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            <KeyRound className="h-4 w-4" aria-hidden />
            {t("save")}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">{t("addPinHint")}</p>
      <Field label={t("authPhoneLabel")} error={errors.phone}>
        <MobileNumberInput value={phone} onChange={setPhone} disabled={save.isPending} />
      </Field>
      <PinField
        label={t("authPinCreate")}
        value={pin}
        onChange={setPin}
        masked={masked}
        onToggleMasked={() => setMasked((v) => !v)}
        error={errors.pin}
        disabled={save.isPending}
        className="mb-0"
      />
    </Dialog>
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
 * "Your work area": where others see you on the map, picked on a map of
 * its own (WorkAreaPicker) and kept until you change it - an area about
 * 1 km wide, or a shop's exact spot.
 */
function WorkAreaRow() {
  const { t, lang } = useI18n();
  const location = useMyLocation();
  const [open, setOpen] = useState(false);
  const when = location ? relativeTime(location.shared_at, lang) : "";
  return (
    <>
      <ListRow
        icon={location?.is_shop ? Store : MapPin}
        title={t("workAreaTitle")}
        hint={
          !location
            ? t("workAreaNotSet")
            : location.is_shop
              ? t("workAreaShopSetHint", { time: when })
              : t("workAreaSetHint", { time: when })
        }
        trailing={
          <span className="shrink-0 text-xs font-semibold text-brand-700">
            {location ? t("workAreaChange") : t("workAreaSet")}
          </span>
        }
        onClick={() => setOpen(true)}
      />
      {open && (
        <Suspense fallback={null}>
          <WorkAreaPicker open onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

/**
 * One tap on the button should never be the whole action - a plain
 * Cancel/Sign out is enough here since it's reversible, unlike deleting.
 */
function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  // On by default: most phones are one person's, and signing back in is
  // then just the PIN. Never the PIN itself - see lib/saved-login.ts.
  const [remember, setRemember] = useState(true);
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
              void signOut({ remember });
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("signOut")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{t("signOutConfirmBody")}</p>
      <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-700"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span>
          {t("signOutRemember")}
          <span className="mt-0.5 block text-xs text-slate-500">{t("signOutRememberHint")}</span>
        </span>
      </label>
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
  const [pin, setPin] = useState("");

  // Google sign-ins have no password to check against, so those confirm by
  // typing the word instead. A restored session doesn't always carry
  // `identities`, so app_metadata is read as a second signal rather than
  // wrongly downgrading a password account to the typed confirmation.
  // A mobile-number account confirms with its PIN.
  const signInMethods = [
    ...(user?.identities?.map((i) => i.provider) ?? []),
    ...((user?.app_metadata?.providers as string[] | undefined) ?? []),
    user?.app_metadata?.provider,
  ];
  const mobile = signInMobile(user);
  const pinLength = useMyPin().data?.length ?? PIN_LENGTH;
  const hasPassword = !mobile && signInMethods.includes("email");
  const ready = mobile
    ? pin.length === pinLength
    : hasPassword
      ? password.length > 0
      : confirmWord.trim().toUpperCase() === t("deleteAccountWord");

  const remove = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("somethingWrong"));
      if (mobile && pinLength === PIN_LENGTH) {
        try {
          await checkMyPin(pin);
        } catch (err) {
          // Locked out says so; anything else is just a wrong PIN.
          throw err instanceof AccountAuthError && err.code === "pin_locked" ? err : new Error(t("wrongPin"));
        }
      } else if (mobile) {
        try {
          await verifyPassword({ phone: authPhone(mobile) }, pinToPassword(pin));
        } catch {
          throw new Error(t("wrongPin"));
        }
      } else if (hasPassword) {
        try {
          await verifyPassword({ email: user.email ?? "" }, password);
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
    setPin("");
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

      {mobile ? (
        <PinField
          label={t("deleteAccountPinLabel")}
          length={pinLength}
          value={pin}
          onChange={setPin}
          masked
          disabled={remove.isPending}
          className="mb-0 mt-4"
        />
      ) : hasPassword ? (
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
