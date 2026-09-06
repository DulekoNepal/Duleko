import { supabase } from "./supabase";
import type {
  AppNotification,
  AvailabilityDay,
  CancellationReason,
  ChatMessage,
  Engagement,
  EngagementStatus,
  EngagementWithParties,
  Friendship,
  Lang,
  Profile,
  ReportReason,
  Review,
  Skill,
  UserSkillDetail,
  WorkerCardData,
} from "./types";

const PROFILE_COLUMNS =
  "id,user_id,full_name,about,avatar_url,province,district,municipality,ward,locality,is_available,language,rating,rating_count,lat,lng,location_shared_at,created_at,updated_at";

const PARTY_COLUMNS = "id,full_name,avatar_url,rating,rating_count";

function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/** Supabase embeds can come back as an object or a one-element array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// ---------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export interface ProfileInput {
  full_name: string;
  about?: string | null;
  avatar_url?: string | null;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  ward?: number | null;
  locality?: string | null;
  is_available?: boolean;
  language?: Lang;
}

export async function createProfile(userId: string, input: ProfileInput): Promise<Profile> {
  return unwrap(
    await supabase
      .from("profiles")
      .insert({ user_id: userId, ...input })
      .select(PROFILE_COLUMNS)
      .single(),
  );
}

export async function updateProfile(profileId: string, input: Partial<ProfileInput>): Promise<Profile> {
  return unwrap(
    await supabase
      .from("profiles")
      .update(input)
      .eq("id", profileId)
      .select(PROFILE_COLUMNS)
      .single(),
  );
}

// ---------------------------------------------------------------------
// Phone (private)
// ---------------------------------------------------------------------
export async function getContact(profileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profile_contacts")
    .select("phone")
    .eq("profile_id", profileId)
    .maybeSingle();
  // RLS hides the row when the viewer is not allowed to see it — not an error.
  if (error) return null;
  return (data as { phone: string } | null)?.phone ?? null;
}

export async function saveContact(profileId: string, phone: string): Promise<void> {
  const { error } = await supabase
    .from("profile_contacts")
    .upsert({ profile_id: profileId, phone }, { onConflict: "profile_id" });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------
export async function listSkills(): Promise<Skill[]> {
  return unwrap(
    await supabase.from("skills").select("id,name_en,name_ne,emoji,sort_order").order("sort_order"),
  );
}

interface RawUserSkillRow {
  skill: Skill | Skill[];
  custom_label: string | null;
  custom_note: string | null;
  rate_amount: number | null;
  rate_unit: string | null;
}

export async function getUserSkills(profileId: string): Promise<UserSkillDetail[]> {
  const { data, error } = await supabase
    .from("user_skills")
    .select("skill:skills(id,name_en,name_ne,emoji,sort_order),custom_label,custom_note,rate_amount,rate_unit")
    .eq("profile_id", profileId);
  if (error) throw error;
  return ((data ?? []) as unknown as RawUserSkillRow[])
    .map((row) => {
      const skill = one(row.skill);
      if (!skill) return null;
      return {
        ...skill,
        custom_label: row.custom_label,
        custom_note: row.custom_note,
        rate_amount: row.rate_amount,
        rate_unit: row.rate_unit,
      };
    })
    .filter((s): s is UserSkillDetail => Boolean(s))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export interface UserSkillInput {
  skill_id: string;
  custom_label?: string | null;
  custom_note?: string | null;
  rate_amount?: number | null;
  rate_unit?: string | null;
}

export async function setUserSkills(profileId: string, skills: UserSkillInput[]): Promise<void> {
  const { error: delError } = await supabase.from("user_skills").delete().eq("profile_id", profileId);
  if (delError) throw delError;
  if (skills.length === 0) return;
  const { error } = await supabase
    .from("user_skills")
    .insert(skills.map((s) => ({ profile_id: profileId, ...s })));
  if (error) throw error;
}

export async function skillCounts(district?: string | null): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("skill_counts", { p_district: district ?? null });
  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { skill_id: string; worker_count: number }[]) {
    out[row.skill_id] = Number(row.worker_count);
  }
  return out;
}

// ---------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------
export interface SearchParams {
  skill?: string | null;
  query?: string | null;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  day?: string | null;
  availableOnly?: boolean;
  sort?: "relevance" | "rating" | "newest" | "nearest";
  limit?: number;
  offset?: number;
  lat?: number | null;
  lng?: number | null;
}

export async function searchWorkers(params: SearchParams): Promise<WorkerCardData[]> {
  const { data, error } = await supabase.rpc("search_workers", {
    p_skill: params.skill ?? null,
    p_query: params.query?.trim() ? params.query.trim() : null,
    p_province: params.province ?? null,
    p_district: params.district ?? null,
    p_municipality: params.municipality ?? null,
    p_day: params.day ?? null,
    p_available_only: params.availableOnly ?? false,
    p_sort: params.sort ?? "relevance",
    p_limit: params.limit ?? 30,
    p_offset: params.offset ?? 0,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
  });
  if (error) throw error;
  return (data ?? []) as WorkerCardData[];
}

// ---------------------------------------------------------------------
// Live location (optional, one-tap snapshot)
// ---------------------------------------------------------------------
export async function shareLocation(profileId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ lat, lng, location_shared_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw error;
}

export async function clearLocation(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ lat: null, lng: null, location_shared_at: null })
    .eq("id", profileId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------
export async function getAvailability(
  profileId: string,
  fromDay: string,
  toDay: string,
): Promise<AvailabilityDay[]> {
  return unwrap(
    await supabase
      .from("availability")
      .select("id,profile_id,day,status,engagement_id")
      .eq("profile_id", profileId)
      .gte("day", fromDay)
      .lte("day", toDay)
      .order("day"),
  );
}

/** Toggling a day the user owns. Days booked by a confirmed job are not togglable. */
export async function setDayStatus(
  profileId: string,
  day: string,
  status: "available" | "booked",
): Promise<void> {
  if (status === "available") {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("profile_id", profileId)
      .eq("day", day)
      .is("engagement_id", null);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("availability")
    .upsert({ profile_id: profileId, day, status: "booked" }, { onConflict: "profile_id,day" });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Engagements
// ---------------------------------------------------------------------
const ENGAGEMENT_SELECT = `
  id,employer_profile_id,worker_profile_id,skill_id,title,details,work_date,location_text,
  payment_amount,payment_note,status,cancelled_by,completed_at,created_at,updated_at,
  employer:profiles!work_engagements_employer_profile_id_fkey(${PARTY_COLUMNS}),
  worker:profiles!work_engagements_worker_profile_id_fkey(${PARTY_COLUMNS}),
  skill:skills(id,name_en,name_ne,emoji),
  reviews(id,rating,comment,reviewer_profile_id)
`;

interface RawEngagement extends Engagement {
  employer: EngagementWithParties["employer"] | EngagementWithParties["employer"][];
  worker: EngagementWithParties["worker"] | EngagementWithParties["worker"][];
  skill: Skill | Skill[] | null;
  reviews: { id: string; rating: number; comment: string | null; reviewer_profile_id: string }[];
}

function shapeEngagement(row: RawEngagement, myProfileId: string): EngagementWithParties {
  const mine = (row.reviews ?? []).find((r) => r.reviewer_profile_id === myProfileId) ?? null;
  return {
    ...row,
    employer: one(row.employer)!,
    worker: one(row.worker)!,
    skill: one(row.skill),
    my_review: mine ? { id: mine.id, rating: mine.rating, comment: mine.comment } : null,
  };
}

export async function createEngagement(input: {
  employer_profile_id: string;
  worker_profile_id: string;
  skill_id: string | null;
  title: string;
  details?: string | null;
  work_date: string;
  location_text: string;
  payment_amount?: number | null;
}): Promise<Engagement> {
  return unwrap(
    await supabase
      .from("work_engagements")
      .insert({ ...input, status: "pending" })
      .select("*")
      .single(),
  );
}

export async function listMyEngagements(
  myProfileId: string,
  role: "worker" | "employer",
): Promise<EngagementWithParties[]> {
  const column = role === "worker" ? "worker_profile_id" : "employer_profile_id";
  const { data, error } = await supabase
    .from("work_engagements")
    .select(ENGAGEMENT_SELECT)
    .eq(column, myProfileId)
    .order("work_date", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawEngagement[]).map((row) => shapeEngagement(row, myProfileId));
}

export async function getEngagement(
  engagementId: string,
  myProfileId: string,
): Promise<EngagementWithParties | null> {
  const { data, error } = await supabase
    .from("work_engagements")
    .select(ENGAGEMENT_SELECT)
    .eq("id", engagementId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return shapeEngagement(data as unknown as RawEngagement, myProfileId);
}

export async function setEngagementStatus(
  engagementId: string,
  status: EngagementStatus,
  actorProfileId?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "cancelled" && actorProfileId) patch.cancelled_by = actorProfileId;
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from("work_engagements").update(patch).eq("id", engagementId);
  if (error) throw error;
}

/** Cancelling always requires a reason — enforced here and again in the DB. */
export async function cancelEngagement(
  engagementId: string,
  actorProfileId: string,
  reason: CancellationReason,
  note?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("work_engagements")
    .update({
      status: "cancelled",
      cancelled_by: actorProfileId,
      cancellation_reason: reason,
      cancellation_note: note?.trim() || null,
    })
    .eq("id", engagementId);
  if (error) throw error;
}

/** Pending requests waiting on me as the worker — drives the home screen badge. */
export async function countPendingForMe(myProfileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("work_engagements")
    .select("id", { count: "exact", head: true })
    .eq("worker_profile_id", myProfileId)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------
export async function listReviewsFor(profileId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id,engagement_id,reviewer_profile_id,reviewee_profile_id,rating,comment,created_at," +
        "reviewer:profiles!reviews_reviewer_profile_id_fkey(id,full_name,avatar_url)",
    )
    .eq("reviewee_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as (Review & { reviewer: Review["reviewer"] | Review["reviewer"][] })[]).map(
    (r) => ({ ...r, reviewer: one(r.reviewer) ?? undefined }),
  );
}

export async function submitReview(input: {
  engagement_id: string;
  reviewer_profile_id: string;
  reviewee_profile_id: string;
  rating: number;
  comment?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("reviews").insert(input);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
export async function listNotifications(profileId: string): Promise<AppNotification[]> {
  return unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(60),
  );
}

export async function countUnread(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------
const FRIENDSHIP_SELECT = `
  id,requester_profile_id,addressee_profile_id,status,created_at,
  requester:profiles!friendships_requester_profile_id_fkey(${PARTY_COLUMNS}),
  addressee:profiles!friendships_addressee_profile_id_fkey(${PARTY_COLUMNS})
`;

interface RawFriendship {
  id: string;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: Friendship["status"];
  created_at: string;
  requester: Friendship["other"] | Friendship["other"][];
  addressee: Friendship["other"] | Friendship["other"][];
}

function shapeFriendship(row: RawFriendship, myProfileId: string): Friendship {
  const requester = one(row.requester)!;
  const addressee = one(row.addressee)!;
  return {
    id: row.id,
    requester_profile_id: row.requester_profile_id,
    addressee_profile_id: row.addressee_profile_id,
    status: row.status,
    created_at: row.created_at,
    other: row.requester_profile_id === myProfileId ? addressee : requester,
  };
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_profile_id: requesterId, addressee_profile_id: addresseeId });
  if (error) throw error;
}

export async function respondFriendRequest(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", id);
  if (error) throw error;
}

/** Cancels a pending request or unfriends an accepted one — same operation either way. */
export async function removeFriendship(id: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

export async function listFriends(myProfileId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .eq("status", "accepted")
    .or(`requester_profile_id.eq.${myProfileId},addressee_profile_id.eq.${myProfileId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawFriendship[]).map((row) => shapeFriendship(row, myProfileId));
}

export async function listIncomingRequests(myProfileId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .eq("status", "pending")
    .eq("addressee_profile_id", myProfileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawFriendship[]).map((row) => shapeFriendship(row, myProfileId));
}

export async function getFriendshipWith(
  myProfileId: string,
  otherProfileId: string,
): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .or(
      `and(requester_profile_id.eq.${myProfileId},addressee_profile_id.eq.${otherProfileId}),` +
        `and(requester_profile_id.eq.${otherProfileId},addressee_profile_id.eq.${myProfileId})`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return shapeFriendship(data as unknown as RawFriendship, myProfileId);
}

// ---------------------------------------------------------------------
// Safety: reporting
// ---------------------------------------------------------------------
export async function reportUser(input: {
  reporter_profile_id: string;
  reported_profile_id: string;
  reason: ReportReason;
  details?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("reports").insert(input);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------
// Chat (simple direct messages, gated the same as phone contacts)
// ---------------------------------------------------------------------
/** messages.profile_a/profile_b are always stored with a < b. */
export function chatPairKey(profileIdA: string, profileIdB: string): string {
  return profileIdA < profileIdB ? `${profileIdA}:${profileIdB}` : `${profileIdB}:${profileIdA}`;
}

export async function listMessages(myProfileId: string, otherProfileId: string): Promise<ChatMessage[]> {
  const [profile_a, profile_b] =
    myProfileId < otherProfileId ? [myProfileId, otherProfileId] : [otherProfileId, myProfileId];
  const { data, error } = await supabase
    .from("messages")
    .select("id,profile_a,profile_b,sender_profile_id,body,created_at")
    .eq("profile_a", profile_a)
    .eq("profile_b", profile_b)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data as ChatMessage[]) ?? [];
}

export async function sendMessage(
  myProfileId: string,
  otherProfileId: string,
  body: string,
): Promise<ChatMessage> {
  const [profile_a, profile_b] =
    myProfileId < otherProfileId ? [myProfileId, otherProfileId] : [otherProfileId, myProfileId];
  return unwrap(
    await supabase
      .from("messages")
      .insert({ profile_a, profile_b, sender_profile_id: myProfileId, body })
      .select("id,profile_a,profile_b,sender_profile_id,body,created_at")
      .single(),
  );
}
