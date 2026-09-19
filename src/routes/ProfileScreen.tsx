import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  Briefcase,
  Calendar,
  Camera,
  ChevronRight,
  Eye,
  Info,
  Link2 as LinkIcon,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Download,
  Pencil,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { AppHeader, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { SignInRequiredScreen } from "@/components/duleko/SignInGate";
import { RatingStars } from "@/components/duleko/Rating";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, SectionIcon, SectionTitle } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { ContactPrivacyCard } from "@/components/duleko/ContactPrivacyCard";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MenuItem, MenuPanel } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { SkillIcon, SkillTile } from "@/components/duleko/SkillIcon";
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
import { renderProfileCard, saveProfileCard } from "@/lib/profileCard";
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
      const blob = await renderProfileCard(profile!, mySkills.data ?? []);
      return saveProfileCard(blob, `${profile!.public_slug}-duleko-card.png`);
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
  // Every day is open by default - only "booked" is ever an explicit row -
  // so a busy-days count is the one number this data can honestly show;
  // "days available" would just restate the calendar's default state.
  const busyDaysCount = (availability.data ?? []).filter((d) => d.status === "booked").length;

  return (
    <>
      <AppHeader title={t("myProfile")} />
      <PageContainer className="max-w-2xl space-y-4 md:max-w-3xl md:space-y-5">
        {/* ---- Identity hero ------------------------------------------------ */}
        <Card className="overflow-hidden">
          <div className="relative h-28 w-full bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 sm:h-36">
            {(coverPreview ?? profile.cover_url) && (
              <img
                src={coverPreview ?? profile.cover_url ?? undefined}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <label className="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur transition-colors hover:bg-white">
              <Camera className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("changeCover")}</span>
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
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="relative z-10 -mt-12 inline-block sm:-mt-14">
                <Avatar
                  name={profile.full_name}
                  src={avatarPreview ?? profile.avatar_url}
                  size={88}
                  online
                  className="shadow-md ring-4 ring-white"
                />
                <label className="absolute -bottom-0.5 -right-0.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                  <Camera className="h-3.5 w-3.5" aria-hidden />
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

              {!editing && (
                <div className="relative mt-2.5 flex shrink-0 items-center gap-1.5 sm:mt-3" data-profile-menu>
                  <div className="hidden items-center gap-1 sm:flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-medium text-slate-600"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      {t("editProfile")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-medium text-slate-600"
                      onClick={() => share.mutate()}
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                      {t("shareProfile")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs font-medium text-slate-600"
                      loading={downloadCard.isPending}
                      onClick={() => downloadCard.mutate()}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      {downloadCard.isPending ? t("generatingCard") : t("downloadCard")}
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={t("profileOptions")}
                    className={cn(
                      "rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-700",
                      profile.staff_role ? "sm:p-1.5" : "sm:hidden",
                    )}
                  >
                    <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                  </button>

                  {menuOpen && (
                    <MenuPanel className="w-48">
                      <div className="sm:hidden">
                        <MenuItem
                          icon={Pencil}
                          label={t("editProfile")}
                          onClick={() => {
                            setMenuOpen(false);
                            setEditing(true);
                          }}
                        />
                        <MenuItem
                          icon={Share2}
                          label={t("shareProfile")}
                          onClick={() => {
                            setMenuOpen(false);
                            share.mutate();
                          }}
                        />
                        <MenuItem
                          icon={Download}
                          label={downloadCard.isPending ? t("generatingCard") : t("downloadCard")}
                          onClick={() => {
                            setMenuOpen(false);
                            downloadCard.mutate();
                          }}
                        />
                      </div>
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

            <h2 className="mt-3 flex min-w-0 items-center gap-1.5 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              <span className="truncate">{profile.full_name}</span>
              <VerifiedBadge staffRole={profile.staff_role} verified={profile.is_verified} size={18} />
            </h2>
            {profile.bio && <p className="mt-1 text-sm leading-relaxed text-slate-600">{profile.bio}</p>}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
              {place && (
                <p className="inline-flex min-w-0 items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{place}</span>
                </p>
              )}
              <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-2.5 pr-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    profile.is_available ? "bg-green-500" : "bg-slate-300",
                  )}
                  aria-hidden
                />
                <span className="text-xs font-medium text-slate-600">
                  {profile.is_available ? t("availableNow") : t("notAvailable")}
                </span>
                <Switch
                  size="sm"
                  checked={profile.is_available}
                  onChange={(next) => toggleAvailable.mutate(next)}
                  aria-label={t("availableForWork")}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-100">
            <div className="px-2 py-3.5 text-center sm:py-4">
              <p className="text-base font-semibold text-slate-900 sm:text-lg">
                {formatNumber(skillList.length, lang)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                {t("skills")}
              </p>
            </div>
            <div className="border-x border-slate-100 px-2 py-3.5 text-center sm:py-4">
              <p className="text-base font-semibold text-slate-900 sm:text-lg">
                {formatNumber(profile.rating_count, lang)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                {t("reviews")}
              </p>
            </div>
            <div className="px-2 py-3.5 text-center sm:py-4">
              <p className="text-base font-semibold text-slate-900 sm:text-lg">
                {formatDate(profile.created_at.slice(0, 10), lang)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                {t("memberSince")}
              </p>
            </div>
          </div>
        </Card>

        {editing ? (
          <>
            <div className="animate-in-up flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-900">
                <Pencil className="h-4 w-4" aria-hidden />
                {t("editingProfile")}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                {t("done")}
              </Button>
            </div>

            <Card>
              <CardBody className="space-y-1 p-4 sm:p-5">
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={Info} />
                    {t("basicInfo")}
                  </span>
                </SectionTitle>
                <Field label={t("yourName")}>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
                </Field>
                <Field label={t("phoneNumber")} hint={t("phoneHint")}>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                </Field>
                <Field label={`${t("altPhone")} (${t("optional")})`}>
                  <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
                </Field>
                <Field label={`${t("bio")} (${t("optional")})`} hint={t("bioHint")}>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <Field label={t("aboutYou")}>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} maxLength={600} />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4 sm:p-5">
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={MapPin} />
                    {t("whereYouAre")}
                  </span>
                </SectionTitle>
                <LocationFields value={location} onChange={setLocation} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4 sm:p-5">
                <SectionTitle>
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon icon={Briefcase} />
                    {t("yourSkills")}
                  </span>
                </SectionTitle>
                <SkillPicker skills={allSkills.data ?? []} selected={skillIds} onToggle={toggleSkill} />

                {skillIds.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {skillIds.map((id) => {
                      const skill = (allSkills.data ?? []).find((s) => s.id === id);
                      if (!skill) return null;
                      const d = draftFor(id);
                      return (
                        <div key={id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-3.5">
                          <p className="mb-2 text-sm font-medium text-slate-800">
                            <SkillIcon skillId={skill.id} className="h-3.5 w-3.5" />
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-500">{lang === "ne" ? "रु" : "Rs"}</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="w-24"
                              value={d.rate_amount}
                              onChange={(e) => setDraft(id, { rate_amount: e.target.value })}
                              placeholder={t("rateAmountPlaceholder")}
                            />
                            <span className="text-sm text-slate-500">/</span>
                            <Input
                              className="min-w-0 flex-1"
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
              </CardBody>
            </Card>

            <div className="flex gap-2 border-t border-slate-200 pt-4 md:sticky md:bottom-4 md:z-10 md:rounded-xl md:border md:bg-white/95 md:p-3 md:shadow-lg md:backdrop-blur">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
              <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate()}>
                {t("save")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <Card className="md:h-full">
                <CardBody className="p-4 sm:p-5">
                  <Collapsible
                    title={
                      <span className="inline-flex items-center gap-2">
                        <SectionIcon icon={Info} />
                        {t("aboutYou")}
                      </span>
                    }
                    defaultOpen
                  >
                    {profile.about ? (
                      <p className="text-sm leading-relaxed text-slate-700 sm:leading-7">{profile.about}</p>
                    ) : (
                      <p className="text-sm italic text-slate-400">{t("noAboutYet")}</p>
                    )}
                    {(profile.age != null || profile.education) && (
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                        {profile.age != null && (
                          <div>
                            <p className="text-xs font-medium text-slate-500">{t("age")}</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-800">
                              {t("yearsOld", { count: formatNumber(profile.age, lang) })}
                            </p>
                          </div>
                        )}
                        {profile.education && (
                          <div>
                            <p className="text-xs font-medium text-slate-500">{t("highestEducation")}</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-800">{profile.education}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {myPhone.data?.alt_phone && (
                      <p className="mt-2.5 text-sm text-slate-500">
                        {t("altPhone")}: {myPhone.data.alt_phone}
                      </p>
                    )}
                  </Collapsible>
                </CardBody>
              </Card>

              <Card className="md:h-full">
                <CardBody className="p-4 sm:p-5">
                  <Collapsible
                    title={
                      <span className="inline-flex items-center gap-2">
                        <SectionIcon icon={Briefcase} />
                        {t("yourSkills")}
                        {skillList.length > 0 && (
                          <Badge tone="neutral">{formatNumber(skillList.length, lang)}</Badge>
                        )}
                      </span>
                    }
                    defaultOpen
                  >
                    {skillList.length === 0 ? (
                      <EmptyState
                        icon={<Briefcase className="h-7 w-7" />}
                        title={t("noSkillsYetProfile")}
                        hint={t("noSkillsYetProfileHint")}
                        action={
                          <Button size="sm" onClick={() => setEditing(true)}>
                            {t("addYourSkills")}
                          </Button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {skillList.map((s) => {
                          const label =
                            s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
                          const rate =
                            s.rate_amount != null
                              ? `${formatMoney(s.rate_amount, lang)}${s.rate_unit ? ` / ${s.rate_unit}` : ""}`
                              : null;
                          return (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition-colors duration-200 hover:bg-slate-50"
                            >
                              <SkillTile skillId={s.id} className="h-10 w-10 rounded-xl" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{label}</p>
                                {s.custom_note && (
                                  <p className="mt-0.5 truncate text-xs text-slate-500">{s.custom_note}</p>
                                )}
                              </div>
                              {rate && (
                                <p className="shrink-0 text-sm font-semibold text-slate-900">{rate}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Collapsible>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardBody className="p-4 sm:p-5">
                <Collapsible
                  title={
                    <span className="inline-flex items-center gap-2">
                      <SectionIcon icon={Navigation} />
                      {t("shareLocation")}
                    </span>
                  }
                >
                  <p className="mb-3 text-sm text-slate-500">{t("shareLocationHint")}</p>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {profile.location_consent === "granted"
                          ? profile.location_shared_at
                            ? t("locationShared", { time: relativeTime(profile.location_shared_at, lang) })
                            : t("locationSharedPending")
                          : t("locationNotShared")}
                      </p>
                    </div>
                    <Switch
                      checked={profile.location_consent === "granted"}
                      disabled={toggleLocationSharing.isPending}
                      onChange={(next) => toggleLocationSharing.mutate(next)}
                      aria-label={t("shareLocation")}
                    />
                  </div>
                </Collapsible>
              </CardBody>
            </Card>
          </>
        )}

        <Card tone="primary">
          <CardBody className="p-4 sm:p-5">
            <Collapsible
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={Calendar} />
                  {t("markCalendar")}
                  {busyDaysCount > 0 && (
                    <Badge tone="warning">{t("daysMarkedBusy", { count: formatNumber(busyDaysCount, lang) })}</Badge>
                  )}
                </span>
              }
            >
              <p className="mb-3 text-sm text-slate-500">{t("calendarHint")}</p>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <AvailabilityCalendar
                  days={availability.data ?? []}
                  editable
                  monthView
                  onToggle={(day, status) => changeDay.mutate({ day, status })}
                />
              </div>
            </Collapsible>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 sm:p-5">
            <Collapsible
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={Award} />
                  {t("certificates")}
                  {(myCertificates.data?.length ?? 0) > 0 && (
                    <Badge tone="neutral">{formatNumber(myCertificates.data!.length, lang)}</Badge>
                  )}
                </span>
              }
            >
              <p className="mb-3 text-sm text-slate-500">{t("certificatesHint")}</p>

              {(myCertificates.data?.length ?? 0) > 0 ? (
                <ul className="mb-4 space-y-2">
                  {(myCertificates.data ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm transition-colors duration-200 hover:bg-slate-100"
                    >
                      <Award className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <a
                          href={c.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-medium text-slate-800 hover:text-brand-700 hover:underline"
                        >
                          {c.title}
                        </a>
                        <p className="text-xs text-slate-500">{formatDate(c.created_at.slice(0, 10), lang)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteCert.mutate(c.id)}
                        aria-label={t("delete")}
                        className="shrink-0 p-1 text-slate-400 transition-colors duration-200 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
                  <Award className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
                  <p className="mt-2 text-sm font-medium text-slate-600">{t("noCertificatesYet")}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("noCertificatesYetHint")}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder={t("certificateTitlePlaceholder")}
                  maxLength={100}
                  className="flex-1"
                />
                <label
                  className={cn(
                    "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors duration-200 hover:bg-slate-50",
                    (!certTitle.trim() || addCert.isPending) && "pointer-events-none opacity-50",
                  )}
                >
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
            </Collapsible>
          </CardBody>
        </Card>

        <ContactPrivacyCard />

        <Card>
          <CardBody className="p-4 sm:p-5">
            <Collapsible
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon icon={SettingsIcon} />
                  {t("settings")}
                </span>
              }
            >
              <Link
                to="/friends"
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 transition-colors duration-200 hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" aria-hidden />
                  {t("myFriends")}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
              </Link>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("alertsOutsideApp")}
                </p>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{t("emailAlerts")}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t("emailAlertsHint")}</p>
                  </div>
                  <Switch
                    checked={alertPrefs.data?.email_enabled ?? true}
                    onChange={(next) => saveAlerts.mutate({ email_enabled: next })}
                    aria-label={t("emailAlerts")}
                  />
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{t("smsAlerts")}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t("smsAlertsHint")}</p>
                  </div>
                  <Switch
                    checked={alertPrefs.data?.sms_enabled ?? false}
                    onChange={(next) => saveAlerts.mutate({ sms_enabled: next })}
                    aria-label={t("smsAlerts")}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setSignOutConfirmOpen(true)}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {t("signOut")}
                </Button>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <Collapsible
                  title={<span className="text-sm font-semibold text-slate-700">{t("manageAccount")}</span>}
                >
                  <Link
                    to="/worker/$workerId"
                    params={{ workerId: profile.id }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 transition-colors duration-200 hover:bg-slate-100"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Eye className="h-4 w-4 text-slate-500" aria-hidden />
                      {t("viewPublicProfile")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                  </Link>

                  <div className="mt-2 rounded-xl bg-slate-50 px-3.5 py-3">
                    <p className="text-sm font-medium text-slate-800">{t("yourProfileLink")}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{profileUrl(profile.public_slug)}</p>
                    <p className="mt-1 text-xs text-slate-400">{t("shareProfileHint")}</p>
                    <div className="mt-2.5">
                      <Button size="sm" variant="outline" onClick={() => copy.mutate()}>
                        <LinkIcon className="h-4 w-4" aria-hidden />
                        {t("copyLink")}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirm("");
                        setDeletePassword("");
                        setDeleteOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-red-600 underline-offset-2 transition-colors duration-200 hover:underline"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("deleteAccount")}
                    </button>
                    <p className="mt-1 text-xs text-slate-400">{t("deleteAccountHint")}</p>
                  </div>
                </Collapsible>
              </div>
            </Collapsible>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3 px-4 py-5 text-center sm:px-6 sm:py-6">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("aboutTitle")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
                {t("profileStaticPagesHint")}
              </p>
            </div>
            <nav
              className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 pt-1"
              aria-label={t("staticPagesNav")}
            >
              {(
                [
                  { to: "/about" as const, labelKey: "navAbout" as const },
                  { to: "/mission" as const, labelKey: "navMission" as const },
                  { to: "/motivation" as const, labelKey: "navMotivation" as const },
                  { to: "/privacy" as const, labelKey: "navPrivacy" as const },
                ] as const
              ).map((page, index) => (
                <span key={page.to} className="inline-flex items-center">
                  {index > 0 && (
                    <span className="mx-2.5 text-slate-300 sm:mx-3" aria-hidden>
                      ·
                    </span>
                  )}
                  <Link
                    to={page.to}
                    className="rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-700 sm:text-[13px]"
                  >
                    {t(page.labelKey)}
                  </Link>
                </span>
              ))}
            </nav>
          </CardBody>
        </Card>
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

