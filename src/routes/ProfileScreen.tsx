import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, LogOut, ShieldOff } from "lucide-react";
import { AppHeader, LanguageToggle, PageContainer } from "@/components/duleko/Layout";
import { AvailabilityCalendar } from "@/components/duleko/AvailabilityCalendar";
import { RatingStars } from "@/components/duleko/Rating";
import { SkillPicker } from "@/components/duleko/SkillGrid";
import { LocationFields, type LocationValue } from "@/components/duleko/LocationFields";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FullPageLoader } from "@/components/ui/states";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import {
  getAvailability,
  getContact,
  listBlocked,
  listSkills,
  saveContact,
  setDayStatus,
  setUserSkills,
  unblockUser,
  updateProfile,
  uploadAvatar,
  getUserSkills,
} from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { addDays, isValidNepaliPhone, normalisePhone, toDateKey, todayKey } from "@/lib/utils";

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { profile, user, refreshProfile, signOut } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [about, setAbout] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    province: null,
    district: null,
    municipality: null,
    ward: null,
    locality: null,
  });
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
  const availability = useQuery({
    queryKey: ["availability", profile?.id],
    queryFn: () => getAvailability(profile!.id, todayKey(), toDateKey(addDays(new Date(), 35))),
    enabled: Boolean(profile?.id),
  });
  const blocked = useQuery({
    queryKey: ["blocked-list", profile?.id],
    queryFn: () => listBlocked(profile!.id),
    enabled: Boolean(profile?.id),
  });

  // Seed the form once the profile and its related rows have loaded.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAbout(profile.about ?? "");
    setLocation({
      province: profile.province,
      district: profile.district,
      municipality: profile.municipality,
      ward: profile.ward,
      locality: profile.locality,
    });
  }, [profile]);

  useEffect(() => {
    if (mySkills.data) setSkillIds(mySkills.data.map((s) => s.id));
  }, [mySkills.data]);

  useEffect(() => {
    if (myPhone.data) setPhone(myPhone.data);
  }, [myPhone.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (phone && !isValidNepaliPhone(phone)) throw new Error(t("phoneInvalid"));
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        about: about.trim() || null,
        province: location.province,
        district: location.district,
        municipality: location.municipality,
        ward: location.ward,
        locality: location.locality,
        language: lang,
      });
      if (phone) await saveContact(profile.id, normalisePhone(phone));
      await setUserSkills(profile.id, skillIds);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["user-skills"] });
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      await refreshProfile();
      toast(t("profileSaved"));
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

  const removeBlock = useMutation({
    mutationFn: (otherId: string) => unblockUser(profile!.id, otherId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked-list"] }),
  });

  if (!profile) return <FullPageLoader label={t("loading")} />;

  return (
    <>
      <AppHeader title={t("myProfile")} right={<LanguageToggle />} />
      <PageContainer>
        <Card className="mb-4">
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar name={profile.full_name} src={avatarPreview ?? profile.avatar_url} size={64} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-slate-900">{profile.full_name}</h2>
                <RatingStars value={Number(profile.rating)} count={profile.rating_count} />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                <Camera className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("changePhoto")}</span>
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

            <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
              <span>
                <span className="block text-sm font-medium text-slate-800">{t("availableForWork")}</span>
                <span className="block text-xs text-slate-500">{t("availableForWorkHint")}</span>
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 shrink-0 rounded accent-teal-700"
                checked={profile.is_available}
                onChange={(e) => toggleAvailable.mutate(e.target.checked)}
              />
            </label>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>{t("editProfile")}</SectionTitle>
            <Field label={t("yourName")}>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
            </Field>
            <Field label={t("phoneNumber")} hint={t("phoneHint")}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </Field>
            <Field label={t("aboutYou")}>
              <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} maxLength={600} />
            </Field>
            <LocationFields value={location} onChange={setLocation} />

            <p className="mb-2 text-sm font-medium text-slate-700">{t("yourSkills")}</p>
            <SkillPicker
              skills={allSkills.data ?? []}
              selected={skillIds}
              onToggle={(id) =>
                setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
              }
            />

            <Button className="mt-5 w-full" loading={save.isPending} onClick={() => save.mutate()}>
              {t("save")}
            </Button>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>{t("markCalendar")}</SectionTitle>
            <p className="mb-3 text-sm text-slate-500">{t("calendarHint")}</p>
            <AvailabilityCalendar
              days={availability.data ?? []}
              editable
              onToggle={(day, status) => changeDay.mutate({ day, status })}
            />
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardBody>
            <SectionTitle>{t("settings")}</SectionTitle>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">{t("language")}</span>
              <div className="inline-flex gap-2">
                <Button
                  size="sm"
                  variant={lang === "en" ? "primary" : "outline"}
                  onClick={() => setLang("en")}
                >
                  {t("english")}
                </Button>
                <Button
                  size="sm"
                  variant={lang === "ne" ? "primary" : "outline"}
                  onClick={() => setLang("ne")}
                >
                  {t("nepali")}
                </Button>
              </div>
            </div>

            <p className="mb-2 text-sm font-medium text-slate-700">{t("blockedUsers")}</p>
            {(blocked.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">{t("noBlockedUsers")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(blocked.data ?? []).map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={b.full_name} src={b.avatar_url} size={32} />
                    <span className="flex-1 truncate text-sm text-slate-800">{b.full_name}</span>
                    <Button size="sm" variant="outline" onClick={() => removeBlock.mutate(b.id)}>
                      <ShieldOff className="h-4 w-4" aria-hidden />
                      {t("unblock")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button variant="outline" className="mt-5 w-full" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden />
              {t("signOut")}
            </Button>
          </CardBody>
        </Card>
      </PageContainer>
    </>
  );
}
