import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  Bell,
  Briefcase,
  Cake,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Download,
  Eye,
  GraduationCap,
  Info,
  LayoutDashboard,
  Link2 as LinkIcon,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Pencil,
  Phone,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { RatingLine } from "@/components/duleko/WorkerList";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DetailRow, ProfileCover, SectionCard, StatItem } from "@/components/duleko/ProfileParts";
import { ContactPrivacyCard } from "@/components/duleko/ContactPrivacyCard";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MenuItem, MenuPanel } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { getCurrentPosition } from "@/lib/geolocation";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  addCertificate,
  clearLocation,
  deleteMyAccount,
  getAvailability,
  getContact,
  getNotificationPrefs,
  listCertificates,
  listSkills,
  removeCertificate,
  saveContact,
  saveNotificationPrefs,
  setDayStatus,
  setLocationConsent,
  setUserSkills,
  shareLocation,
  updateProfile,
  uploadAvatar,
  verifyPassword,
  uploadCover,
  getUserSkills,
  type UserSkillInput,
} from "@/lib/queries";
import { copyLink, profileUrl, shareProfile } from "@/lib/share";
import { profileCardFilename, renderProfileCard, saveProfileCard } from "@/lib/profileCard";
import { errorMessage } from "@/lib/supabase";
import type { NotificationPrefs } from "@/lib/types";
import {
  addDays,
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  isValidNepaliPhone,
  locationLine,
  normalisePhone,
  relativeTime,
  skillName,
  toDateKey,
  todayKey,
} from "@/lib/utils";

interface SkillDraft {
  rate_amount: string;
  rate_unit: string;
  custom_label: string;
  custom_note: string;
}

const emptyDraft: SkillDraft = { rate_amount: "", rate_unit: "", custom_label: "", custom_note: "" };

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { profile, user, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [about, setAbout] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    province: null,
    district: null,
    municipality: null,
    ward: null,
    locality: null,
  });
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, SkillDraft>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const allSkills = useQuery({ queryKey: ["skills"], queryFn: listSkills, staleTime: 30 * 60_000 });
  const mySkills = useQuery({
    queryKey: ["user-skills", profile?.id],
    queryFn: () => getUserSkills(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const myPhone = useQuery({
    queryKey: ["contact", profile?.id],
    queryFn: () => getContact(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const myCertificates = useQuery({
    queryKey: ["certificates", profile?.id],
    queryFn: () => listCertificates(profile!.id),
    enabled: Boolean(profile?.id),
  });
  // A full year ahead - the "mark busy days" calendar can flip forward
  // through all 12 months, so it needs the availability rows to match.
  const availability = useQuery({
    queryKey: ["availability", profile?.id],
    queryFn: () => getAvailability(profile!.id, todayKey(), toDateKey(addDays(new Date(), 365))),
    enabled: Boolean(profile?.id),
  });
  const alertPrefs = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    queryFn: () => getNotificationPrefs(profile!.id),
    enabled: Boolean(profile?.id),
  });

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

  // Seed the form once the profile and its related rows have loaded.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAbout(profile.about ?? "");
    setBio(profile.bio ?? "");
    setAge(profile.age != null ? String(profile.age) : "");
    setEducation(profile.education ?? "");
    setLocation({
      province: profile.province,
      district: profile.district,
      municipality: profile.municipality,
      ward: profile.ward,
      locality: profile.locality,
    });
  }, [profile]);

  useEffect(() => {
    if (!mySkills.data) return;
    setSkillIds(mySkills.data.map((s) => s.id));
    const drafts: Record<string, SkillDraft> = {};
    for (const s of mySkills.data) {
      drafts[s.id] = {
        rate_amount: s.rate_amount != null ? String(s.rate_amount) : "",
        rate_unit: s.rate_unit ?? "",
        custom_label: s.custom_label ?? "",
        custom_note: s.custom_note ?? "",
      };
    }
    setSkillDrafts(drafts);
  }, [mySkills.data]);

  useEffect(() => {
    if (!myPhone.data) return;
    setPhone(myPhone.data.phone);
    setAltPhone(myPhone.data.alt_phone ?? "");
  }, [myPhone.data]);

  function toggleSkill(id: string) {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setSkillDrafts((prev) => (prev[id] ? prev : { ...prev, [id]: { ...emptyDraft } }));
  }

  function draftFor(id: string): SkillDraft {
    return skillDrafts[id] ?? emptyDraft;
  }

  function setDraft(id: string, patch: Partial<SkillDraft>) {
    setSkillDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (phone && !isValidNepaliPhone(phone)) throw new Error(t("phoneInvalid"));
      if (altPhone && !isValidNepaliPhone(altPhone)) throw new Error(t("phoneInvalid"));
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        about: about.trim() || null,
        bio: bio.trim() || null,
        age: age.trim() ? Number(age) : null,
        education: education.trim() || null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
      });
      if (phone) await saveContact(profile.id, normalisePhone(phone), altPhone ? normalisePhone(altPhone) : null);
      const entries: UserSkillInput[] = skillIds.map((id) => {
        const d = draftFor(id);
        return {
          skill_id: id,
          custom_label: id === "other" ? d.custom_label.trim() || null : null,
          custom_note: id === "other" ? d.custom_note.trim() || null : null,
          rate_amount: d.rate_amount.trim() ? Number(d.rate_amount) : null,
          rate_unit: d.rate_amount.trim() && d.rate_unit.trim() ? d.rate_unit.trim() : null,
        };
      });
      await setUserSkills(profile.id, entries);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      await refreshProfile();
      toast(t("profileSaved"));
      setEditing(false);
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const toggleAvailable = useMutation({
    mutationFn: (next: boolean) => updateProfile(profile!.id, { is_available: next }),
    onSuccess: async () => {
      await refreshProfile();
    },
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

  // Drawn fresh on a canvas from the real profile - never a screenshot -
  // then handed to the browser as a plain PNG download.
  const downloadCard = useMutation({
    mutationFn: async () => {
      const blob = await renderProfileCard(profile!, mySkills.data ?? [], myPhone.data?.phone);
      return saveProfileCard(blob, profileCardFilename(profile!));
    },
    onSuccess: (result) => {
      if (result === "cancelled") return;
      toast(t(result === "shared" ? "cardReadyToShare" : "cardDownloaded"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

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

  const copy = useMutation({
    mutationFn: () => copyLink(profileUrl(profile!.public_slug)),
    onSuccess: (result) =>
      result === "copied" ? toast(t("linkCopied")) : toast(t("copyFailed"), "error"),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error(t("somethingWrong"));
      if (hasPassword) {
        try {
          await verifyPassword(user.email ?? "", deletePassword);
        } catch {
          throw new Error(t("wrongPassword"));
        }
      }
      await deleteMyAccount(user.id);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      toast(t("deleteAccountDone"));
      await signOut();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const deleteReady = hasPassword
    ? deletePassword.length > 0
    : deleteConfirm.trim().toUpperCase() === t("deleteAccountWord");

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

  const changeDay = useMutation({
    mutationFn: ({ day, status }: { day: string; status: "available" | "booked" }) =>
      setDayStatus(profile!.id, day, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", profile?.id] }),
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const changeAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !profile) return;
      const url = await uploadAvatar(user.id, file);
      await updateProfile(profile.id, { avatar_url: url });
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const changeCover = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !profile) return;
      const url = await uploadCover(user.id, file);
      await updateProfile(profile.id, { cover_url: url });
    },
    onSuccess: async () => {
      await refreshProfile();
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const addCert = useMutation({
    mutationFn: async ({ title, file }: { title: string; file: File }) => {
      if (!user || !profile) return;
      await addCertificate(user.id, profile.id, title, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] });
      setCertTitle("");
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  const deleteCert = useMutation({
    mutationFn: (id: string) => removeCertificate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["certificates", profile?.id] }),
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
      toast(t("profileSaved"));
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  if (!profile) return <SignInRequiredScreen title={t("myProfile")} />;

  const place = locationLine(profile, lang);
  const skillList = mySkills.data ?? [];
  const certificates = myCertificates.data ?? [];
  // Every day is open by default - only "booked" is ever an explicit row -
  // so a busy-days count is the one number this data can honestly show;
  // "days available" would just restate the calendar's default state.
  const busyDaysCount = (availability.data ?? []).filter((d) => d.status === "booked").length;
  const coverSrc = coverPreview ?? profile.cover_url;

  // What people look for before they trust a profile - the nudge on the
  // Overview tab lists whichever of these are still missing.
  const strengthChecks: { done: boolean; label: string; icon: LucideIcon }[] = [
    { done: Boolean(profile.avatar_url || avatarPreview), label: t("profileItemPhoto"), icon: Camera },
    { done: Boolean(profile.about?.trim() || profile.bio?.trim()), label: t("profileItemAbout"), icon: Info },
    { done: Boolean(profile.district), label: t("profileItemLocation"), icon: MapPin },
    { done: skillList.length > 0, label: t("profileItemSkills"), icon: Briefcase },
    { done: Boolean(myPhone.data?.phone), label: t("profileItemPhone"), icon: Phone },
    { done: certificates.length > 0, label: t("profileItemCertificate"), icon: Award },
  ];
  const strengthPercent = Math.round(
    (strengthChecks.filter((c) => c.done).length / strengthChecks.length) * 100,
  );

  function startEditing() {
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const tabs: { id: ProfileTab; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "overview", label: t("profileTabOverview"), icon: LayoutDashboard },
    { id: "calendar", label: t("profileTabCalendar"), icon: CalendarDays, badge: busyDaysCount },
    { id: "settings", label: t("profileTabSettings"), icon: SettingsIcon },
  ];

  return (
    <>
      <AppHeader title={t("myProfile")} />
      <PageContainer className="space-y-5 md:space-y-6">
        {/* ================================================================
            Identity: cover, photo, name, actions, availability, stats
            ================================================================ */}
        <section className="animate-in-up overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <ProfileCover src={coverSrc}>
            <label className="absolute right-3 top-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white sm:right-4 sm:top-4">
              <Camera className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("changeCover")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 4 * 1024 * 1024) {
                    toast(t("photoTooBig"), "error");
                    return;
                  }
                  setCoverPreview(URL.createObjectURL(file));
                  changeCover.mutate(file);
                }}
              />
            </label>
          </ProfileCover>

          <div className="px-4 pb-5 sm:px-6 sm:pb-6">
            {/* Centred on a phone, photo-left with actions on the right
                from sm up. */}
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
              <div className="relative z-10 -mt-14 shrink-0 sm:-mt-16">
                <Avatar
                  name={profile.full_name}
                  src={avatarPreview ?? profile.avatar_url}
                  size={112}
                  className="shadow-lg ring-4 ring-white"
                />
                <label className="absolute bottom-1 right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-brand-700 text-white shadow-md ring-4 ring-white transition-colors hover:bg-brand-800">
                  <Camera className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{t("changePhoto")}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast(t("photoTooBig"), "error");
                        return;
                      }
                      setAvatarPreview(URL.createObjectURL(file));
                      changeAvatar.mutate(file);
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0 max-w-full flex-1 sm:pb-1">
                <h2 className="flex min-w-0 items-center justify-center gap-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:justify-start sm:text-[1.75rem]">
                  <span className="truncate">{profile.full_name}</span>
                  <VerifiedBadge staffRole={profile.staff_role} verified={profile.is_verified} size={22} />
                </h2>
                {profile.bio && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">{profile.bio}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-500 sm:justify-start">
                  {place && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span className="truncate">{place}</span>
                    </span>
                  )}
                  <RatingLine rating={profile.rating} count={profile.rating_count} className="text-sm" />
                </div>
              </div>

              {!editing && (
                <div className="relative flex w-full items-center gap-2 sm:w-auto sm:pb-1" data-profile-menu>
                  <Button className="flex-1 sm:flex-none" onClick={startEditing}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    {t("editProfile")}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => share.mutate()}
                    aria-label={t("shareProfile")}
                    title={t("shareProfile")}
                  >
                    <Share2 className="h-4.5 w-4.5" aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    loading={downloadCard.isPending}
                    onClick={() => downloadCard.mutate()}
                    aria-label={downloadCard.isPending ? t("generatingCard") : t("downloadCard")}
                    title={t("downloadCard")}
                  >
                    {!downloadCard.isPending && <Download className="h-4.5 w-4.5" aria-hidden />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={t("profileOptions")}
                  >
                    <MoreHorizontal className="h-4.5 w-4.5" aria-hidden />
                  </Button>

                  {menuOpen && (
                    <MenuPanel className="w-56">
                      <MenuItem
                        icon={LinkIcon}
                        label={t("copyLink")}
                        onClick={() => {
                          setMenuOpen(false);
                          copy.mutate();
                        }}
                      />
                      <MenuItem
                        icon={Eye}
                        label={t("viewPublicProfile")}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate({ to: "/worker/$workerId", params: { workerId: profile.id } });
                        }}
                      />
                      {profile.staff_role && (
                        <MenuItem
                          icon={ShieldCheck}
                          label={t("moderation")}
                          onClick={() => {
                            setMenuOpen(false);
                            navigate({ to: "/moderation" });
                          }}
                        />
                      )}
                    </MenuPanel>
                  )}
                </div>
              )}
            </div>

            {/* The one switch people flip most - right under their name,
                with what it actually changes spelled out. */}
            <div
              className={cn(
                "mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors duration-300",
                profile.is_available ? "border-brand-200 bg-brand-50/70" : "border-slate-200 bg-slate-50",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <span className="relative flex h-3 w-3" aria-hidden>
                  {profile.is_available && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-50" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex h-3 w-3 rounded-full",
                      profile.is_available ? "bg-brand-500" : "bg-slate-300",
                    )}
                  />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {profile.is_available ? t("availableForWork") : t("notAvailable")}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-slate-500">
                  {profile.is_available ? t("availabilityOnHint") : t("availabilityOffHint")}
                </p>
              </div>
              <Switch
                checked={profile.is_available}
                disabled={toggleAvailable.isPending}
                onChange={(next) => toggleAvailable.mutate(next)}
                aria-label={t("availableForWork")}
              />
            </div>
          </div>

          {/* Hairline dividers from the 1px gaps over a grey backing. */}
          <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
            <StatItem icon={Briefcase} label={t("skills")} value={formatNumber(skillList.length, lang)} />
            <StatItem
              icon={Star}
              label={t("ratingLabel")}
              value={profile.rating_count > 0 ? formatNumber(Number(profile.rating).toFixed(1), lang) : "–"}
            />
            <StatItem icon={MessageSquare} label={t("reviews")} value={formatNumber(profile.rating_count, lang)} />
            <StatItem
              icon={CalendarDays}
              label={t("memberSince")}
              value={formatDate(profile.created_at.slice(0, 10), lang)}
              small
            />
          </dl>
        </section>

        {editing ? (
          /* ==============================================================
             Edit mode
             ============================================================== */
          <>
            <div className="animate-in-up flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
                <Pencil className="h-4 w-4" aria-hidden />
                {t("editingProfile")}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              <SectionCard icon={Info} title={t("basicInfo")}>
                <Field label={t("yourName")}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
                </Field>
                <Field label={`${t("bio")} (${t("optional")})`} hint={t("bioHint")}>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} />
                </Field>
                <Field label={t("aboutYou")}>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} maxLength={600} />
                </Field>
                <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                  <Field label={`${t("age")} (${t("optional")})`}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={14}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </Field>
                  <Field label={`${t("highestEducation")} (${t("optional")})`}>
                    <Input value={education} onChange={(e) => setEducation(e.target.value)} maxLength={100} />
                  </Field>
                </div>
              </SectionCard>

              <div className="space-y-5">
                <SectionCard icon={Phone} title={t("phoneNumber")}>
                  <Field label={t("phoneNumber")} hint={t("phoneHint")}>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                  </Field>
                  <Field label={`${t("altPhone")} (${t("optional")})`} className="mb-0">
                    <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
                  </Field>
                </SectionCard>

                <SectionCard icon={MapPin} title={t("whereYouAre")}>
                  <LocationFields value={location} onChange={setLocation} />
                </SectionCard>
              </div>
            </div>

            <SectionCard icon={Briefcase} title={t("yourSkills")}>
              <SkillPicker skills={allSkills.data ?? []} selected={skillIds} onToggle={toggleSkill} />

              {skillIds.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {skillIds.map((id) => {
                    const skill = (allSkills.data ?? []).find((s) => s.id === id);
                    if (!skill) return null;
                    const d = draftFor(id);
                    return (
                      <div key={id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 sm:p-4">
                        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <SkillTile skillId={skill.id} className="h-8 w-8 rounded-lg bg-white ring-1 ring-slate-200" />
                          {skillName(skill, lang)}
                        </p>
                        {id === "other" && (
                          <>
                            <Field label={t("othersSkillLabel")}>
                              <Input
                                value={d.custom_label}
                                onChange={(e) => setDraft(id, { custom_label: e.target.value })}
                                placeholder={t("othersSkillPlaceholder")}
                                maxLength={60}
                              />
                            </Field>
                            <Field label={t("othersSkillNoteLabel")}>
                              <Input
                                value={d.custom_note}
                                onChange={(e) => setDraft(id, { custom_note: e.target.value })}
                                placeholder={t("othersSkillNotePlaceholder")}
                                maxLength={300}
                              />
                            </Field>
                          </>
                        )}
                        <p className="mb-1.5 text-xs text-slate-500">{t("rateHint")}</p>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-sm font-medium text-slate-500">
                            {lang === "ne" ? "रु" : "Rs"}
                          </span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="w-24 shrink-0 bg-white"
                            value={d.rate_amount}
                            onChange={(e) => setDraft(id, { rate_amount: e.target.value })}
                            placeholder={t("rateAmountPlaceholder")}
                          />
                          <span className="shrink-0 text-sm text-slate-400">/</span>
                          <Input
                            className="min-w-0 flex-1 bg-white"
                            value={d.rate_unit}
                            onChange={(e) => setDraft(id, { rate_unit: e.target.value })}
                            placeholder={t("rateUnitPlaceholder")}
                            maxLength={30}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Stays on screen while scrolling the form - above the phone
                tab bar, at the bottom edge once the sidebar takes over. */}
            <div className="sticky bottom-[calc(4.25rem+var(--sab))] z-20 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/10 backdrop-blur md:bottom-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
              <Button className="flex-[2] sm:flex-1" loading={save.isPending} onClick={() => save.mutate()}>
                <Check className="h-4 w-4" aria-hidden />
                {t("saveChanges")}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* ============================================================
                Tabs
                ============================================================ */}
            <div
              role="tablist"
              aria-label={t("profileSectionsNav")}
              className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
            >
              {tabs.map(({ id, label, icon: Icon, badge }) => {
                const selected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`profile-tab-${id}`}
                    aria-selected={selected}
                    aria-controls={`profile-panel-${id}`}
                    onClick={() => setTab(id)}
                    className={cn(
                      "flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all duration-200",
                      selected
                        ? "bg-brand-700 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                    {badge ? (
                      <span
                        className={cn(
                          "hidden rounded-full px-1.5 text-[11px] font-bold leading-5 sm:inline",
                          selected ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {formatNumber(badge, lang)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {tab === "overview" && (
              <div
                id="profile-panel-overview"
                role="tabpanel"
                aria-labelledby="profile-tab-overview"
                className="animate-in-up space-y-5"
              >
                {strengthPercent < 100 && (
                  <ProfileStrength percent={strengthPercent} checks={strengthChecks} onComplete={startEditing} />
                )}

                <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
                  <SectionCard
                    className="lg:col-span-3"
                    icon={Info}
                    title={t("aboutYou")}
                    action={<CardAction onClick={startEditing} icon={Pencil} label={t("editProfile")} />}
                  >
                    {profile.about ? (
                      <p className="whitespace-pre-line text-[15px] leading-7 text-slate-700">{profile.about}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={startEditing}
                        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-left text-sm text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-800"
                      >
                        <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                        {t("noAboutYet")}
                      </button>
                    )}
                  </SectionCard>

                  <SectionCard className="lg:col-span-2" icon={UserRound} title={t("profileDetails")}>
                    <dl className="space-y-3.5">
                      {myPhone.data?.phone && (
                        <DetailRow icon={Phone} label={t("phoneNumber")} value={myPhone.data.phone} />
                      )}
                      {myPhone.data?.alt_phone && (
                        <DetailRow icon={Phone} label={t("altPhone")} value={myPhone.data.alt_phone} />
                      )}
                      {place && <DetailRow icon={MapPin} label={t("whereYouAre")} value={place} />}
                      {profile.age != null && (
                        <DetailRow
                          icon={Cake}
                          label={t("age")}
                          value={t("yearsOld", { count: formatNumber(profile.age, lang) })}
                        />
                      )}
                      {profile.education && (
                        <DetailRow icon={GraduationCap} label={t("highestEducation")} value={profile.education} />
                      )}
                      <DetailRow
                        icon={CalendarDays}
                        label={t("memberSince")}
                        value={formatDate(profile.created_at.slice(0, 10), lang)}
                      />
                    </dl>
                  </SectionCard>
                </div>

                <SectionCard
                  icon={Briefcase}
                  title={t("skillsAndRates")}
                  badge={skillList.length > 0 ? skillList.length : undefined}
                  action={
                    skillList.length > 0 ? (
                      <CardAction onClick={startEditing} icon={Pencil} label={t("editSkills")} />
                    ) : undefined
                  }
                >
                  {skillList.length === 0 ? (
                    <EmptyState
                      icon={<Briefcase className="h-7 w-7" />}
                      title={t("noSkillsYetProfile")}
                      hint={t("noSkillsYetProfileHint")}
                      action={
                        <Button size="sm" onClick={startEditing}>
                          {t("addYourSkills")}
                        </Button>
                      }
                    />
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {skillList.map((s) => {
                        const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                        const rate =
                          s.rate_amount != null
                            ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                            : null;
                        return (
                          <li
                            key={s.id}
                            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:border-brand-200 hover:shadow-sm"
                          >
                            <SkillTile
                              skillId={s.id}
                              className="h-11 w-11 rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-900">{label}</p>
                              {s.custom_note ? (
                                <p className="mt-0.5 truncate text-xs text-slate-500">{s.custom_note}</p>
                              ) : null}
                            </div>
                            {rate && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                                {rate}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard
                  icon={Award}
                  title={t("certificates")}
                  badge={certificates.length > 0 ? certificates.length : undefined}
                >
                  <p className="-mt-1 mb-4 text-sm text-slate-500">{t("certificatesHint")}</p>

                  {certificates.length > 0 ? (
                    <ul className="mb-4 grid gap-2.5 sm:grid-cols-2">
                      {certificates.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-brand-200"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-400/15 text-sun-500">
                            <Award className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <a
                              href={c.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700 hover:underline"
                            >
                              {c.title}
                            </a>
                            <p className="text-xs text-slate-500">{formatDate(c.created_at.slice(0, 10), lang)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCert.mutate(c.id)}
                            aria-label={t("delete")}
                            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mb-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
                      <Award className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
                      <p className="mt-2 text-sm font-medium text-slate-600">{t("noCertificatesYet")}</p>
                      <p className="mt-1 text-xs text-slate-500">{t("noCertificatesYetHint")}</p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 p-3 sm:p-3.5">
                    <p className="mb-2 text-sm font-semibold text-slate-800">{t("addCertificate")}</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        placeholder={t("certificateTitlePlaceholder")}
                        maxLength={100}
                        className="flex-1 bg-white"
                      />
                      <label
                        className={cn(
                          "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800",
                          (!certTitle.trim() || addCert.isPending) && "pointer-events-none opacity-50",
                        )}
                      >
                        <Upload className="h-4 w-4" aria-hidden />
                        {t("upload")}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          disabled={!certTitle.trim() || addCert.isPending}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || !certTitle.trim()) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast(t("photoTooBig"), "error");
                              return;
                            }
                            addCert.mutate({ title: certTitle.trim(), file });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">{t("uploadCertificateHint")}</p>
                  </div>
                </SectionCard>
              </div>
            )}

            {tab === "calendar" && (
              <div
                id="profile-panel-calendar"
                role="tabpanel"
                aria-labelledby="profile-tab-calendar"
                className="animate-in-up"
              >
                <SectionCard
                  icon={CalendarDays}
                  title={t("markCalendar")}
                  badge={busyDaysCount > 0 ? busyDaysCount : undefined}
                >
                  <p className="-mt-1 text-sm text-slate-500">{t("calendarHint")}</p>
                  <p
                    className={cn(
                      "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
                      busyDaysCount > 0 ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-800",
                    )}
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full", busyDaysCount > 0 ? "bg-amber-500" : "bg-brand-500")}
                      aria-hidden
                    />
                    {busyDaysCount > 0
                      ? t("daysMarkedBusy", { count: formatNumber(busyDaysCount, lang) })
                      : t("noBusyDays")}
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-2 sm:p-4">
                    <AvailabilityCalendar
                      days={availability.data ?? []}
                      editable
                      monthView
                      onToggle={(day, status) => changeDay.mutate({ day, status })}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {tab === "settings" && (
              <div
                id="profile-panel-settings"
                role="tabpanel"
                aria-labelledby="profile-tab-settings"
                className="animate-in-up grid gap-5 lg:grid-cols-2 lg:items-start"
              >
                <div className="space-y-5">
                  <SectionCard icon={Eye} title={t("visibilityTitle")}>
                    <SettingRow
                      icon={Navigation}
                      title={t("shareLocation")}
                      description={
                        <>
                          <span className="block font-medium text-slate-700">
                            {profile.location_consent === "granted"
                              ? profile.location_shared_at
                                ? t("locationShared", { time: relativeTime(profile.location_shared_at, lang) })
                                : t("locationSharedPending")
                              : t("locationNotShared")}
                          </span>
                          <span className="mt-1 block">{t("shareLocationHint")}</span>
                        </>
                      }
                      control={
                        <Switch
                          checked={profile.location_consent === "granted"}
                          disabled={toggleLocationSharing.isPending}
                          onChange={(next) => toggleLocationSharing.mutate(next)}
                          aria-label={t("shareLocation")}
                        />
                      }
                    />
                  </SectionCard>

                  <SectionCard icon={Bell} title={t("alertsOutsideApp")}>
                    <div className="space-y-2">
                      <SettingRow
                        icon={Mail}
                        title={t("emailAlerts")}
                        description={t("emailAlertsHint")}
                        control={
                          <Switch
                            checked={alertPrefs.data?.email_enabled ?? true}
                            onChange={(next) => saveAlerts.mutate({ email_enabled: next })}
                            aria-label={t("emailAlerts")}
                          />
                        }
                      />
                      <SettingRow
                        icon={MessageSquare}
                        title={t("smsAlerts")}
                        description={t("smsAlertsHint")}
                        control={
                          <Switch
                            checked={alertPrefs.data?.sms_enabled ?? false}
                            onChange={(next) => saveAlerts.mutate({ sms_enabled: next })}
                            aria-label={t("smsAlerts")}
                          />
                        }
                      />
                    </div>
                  </SectionCard>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <ContactPrivacyCard />
                  </section>
                </div>

                <div className="space-y-5">
                  <SectionCard icon={UserRound} title={t("accountTitle")}>
                    <div className="space-y-2">
                      <LinkRow to="/friends" icon={Users} label={t("myFriends")} />
                      <Link
                        to="/worker/$workerId"
                        params={{ workerId: profile.id }}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
                      >
                        <span className="inline-flex items-center gap-3">
                          <RowIcon icon={Eye} />
                          {t("viewPublicProfile")}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                      </Link>
                      <div className="rounded-xl bg-slate-50 px-3.5 py-3">
                        <div className="flex items-start gap-3">
                          <RowIcon icon={LinkIcon} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">{t("yourProfileLink")}</p>
                            <p className="mt-0.5 break-all text-xs text-slate-500">
                              {profileUrl(profile.public_slug)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{t("shareProfileHint")}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2 pl-11">
                          <Button size="sm" variant="outline" onClick={() => copy.mutate()}>
                            <LinkIcon className="h-4 w-4" aria-hidden />
                            {t("copyLink")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => share.mutate()}>
                            <Share2 className="h-4 w-4" aria-hidden />
                            {t("shareProfile")}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setSignOutConfirmOpen(true)}
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      {t("signOut")}
                    </Button>
                  </SectionCard>

                  <section className="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2.5 text-base font-semibold text-red-700">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </span>
                      {t("deleteAccount")}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{t("deleteAccountHint")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-red-300 bg-white text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setDeleteConfirm("");
                        setDeletePassword("");
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("deleteAccount")}
                    </Button>
                  </section>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- About Duleko links ------------------------------------- */}
        <nav
          className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm sm:px-6"
          aria-label={t("staticPagesNav")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("aboutTitle")}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-[13px]">
            {t("profileStaticPagesHint")}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {(
              [
                { to: "/about" as const, labelKey: "navAbout" as const },
                { to: "/mission" as const, labelKey: "navMission" as const },
                { to: "/motivation" as const, labelKey: "navMotivation" as const },
                { to: "/privacy" as const, labelKey: "navPrivacy" as const },
              ] as const
            ).map((page) => (
              <Link
                key={page.to}
                to={page.to}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 sm:text-[13px]"
              >
                {t(page.labelKey)}
              </Link>
            ))}
          </div>
        </nav>
      </PageContainer>

      {/* One tap on the button should never be the whole action - a
          plain Cancel/Sign out is enough here since it's reversible,
          unlike delete account below. */}
      <Dialog
        open={signOutConfirmOpen}
        onClose={() => setSignOutConfirmOpen(false)}
        title={t("signOutConfirmTitle")}
        footer={
          <>
            <Button variant="outline" onClick={() => setSignOutConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setSignOutConfirmOpen(false);
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

      {/* Proving it is really you, rather than a plain Yes/No, so this
          can't be tapped through by accident - there is no undo. */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("deleteAccount")}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              loading={deleteAccount.isPending}
              disabled={!deleteReady}
              onClick={() => deleteAccount.mutate()}
            >
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
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteReady) deleteAccount.mutate();
              }}
            />
          </Field>
        ) : (
          // Signed in with Google: there is no password of ours to check.
          <Field label={t("deleteAccountConfirmLabel")} className="mt-4">
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={t("deleteAccountWord")}
              autoComplete="off"
            />
          </Field>
        )}
      </Dialog>
    </>
  );
}

type ProfileTab = "overview" | "calendar" | "settings";

/** Small text action in a card's header ("Edit", "Edit skills"). */
function CardAction({ onClick, icon: Icon, label }: { onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
      <RowIcon icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {description && <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</div>}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function LinkRow({ to, icon, label }: { to: "/friends"; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
    >
      <span className="inline-flex items-center gap-3">
        <RowIcon icon={icon} />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
    </Link>
  );
}

/** How complete the profile is, and what's still missing. */
function ProfileStrength({
  percent,
  checks,
  onComplete,
}: {
  percent: number;
  checks: { done: boolean; label: string; icon: LucideIcon }[];
  onComplete: () => void;
}) {
  const { t, lang } = useI18n();
  const missing = checks.filter((c) => !c.done);
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-slate-900">
              {t("profileCompleteTitle", { percent: formatNumber(percent, lang) })}
            </p>
            <span className="text-sm font-bold text-brand-700 sm:hidden">{formatNumber(percent, lang)}%</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{t("profileCompleteHint")}</p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {missing.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-brand-800"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" onClick={onComplete}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {t("completeProfile")}
        </Button>
      </div>
    </section>
  );
}
