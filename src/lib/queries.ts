import { supabase } from "./supabase";
import type {
  AppNotification,
  AvailabilityDay,
  Bid,
  CancellationReason,
  Certificate,
  ChatMessage,
  ConversationSummary,
  Engagement,
  EngagementStatus,
  EngagementWithParties,
  Friendship,
  Lang,
  MessageReaction,
  NotificationPrefs,
  Profile,
  RepliedMessage,
  ReportReason,
  Review,
  Skill,
  UserSkillDetail,
  WorkerCardData,
} from "./types";

const PROFILE_COLUMNS =
  "id,user_id,full_name,about,bio,age,education,avatar_url,cover_url,province,district,municipality,ward,locality,is_available,is_official,public_slug,language,rating,rating_count,lat,lng,location_shared_at,created_at,updated_at";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Looks a profile up by whatever is in the URL. Shared links carry the
 * opaque public_slug; older links and internal navigation carry the row
 * id, and both have to keep working.
 */
export async function getProfile(handle: string): Promise<Profile | null> {
  const column = UUID_RE.test(handle) ? "id" : "public_slug";
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq(column, handle)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export interface ProfileInput {
  full_name: string;
  about?: string | null;
  bio?: string | null;
  age?: number | null;
  education?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
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

const USER_BUCKETS = ["avatars", "covers", "certificates"] as const;

/**
 * Clears the person's uploads. Storage rows cannot be deleted with SQL
 * ("Direct deletion from storage tables is not allowed"), so this has to
 * go through the Storage API - which the existing per-folder policies
 * already permit for your own files.
 */
async function removeMyUploads(userId: string): Promise<void> {
  for (const bucket of USER_BUCKETS) {
    const { data } = await supabase.storage.from(bucket).list(userId);
    const paths = (data ?? []).map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
  }
}

/**
 * Deletes the signed-in account outright - profile, photos, messages,
 * work history, the lot. There is no undo, so the caller is expected to
 * have confirmed identity first.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  // Best-effort: a stray file left in a bucket must never be the reason
  // someone cannot close their account, so this failing is not fatal.
  try {
    await removeMyUploads(userId);
  } catch {
    // Ignored on purpose - the account deletion below is what matters.
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
}

/**
 * Confirms the person really is who they say before something
 * irreversible. Re-signing in is the only way to check a password with
 * the anon key; it just refreshes the session we are about to discard.
 */
export async function verifyPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
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
export interface Contact {
  phone: string;
  alt_phone: string | null;
}

export async function getContact(profileId: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("profile_contacts")
    .select("phone,alt_phone")
    .eq("profile_id", profileId)
    .maybeSingle();
  // RLS hides the row when the viewer is not allowed to see it - not an error.
  if (error) return null;
  return (data as Contact | null) ?? null;
}

export async function saveContact(
  profileId: string,
  phone: string,
  altPhone?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profile_contacts")
    .upsert({ profile_id: profileId, phone, alt_phone: altPhone?.trim() || null }, { onConflict: "profile_id" });
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

export const SEARCH_PAGE = 24;

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
  /** The employer's opening offer - becomes bid #1 in the negotiation (see trg_engagements_seed_bid). */
  payment_amount: number;
}): Promise<Engagement> {
  return unwrap(
    await supabase
      .from("work_engagements")
      .insert({ ...input, status: "pending" })
      .select("*")
      .single(),
  );
}

export const ENGAGEMENTS_PAGE = 15;

/** Was unbounded - every job anyone had ever had, on every visit. */
export async function listMyEngagements(
  myProfileId: string,
  role: "worker" | "employer",
  page = 0,
  pageSize = ENGAGEMENTS_PAGE,
): Promise<EngagementWithParties[]> {
  const column = role === "worker" ? "worker_profile_id" : "employer_profile_id";
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("work_engagements")
    .select(ENGAGEMENT_SELECT)
    .eq(column, myProfileId)
    .order("work_date", { ascending: false })
    .range(from, from + pageSize - 1);
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

/** Cancelling always requires a reason - enforced here and again in the DB. */
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

/** Pending requests waiting on me as the worker - drives the home screen badge. */
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
// Bidding - a back-and-forth price negotiation on a pending engagement.
// The employer's opening payment_amount becomes bid #1 automatically
// (see the seed_initial_bid trigger); everything after that is a client
// call to submitBid. Whoever did NOT make the latest bid can counter or
// accept it - accepting is just the existing setEngagementStatus("accepted").
// ---------------------------------------------------------------------
export async function listBids(engagementId: string): Promise<Bid[]> {
  return unwrap(
    await supabase
      .from("bids")
      .select("id,engagement_id,bidder_profile_id,amount,note,created_at")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: true }),
  );
}

/** Submit a counter-offer. The DB rejects this if it isn't your turn (see bids_insert_turn). */
export async function submitBid(
  engagementId: string,
  bidderProfileId: string,
  amount: number,
  note?: string | null,
): Promise<Bid> {
  return unwrap(
    await supabase
      .from("bids")
      .insert({ engagement_id: engagementId, bidder_profile_id: bidderProfileId, amount, note: note?.trim() || null })
      .select("id,engagement_id,bidder_profile_id,amount,note,created_at")
      .single(),
  );
}

// ---------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------
export const REVIEWS_PAGE = 20;

export async function listReviewsFor(
  profileId: string,
  page = 0,
  pageSize = REVIEWS_PAGE,
): Promise<Review[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id,engagement_id,reviewer_profile_id,reviewee_profile_id,rating,comment,created_at," +
        "reviewer:profiles!reviews_reviewer_profile_id_fkey(id,full_name,avatar_url)",
    )
    .eq("reviewee_profile_id", profileId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
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
// "message" notifications drive the Chats tab badge instead - they never
// show up in the Alerts list or count toward its badge.
export const NOTIFICATIONS_PAGE = 25;

export async function listNotifications(
  profileId: string,
  page = 0,
  pageSize = NOTIFICATIONS_PAGE,
): Promise<AppNotification[]> {
  const from = page * pageSize;
  return unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profileId)
      .neq("kind", "message")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1),
  );
}

export async function countUnread(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("is_read", false)
    .neq("kind", "message");
  if (error) return 0;
  return count ?? 0;
}

/** Unread count for the Chats tab badge - message notifications only. */
export async function countUnreadMessages(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("is_read", false)
    .eq("kind", "message");
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
    .eq("is_read", false)
    .neq("kind", "message");
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Email / SMS delivery preferences
// ---------------------------------------------------------------------
/** No row yet means "never touched the toggles" - email on, SMS off. */
export async function getNotificationPrefs(profileId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("email_enabled,sms_enabled")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as NotificationPrefs | null) ?? { email_enabled: true, sms_enabled: false };
}

export async function saveNotificationPrefs(
  profileId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ profile_id: profileId, ...prefs }, { onConflict: "profile_id" });
  if (error) throw error;
}

/** Opening a chat thread clears the badge contribution from that sender. */
export async function markMessageNotificationsRead(
  myProfileId: string,
  otherProfileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", myProfileId)
    .eq("kind", "message")
    .eq("related_profile_id", otherProfileId)
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

/** Cancels a pending request or unfriends an accepted one - same operation either way. */
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
// Presence - "has the app open right now", separate from is_available
// ("open to accept new work"). Shown as a small dot on the avatar.
// ---------------------------------------------------------------------
const ONLINE_WINDOW_MS = 3 * 60_000;

export async function touchPresence(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("presence")
    .upsert({ profile_id: profileId, last_seen_at: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw error;
}

/** Batched online check for a set of profiles - a card grid does one query, not N. */
export async function getOnlineMap(profileIds: string[]): Promise<Record<string, boolean>> {
  const ids = [...new Set(profileIds)].filter(Boolean);
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("presence").select("profile_id,last_seen_at").in("profile_id", ids);
  if (error) return {};
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const out: Record<string, boolean> = {};
  for (const row of (data ?? []) as { profile_id: string; last_seen_at: string }[]) {
    out[row.profile_id] = new Date(row.last_seen_at).getTime() >= cutoff;
  }
  return out;
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

/** Cover photo shown behind the avatar - workers use it to show a work-site photo. */
export async function uploadCover(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/cover-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("covers").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------
// Certificates (optional proof of training, shown on the profile)
// ---------------------------------------------------------------------
export async function listCertificates(profileId: string): Promise<Certificate[]> {
  return unwrap(
    await supabase
      .from("certificates")
      .select("id,profile_id,title,file_url,file_type,created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
  );
}

export async function addCertificate(
  userId: string,
  profileId: string,
  title: string,
  file: File,
): Promise<Certificate> {
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${userId}/cert-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: pub } = supabase.storage.from("certificates").getPublicUrl(path);
  return unwrap(
    await supabase
      .from("certificates")
      .insert({ profile_id: profileId, title: title.trim(), file_url: pub.publicUrl, file_type: file.type })
      .select("id,profile_id,title,file_url,file_type,created_at")
      .single(),
  );
}

export async function removeCertificate(id: string): Promise<void> {
  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Chat (simple direct messages, gated the same as phone contacts)
// ---------------------------------------------------------------------
/** messages.profile_a/profile_b are always stored with a < b. */
export function chatPairKey(profileIdA: string, profileIdB: string): string {
  return profileIdA < profileIdB ? `${profileIdA}:${profileIdB}` : `${profileIdB}:${profileIdA}`;
}

// No `reply_to:messages!reply_to_id(...)` embed here on purpose. That is a
// self-join, and a column hint does not pin its direction - PostgREST can
// resolve it the other way round, hanging the quote off the message that
// was replied TO instead of off the reply itself. The quoted message is
// almost always already in this same thread fetch, so it is cheaper and
// completely unambiguous to stitch the two together below.
const MESSAGE_COLUMNS =
  "id,profile_a,profile_b,sender_profile_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id," +
  "message_reactions(profile_id,emoji)";

function shapeMessage(row: unknown): ChatMessage {
  const m = row as ChatMessage;
  return { ...m, reply_to: null, message_reactions: m.message_reactions ?? [] };
}

/** Hang each reply's quoted message off it, by id, within the thread. */
export function attachReplies(items: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, RepliedMessage>(
    items.map((m) => [
      m.id,
      { id: m.id, body: m.body, sender_profile_id: m.sender_profile_id, deleted_at: m.deleted_at },
    ]),
  );
  return items.map((m) =>
    // A quote older than the fetch window stays null and simply isn't drawn.
    m.reply_to_id ? { ...m, reply_to: byId.get(m.reply_to_id) ?? null } : m,
  );
}

export const MESSAGES_PAGE = 40;

/**
 * The most recent `limit` messages, oldest-first for rendering.
 *
 * This used to order ascending and take 200, which returns the *oldest*
 * 200 - so a thread past that length would open on its first ever
 * messages and never show anything recent. It now takes the newest
 * window and reverses it, and "load older" simply asks for a bigger one.
 */
export async function listMessages(
  myProfileId: string,
  otherProfileId: string,
  limit = MESSAGES_PAGE,
): Promise<ChatMessage[]> {
  const [profile_a, profile_b] =
    myProfileId < otherProfileId ? [myProfileId, otherProfileId] : [otherProfileId, myProfileId];
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("profile_a", profile_a)
    .eq("profile_b", profile_b)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachReplies((data ?? []).reverse().map(shapeMessage));
}

/** Opening a thread marks the other person's messages as seen. */
export async function markThreadRead(myProfileId: string, otherProfileId: string): Promise<void> {
  const [profile_a, profile_b] =
    myProfileId < otherProfileId ? [myProfileId, otherProfileId] : [otherProfileId, myProfileId];
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_a", profile_a)
    .eq("profile_b", profile_b)
    .neq("sender_profile_id", myProfileId)
    .is("read_at", null);
  if (error) throw error;
}

/** Unsend - wipes the body server-side too, not just what the UI shows. */
export async function unsendMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

/** One reaction per person per message - setting a new emoji replaces theirs. */
export async function setReaction(messageId: string, profileId: string, emoji: string): Promise<void> {
  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, profile_id: profileId, emoji }, { onConflict: "message_id,profile_id" });
  if (error) throw error;
}

export async function removeReaction(messageId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("profile_id", profileId);
  if (error) throw error;
}

export async function sendMessage(
  myProfileId: string,
  otherProfileId: string,
  body: string,
  replyToId?: string | null,
): Promise<ChatMessage> {
  const [profile_a, profile_b] =
    myProfileId < otherProfileId ? [myProfileId, otherProfileId] : [otherProfileId, myProfileId];
  return shapeMessage(
    unwrap(
      await supabase
        .from("messages")
        .insert({
          profile_a,
          profile_b,
          sender_profile_id: myProfileId,
          body,
          reply_to_id: replyToId ?? null,
        })
        .select(MESSAGE_COLUMNS)
        .single(),
    ),
  );
}

/**
 * Edit your own message. The database enforces the real rules - sender
 * only, within 15 minutes, never after an unsend - and stamps edited_at.
 */
export async function editMessage(messageId: string, body: string): Promise<void> {
  const { error } = await supabase.from("messages").update({ body }).eq("id", messageId);
  if (error) throw error;
}

/** How long after sending a message can still be edited - mirrors the trigger. */
export const EDIT_WINDOW_MS = 15 * 60_000;

export function withinEditWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

interface ConversationRow {
  profile_a: string;
  profile_b: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
  message_reactions: MessageReaction[] | null;
  a: ConversationParty | ConversationParty[] | null;
  b: ConversationParty | ConversationParty[] | null;
}

interface ConversationParty {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_official: boolean;
}

/** All of "my" chats, one row per conversation, newest message first. */
export async function listConversations(myProfileId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "profile_a,profile_b,sender_profile_id,body,created_at,read_at,deleted_at," +
        "message_reactions(profile_id,emoji)," +
        "a:profiles!messages_profile_a_fkey(id,full_name,avatar_url,is_official)," +
        "b:profiles!messages_profile_b_fkey(id,full_name,avatar_url,is_official)",
    )
    .or(`profile_a.eq.${myProfileId},profile_b.eq.${myProfileId}`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  const seen = new Set<string>();
  const out: ConversationSummary[] = [];
  for (const row of (data ?? []) as unknown as ConversationRow[]) {
    const iAmA = row.profile_a === myProfileId;
    const other = one(iAmA ? row.b : row.a);
    const otherProfileId = iAmA ? row.profile_b : row.profile_a;
    if (!other || seen.has(otherProfileId)) continue;
    seen.add(otherProfileId);
    out.push({
      otherProfileId,
      otherName: other.full_name,
      otherAvatarUrl: other.avatar_url,
      otherIsOfficial: Boolean(other.is_official),
      lastBody: row.body,
      lastCreatedAt: row.created_at,
      lastSenderProfileId: row.sender_profile_id,
      unread: row.sender_profile_id !== myProfileId && !row.read_at,
      lastReadAt: row.read_at,
      lastDeleted: Boolean(row.deleted_at),
      lastReaction: row.message_reactions?.[0]?.emoji ?? null,
    });
  }
  return out;
}
