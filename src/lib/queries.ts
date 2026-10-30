import type { PriceUnit } from "./price-units";
import { supabase } from "./supabase";
import { IMAGE_MAX_SIDE, shrinkImage } from "./image";
import { addDays, toDateKey, todayKey } from "./utils";
import type {
  AppNotification,
  AvailabilityDay,
  Bid,
  CancellationReason,
  Certificate,
  CertificateRejection,
  ChatMessage,
  ConversationSummary,
  Engagement,
  EngagementStatus,
  EngagementWithParties,
  CallDealToConfirm,
  CallPermission,
  CallToAsk,
  FeeAccount,
  FeeCharge,
  FeeOverview,
  FeePayment,
  Friendship,
  JobOffer,
  JobPerson,
  JobPost,
  JobPostKind,
  KycDocType,
  KycQueueItem,
  KycRejectionCode,
  KycSubmission,
  Lang,
  MessageReaction,
  Notice,
  NotificationPrefs,
  PaymentMethod,
  PaymentMethodDraft,
  Profile,
  RepliedMessage,
  ReportReason,
  ReportStatus,
  ReportWithParties,
  Review,
  Skill,
  StaffRole,
  UserSkillDetail,
  WorkerCardData,
} from "./types";

const PROFILE_COLUMNS =
  "id,user_id,full_name,about,bio,age,education,avatar_url,cover_url,province,district,municipality,ward,locality,is_available,is_official,public_slug,member_no,language,rating,rating_count,location_shared_at,location_consent,call_permission,created_at,updated_at";

// Verification and role live in their own tables (see 3500_staff_roles_
// and_verification.sql), embedded here and flattened by mapProfileRow so
// the rest of the app can just read profile.is_verified/staff_role. Both
// tables have a second FK back to profiles (verified_by/granted_by), so
// the embed must name the profile_id constraint explicitly or PostgREST
// refuses the query as ambiguous.
const BADGE_COLUMNS =
  ",profile_verifications!profile_verifications_profile_id_fkey(verified_at)" +
  ",skill_verifications!skill_verifications_profile_id_fkey(skill_id)";

const PROFILE_COLUMNS_WITH_BADGES =
  PROFILE_COLUMNS + BADGE_COLUMNS + ",staff_roles!staff_roles_profile_id_fkey(role,title_en,title_ne)";

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

/**
 * Flattens the embedded profile_verifications/staff_roles rows onto a
 * plain Profile. Typed loosely on purpose: PROFILE_COLUMNS_WITH_BADGES is
 * built at runtime (not a string literal), so supabase-js cannot infer a
 * precise row shape for it - same reason the rest of this file leans on
 * `unwrap<T>`'s cast rather than the query builder's own inference.
 */
function mapProfileRow(row: unknown): Profile | null {
  if (!row) return null;
  const { profile_verifications, skill_verifications, staff_roles, ...rest } = row as Record<string, unknown> & {
    profile_verifications?: { verified_at: string } | { verified_at: string }[] | null;
    skill_verifications?: { skill_id: string }[] | null;
    staff_roles?: StaffRoleRow | StaffRoleRow[] | null;
  };
  const staff = one(staff_roles);
  return {
    ...(rest as Omit<Profile, "is_verified" | "verified_skill_ids" | "staff_role" | "staff_title_en" | "staff_title_ne">),
    is_verified: one(profile_verifications) != null,
    verified_skill_ids: [...new Set((skill_verifications ?? []).map((v) => v.skill_id))],
    staff_role: staff?.role ?? null,
    staff_title_en: staff?.title_en ?? null,
    staff_title_ne: staff?.title_ne ?? null,
  };
}

type StaffRoleRow = { role: StaffRole; title_en?: string | null; title_ne?: string | null };

// ---------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS_WITH_BADGES)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return mapProfileRow(data);
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
    .select(PROFILE_COLUMNS_WITH_BADGES)
    .eq(column, handle)
    .maybeSingle();
  if (error) throw error;
  return mapProfileRow(data);
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
  call_permission?: CallPermission;
}

export async function createProfile(userId: string, input: ProfileInput): Promise<Profile> {
  // A brand new profile has no verification/staff rows yet, but map it
  // through the same helper anyway so the shape always matches Profile.
  return mapProfileRow(
    unwrap(
      await supabase
        .from("profiles")
        .insert({ user_id: userId, ...input })
        .select(PROFILE_COLUMNS_WITH_BADGES)
        .single(),
    ),
  )!;
}

const USER_BUCKETS = ["avatars", "covers", "certificates", "payments", "kyc"] as const;

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
export async function verifyPassword(
  login: { email: string } | { phone: string },
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ ...login, password });
  if (error) throw error;
}

export async function updateProfile(profileId: string, input: Partial<ProfileInput>): Promise<Profile> {
  return mapProfileRow(
    unwrap(
      await supabase
        .from("profiles")
        .update(input)
        .eq("id", profileId)
        .select(PROFILE_COLUMNS_WITH_BADGES)
        .single(),
    ),
  )!;
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
    await supabase.from("skills").select("id,name_en,name_ne,emoji,sort_order,category").order("sort_order"),
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
    .select(
      "skill:skills(id,name_en,name_ne,emoji,sort_order,category),custom_label,custom_note,rate_amount,rate_unit",
    )
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
  /** Orders "nearest" for anyone without a distance: this district, then province (6500). */
  nearDistrict?: string | null;
  nearProvince?: string | null;
}

export const SEARCH_PAGE = 24;

/**
 * The middle of the ~1 km square a point is in - the same squares the
 * database shows people in (area_coord, 6100). Your own position goes out
 * this coarse, so the exact one never leaves the phone.
 */
export function areaCoord(v: number): number {
  return (Math.floor(v / 0.01) + 0.5) * 0.01;
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
    p_lat: params.lat == null ? null : areaCoord(params.lat),
    p_lng: params.lng == null ? null : areaCoord(params.lng),
    p_near_province: params.nearProvince ?? null,
    p_near_district: params.nearDistrict ?? null,
  });
  if (error) throw error;
  return (data ?? []) as WorkerCardData[];
}

// ---------------------------------------------------------------------
// Your work area - picked once on a map (6100), never tracked.
// ---------------------------------------------------------------------
export async function setLocationConsent(
  profileId: string,
  consent: "granted" | "declined",
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ location_consent: consent })
    .eq("id", profileId);
  if (error) throw error;
}

export async function setCallPermission(profileId: string, value: CallPermission): Promise<void> {
  const { error } = await supabase.from("profiles").update({ call_permission: value }).eq("id", profileId);
  if (error) throw error;
}

// The point lives in profile_locations, which only its owner can read
// (5900, 6100). Signed-in members see it through map_people/search_workers
// as its ~1 km square - or at the spot itself for a shop or workshop -
// and the other side of an accepted job through engagement_places.
export interface MyLocation {
  lat: number;
  lng: number;
  is_shop: boolean;
  shared_at: string;
}

export async function getMyLocation(profileId: string): Promise<MyLocation | null> {
  const { data, error } = await supabase
    .from("profile_locations")
    .select("lat,lng,is_shop,shared_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as MyLocation | null) ?? null;
}

/** Saves the work area picked on the map, and records the yes. */
export async function saveWorkArea(profileId: string, lat: number, lng: number, isShop: boolean): Promise<void> {
  const { error } = await supabase
    .from("profile_locations")
    .upsert(
      { profile_id: profileId, lat, lng, is_shop: isShop, shared_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) throw error;
  await setLocationConsent(profileId, "granted");
}

/** Takes the work area off Duleko entirely, and records the no. */
export async function removeWorkArea(profileId: string): Promise<void> {
  const { error } = await supabase.from("profile_locations").delete().eq("profile_id", profileId);
  if (error) throw error;
  await setLocationConsent(profileId, "declined");
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** A worker on the map: the middle of their ~1 km square, or a shop's own spot (`exact`). */
export interface MapPerson {
  id: string;
  full_name: string;
  avatar_url: string | null;
  rating: number;
  rating_count: number;
  is_available: boolean;
  is_verified: boolean;
  staff_role: StaffRole | null;
  skill_verified?: boolean;
  skills: Skill[];
  lat: number;
  lng: number;
  /** A shop or workshop, shown where it really is. */
  exact: boolean;
}

/** Signed-in members only (map_people refuses guests). */
export async function mapPeople(bounds: MapBounds, skill?: string | null): Promise<MapPerson[]> {
  const { data, error } = await supabase.rpc("map_people", {
    p_south: bounds.south,
    p_west: bounds.west,
    p_north: bounds.north,
    p_east: bounds.east,
    p_skill: skill ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as MapPerson[]).map((p) => ({ ...p, rating: Number(p.rating) }));
}

/** What a guest sees instead of people: how many are in each ~5 km square. */
export interface MapAreaCount {
  lat: number;
  lng: number;
  people: number;
  district: string | null;
  municipality: string | null;
}

export async function mapAreaCounts(bounds: MapBounds, skill?: string | null): Promise<MapAreaCount[]> {
  const { data, error } = await supabase.rpc("map_area_counts", {
    p_south: bounds.south,
    p_west: bounds.west,
    p_north: bounds.north,
    p_east: bounds.east,
    p_skill: skill ?? null,
  });
  if (error) throw error;
  return (data ?? []) as MapAreaCount[];
}

/**
 * Exact places inside a job, for the two people in it (engagement_places,
 * 6100): the job post's own pin while the request is live, and the other
 * person's saved place once it's accepted, until it's done.
 */
export interface EngagementPlace {
  kind: "job" | "person";
  lat: number;
  lng: number;
  is_shop: boolean;
}

export async function engagementPlaces(engagementId: string): Promise<EngagementPlace[]> {
  const { data, error } = await supabase.rpc("engagement_places", { p_engagement_id: engagementId });
  if (error) throw error;
  return (data ?? []) as EngagementPlace[];
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
  payment_amount,payment_note,status,cancelled_by,completed_at,done_reported_at,created_at,updated_at,
  employer:profiles!work_engagements_employer_profile_id_fkey(${PARTY_COLUMNS}),
  worker:profiles!work_engagements_worker_profile_id_fkey(${PARTY_COLUMNS}),
  skill:skills(id,name_en,name_ne,emoji,category),
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

/** How long a finished job stays on Work's Active list asking for a review. */
export const REVIEW_WINDOW_DAYS = 14;

/**
 * Everything still moving on one side of Work - waiting, accepted,
 * confirmed - plus jobs finished in the last two weeks, so one you haven't
 * reviewed yet can ask for it. Soonest day first. Each row carries who
 * made the latest price offer, which is what says whose turn it is.
 */
export async function listActiveEngagements(
  myProfileId: string,
  role: "worker" | "employer",
): Promise<EngagementWithParties[]> {
  const column = role === "worker" ? "worker_profile_id" : "employer_profile_id";
  const since = toDateKey(addDays(new Date(), -REVIEW_WINDOW_DAYS));
  const { data, error } = await supabase
    .from("work_engagements")
    .select(`${ENGAGEMENT_SELECT},bids(bidder_profile_id,created_at)`)
    .eq(column, myProfileId)
    .or(`status.in.(pending,accepted,confirmed),completed_at.gte.${since}`)
    .order("work_date", { ascending: true })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as unknown as (RawEngagement & { bids?: { bidder_profile_id: string; created_at: string }[] })[]).map(
    ({ bids, ...row }) => {
      const last = (bids ?? []).reduce<{ bidder_profile_id: string; created_at: string } | null>(
        (latest, b) => (!latest || b.created_at > latest.created_at ? b : latest),
        null,
      );
      return {
        ...shapeEngagement(row, myProfileId),
        last_bidder_id: last?.bidder_profile_id ?? null,
        bid_count: bids?.length ?? 0,
      };
    },
  );
}

/** Work's History: finished jobs on one side - done, declined, cancelled - latest day first. */
export async function listFinishedEngagements(
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
    .in("status", ["completed", "declined", "cancelled"])
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

/**
 * The worker says the job is done (7700). It stays confirmed until the
 * hirer agrees - or three days pass - so this only stamps the report.
 */
export async function reportJobDone(engagementId: string): Promise<void> {
  const { error } = await supabase
    .from("work_engagements")
    .update({ done_reported_at: new Date().toISOString() })
    .eq("id", engagementId);
  if (error) throw error;
}

/** The hirer's answer to that report: done closes the job, "not yet" clears the report. */
export async function answerJobDone(engagementId: string, done: boolean): Promise<void> {
  if (done) return setEngagementStatus(engagementId, "completed");
  const { error } = await supabase
    .from("work_engagements")
    .update({ done_reported_at: null })
    .eq("id", engagementId)
    .eq("status", "confirmed");
  if (error) throw error;
}

/** Jobs where the worker says the work is done and I, the hirer, haven't answered - the pop-up's queue. */
export async function listJobsToCheckDone(myProfileId: string): Promise<EngagementWithParties[]> {
  const { data, error } = await supabase
    .from("work_engagements")
    .select(ENGAGEMENT_SELECT)
    .eq("employer_profile_id", myProfileId)
    .eq("status", "confirmed")
    .not("done_reported_at", "is", null)
    .order("done_reported_at", { ascending: true })
    .limit(10);
  if (error) throw error;
  return ((data ?? []) as unknown as RawEngagement[]).map((row) => shapeEngagement(row, myProfileId));
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
// Work agreed over a phone call (6800)
// ---------------------------------------------------------------------

/** A tap on someone's Call button. Returns the call's id. */
export async function logCall(targetProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc("log_call", { p_target: targetProfileId });
  if (error) throw error;
  return data as string;
}

/** My newest call, if it's waiting for "did you have a deal?". */
export async function getCallToAsk(): Promise<CallToAsk | null> {
  const { data, error } = await supabase.rpc("call_to_ask_about");
  if (error) throw error;
  return ((data ?? []) as CallToAsk[])[0] ?? null;
}

export type CallOutcome = "deal" | "discussing" | "no" | "short";

/** The answer about a call; for a deal, its details. Returns the deal's id. */
export async function answerCall(
  callId: string,
  outcome: CallOutcome,
  deal?: { skill: string | null; amount: number | null; rating: number | null; comment: string | null },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("answer_call", {
    p_call: callId,
    p_outcome: outcome,
    p_skill: deal?.skill ?? null,
    p_amount: deal?.amount ?? null,
    p_rating: deal?.rating ?? null,
    p_comment: deal?.comment?.trim() || null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Deals people reported after calling me, waiting on my answer. */
export async function listCallDealsToConfirm(): Promise<CallDealToConfirm[]> {
  const { data, error } = await supabase.rpc("my_call_deals_to_confirm");
  if (error) throw error;
  return ((data ?? []) as CallDealToConfirm[]).map((d) => ({
    ...d,
    amount: d.amount == null ? null : Number(d.amount),
  }));
}

/** Duleko's activity numbers (6900). */
export interface ActivityNumbers {
  calls: number;
  accepted: number;
  completed: number;
  reviews: number;
  repeat: number;
  active: number;
  deals_npr: number;
  /** Members with the verified badge (7800). Staff only - never on the website. */
  verified?: number;
}

export interface ActivityStats {
  all_time: ActivityNumbers;
  last_30_days: ActivityNumbers;
  public_visible: boolean;
  disputed_deals: number;
  waiting_deals: number;
}

/** Staff: the exact numbers. */
export async function getActivityStats(): Promise<ActivityStats> {
  const { data, error } = await supabase.rpc("activity_stats");
  if (error) throw error;
  return data as ActivityStats;
}

/** Anyone: the rounded numbers, or null while staff keep them off the website. */
export async function getPublicActivityStats(): Promise<ActivityNumbers | null> {
  const { data, error } = await supabase.rpc("public_activity_stats");
  if (error) throw error;
  return (data as ActivityNumbers | null) ?? null;
}

/** Admins: show or hide the numbers on the website. */
export async function setPublicStats(visible: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_public_stats", { p_visible: visible });
  if (error) throw error;
}

export interface StaffCallDeal {
  deal_id: string;
  status: "reported" | "confirmed" | "disputed" | "removed";
  amount: number | null;
  deal_date: string;
  created_at: string;
  skill_id: string | null;
  hirer_id: string;
  hirer_name: string;
  worker_id: string;
  worker_name: string;
}

/** Staff: the latest deals agreed over a call. */
export async function listRecentCallDeals(): Promise<StaffCallDeal[]> {
  const { data, error } = await supabase.rpc("recent_call_deals", { p_limit: 30 });
  if (error) throw error;
  return ((data ?? []) as StaffCallDeal[]).map((d) => ({ ...d, amount: d.amount == null ? null : Number(d.amount) }));
}

/** Staff: take a made-up deal out of every count, with its review. */
export async function removeCallDeal(dealId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_call_deal", { p_deal: dealId });
  if (error) throw error;
}

/** Which call deals the Call deals screen lists (8400). */
export type CallDealView = "disputed" | "waiting" | "settled" | "all";

/** A call deal on the Call deals screen, with both people and how it ended. */
export interface StaffCallDealRow extends StaffCallDeal {
  hirer_photo: string | null;
  worker_photo: string | null;
  rating: number | null;
  comment: string | null;
  confirm_by: string;
  worker_answered_at: string | null;
  settlement: "counted" | "no_deal" | null;
  settled_at: string | null;
  /** Who settled or removed it. */
  settled_by_name: string | null;
  settle_note: string | null;
}

export const CALL_DEALS_PAGE = 20;

/**
 * Staff: one page of call deals for a view - disputes to settle, ones
 * waiting on the worker, settled, or all - and how many there are in all.
 * `since` keeps deals reported from then on (null = all time).
 */
export async function listStaffCallDeals(
  view: CallDealView,
  since: string | null,
  page: number,
): Promise<{ rows: StaffCallDealRow[]; total: number }> {
  const { data, error } = await supabase.rpc("staff_call_deals", {
    p_view: view,
    p_since: since,
    p_limit: CALL_DEALS_PAGE,
    p_offset: page * CALL_DEALS_PAGE,
  });
  if (error) throw error;
  const rows = ((data ?? []) as (StaffCallDealRow & { total: number })[]).map(({ total: _, ...d }) => ({
    ...d,
    amount: d.amount == null ? null : Number(d.amount),
  }));
  const total = Number((data as { total?: number }[] | null)?.[0]?.total ?? 0);
  return { rows, total };
}

/** Staff: settle a disputed deal - count it after all, or confirm there was no deal. Both people are told. */
export async function settleCallDeal(dealId: string, count: boolean, note?: string): Promise<void> {
  const { error } = await supabase.rpc("settle_call_deal", { p_deal: dealId, p_count: count, p_note: note?.trim() || null });
  if (error) throw error;
}

/** A person on the staff activity pages (7500) - no phone number. */
export interface ActivityPerson {
  id: string;
  name: string;
  photo: string | null;
  member_no: string | null;
}

/** One row behind an activity number (7500). */
export interface ActivityRow {
  type: "call" | "request" | "deal" | "review" | "person";
  id: string;
  at: string;
  from: ActivityPerson | null;
  to?: ActivityPerson | null;
  skill_id?: string | null;
  amount?: number | null;
  status?: string | null;
  title?: string | null;
  rating?: number | null;
  comment?: string | null;
  times?: number | null;
}

/** Staff: the records behind one activity number, newest first (at most 300). */
export async function listActivity(kind: keyof ActivityNumbers, since: string | null): Promise<ActivityRow[]> {
  const { data, error } = await supabase.rpc("activity_list", { p_kind: kind, p_since: since });
  if (error) throw error;
  return ((data ?? []) as ActivityRow[]).map((r) => ({ ...r, amount: r.amount == null ? null : Number(r.amount) }));
}

export type ActivityItemType = "call" | "request" | "deal" | "review";

/** One call, work request, call deal or review, in full (7500). */
export interface ActivityItem {
  type: ActivityItemType;
  id: string;
  created_at: string;
  updated_at?: string;
  from: ActivityPerson | null;
  to: ActivityPerson | null;
  // call
  outcome?: "deal" | "discussing" | "no" | "short" | null;
  answered_at?: string | null;
  ask_again_at?: string | null;
  // request / deal
  skill_id?: string | null;
  amount?: number | null;
  status?: string;
  // request
  title?: string;
  details?: string | null;
  work_date?: string;
  location_text?: string;
  payment_note?: string | null;
  completed_at?: string | null;
  cancelled_by?: ActivityPerson | null;
  reviews?: { id: string; at: string; rating: number; comment: string | null; from: ActivityPerson | null }[];
  // deal
  deal_date?: string;
  confirm_by?: string;
  worker_answered_at?: string | null;
  removed_by?: ActivityPerson | null;
  /** How staff settled a dispute (8400). */
  settlement?: "counted" | "no_deal" | null;
  settled_at?: string | null;
  settled_by?: ActivityPerson | null;
  settle_note?: string | null;
  call_id?: string | null;
  review_id?: string | null;
  // review (and call -> deal)
  rating?: number | null;
  comment?: string | null;
  request_id?: string | null;
  deal_id?: string | null;
}

/** Staff: one activity record, or null when it no longer exists. */
export async function getActivityItem(type: ActivityItemType, id: string): Promise<ActivityItem | null> {
  const { data, error } = await supabase.rpc("activity_item", { p_type: type, p_id: id });
  if (error) throw error;
  const item = (data as ActivityItem | null) ?? null;
  return item && { ...item, amount: item.amount == null ? null : Number(item.amount) };
}

/** The worker's yes (it counts, and the rating posts) or no (it never counts). */
export async function respondCallDeal(dealId: string, agree: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_call_deal", { p_deal: dealId, p_agree: agree });
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

/**
 * Unread count for the Chats tab badge: conversations whose newest message
 * is theirs and unread - the same rule as the Chats list's bolding and its
 * Unread filter. Counted from the messages themselves, not from message
 * notifications, so a leftover notification (a thread you can no longer
 * see, one read on another device) can never keep the badge stuck at 1
 * with nothing to open.
 */
export async function countUnreadMessages(profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from("messages")
    .select("profile_a,profile_b,sender_profile_id,read_at,a:profiles!messages_profile_a_fkey(id),b:profiles!messages_profile_b_fkey(id)")
    .or(`profile_a.eq.${profileId},profile_b.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return 0;

  const seen = new Set<string>();
  let unread = 0;
  for (const row of (data ?? []) as unknown as Pick<
    ConversationRow,
    "profile_a" | "profile_b" | "sender_profile_id" | "read_at" | "a" | "b"
  >[]) {
    const iAmA = row.profile_a === profileId;
    const otherId = iAmA ? row.profile_b : row.profile_a;
    // Same skips as listConversations: only a thread's newest message
    // counts, and a thread whose other side is hidden isn't listed at all.
    if (seen.has(otherId) || !one(iAmA ? row.b : row.a)) continue;
    seen.add(otherId);
    if (row.sender_profile_id !== profileId && !row.read_at) unread++;
  }
  return unread;
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

/**
 * Clears message notifications for threads the Chats list already shows as
 * read - e.g. a message that landed while the thread was open, then got a
 * reply. Without this the Chats badge keeps counting it with nothing unread
 * to tap. Returns whether anything changed.
 */
export async function reconcileMessageNotifications(
  myProfileId: string,
  conversations: ConversationSummary[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("notifications")
    .select("related_profile_id")
    .eq("profile_id", myProfileId)
    .eq("kind", "message")
    .eq("is_read", false);
  if (error || !data?.length) return false;

  const readThreads = new Set(conversations.filter((c) => !c.unread).map((c) => c.otherProfileId));
  const stale = [...new Set(data.map((n) => n.related_profile_id as string | null))].filter(
    (id): id is string => id != null && readThreads.has(id),
  );
  if (!stale.length) return false;

  await Promise.all(
    stale.flatMap((otherId) => [
      markThreadRead(myProfileId, otherId),
      markMessageNotificationsRead(myProfileId, otherId),
    ]),
  );
  return true;
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
// Staff: verification, suspension, reports queue
// ---------------------------------------------------------------------
// The badge itself is only ever given by approving an ID check
// (reviewKyc below); staff can still take one away.

export async function unverifyProfile(profileId: string): Promise<void> {
  const { error } = await supabase.from("profile_verifications").delete().eq("profile_id", profileId);
  if (error) throw error;
}

/** Admin tier and above only - enforced by is_admin_or_above() inside the function. */
export async function suspendProfile(profileId: string, reason?: string | null): Promise<void> {
  const { error } = await supabase.rpc("suspend_profile", {
    target_profile_id: profileId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function unsuspendProfile(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("unsuspend_profile", { target_profile_id: profileId });
  if (error) throw error;
}

export async function isProfileSuspended(profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profile_suspensions")
    .select("profile_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

const REPORT_COLUMNS = `
  id,reason,details,status,created_at,resolved_at,
  reporter:reporter_profile_id(id,full_name,avatar_url),
  reported:reported_profile_id(id,full_name,avatar_url)
`;

/** The moderation queue - every open report, newest first. Staff-only via RLS. */
export async function listOpenReports(): Promise<ReportWithParties[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    return { ...r, reporter: one(r.reporter), reported: one(r.reported) } as ReportWithParties;
  });
}

export async function resolveReport(
  reportId: string,
  status: "reviewed" | "dismissed",
  resolvedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// ID checks (KYC) for the verified badge - 6300_kyc_verification.sql
// ---------------------------------------------------------------------
// The photos live in the private 'kyc' bucket: no public URLs, only
// short-lived signed links for the owner and staff.

/** The order the documents are offered in - the one most people carry first. */
export const KYC_DOC_TYPES: KycDocType[] = ["citizenship", "national_id", "driving_license", "passport"];

/** Every kind is a two-sided card except the passport, which has one photo page. */
export function kycHasBack(type: KycDocType): boolean {
  return type !== "passport";
}

const KYC_COLUMNS =
  "id,profile_id,status,created_at,reviewed_at,rejection_code,rejection_note," +
  "documents:kyc_documents(doc_type,front_path,back_path)";

// Both FKs point at profiles, so each embed names its constraint.
const KYC_QUEUE_COLUMNS =
  KYC_COLUMNS +
  ",person:profiles!kyc_submissions_profile_id_fkey(id,full_name,avatar_url,member_no,district,municipality,created_at)" +
  ",reviewer:profiles!kyc_submissions_reviewed_by_fkey(full_name)";

/** How long a link to an ID photo works - long enough to look, short enough not to leak. */
const KYC_URL_SECONDS = 10 * 60;

/** Your latest ID check, or null if you've never sent one. */
export async function getMyKyc(profileId: string): Promise<KycSubmission | null> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select(KYC_COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as KycSubmission | null) ?? null;
}

/** One document picked on the Get verified screen, before it's sent. */
export interface KycDraft {
  type: KycDocType;
  front: File;
  back: File | null;
}

/**
 * Uploads the photos, then sends them for checking. If sending fails,
 * the photos just uploaded are removed again rather than left behind.
 */
export async function submitKyc(
  userId: string,
  drafts: KycDraft[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = drafts.reduce((n, d) => n + 1 + (d.back && kycHasBack(d.type) ? 1 : 0), 0);
  const uploaded: string[] = [];
  async function put(original: File, name: string): Promise<string> {
    onProgress?.(uploaded.length + 1, total);
    const file = await shrinkImage(original, IMAGE_MAX_SIDE.kyc, 0.88);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${name}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("kyc").upload(path, file, { contentType: file.type });
    if (error) throw error;
    uploaded.push(path);
    return path;
  }

  try {
    const documents: { type: KycDocType; front: string; back: string | null }[] = [];
    for (const d of drafts) {
      documents.push({
        type: d.type,
        front: await put(d.front, `${d.type}-front`),
        back: d.back && kycHasBack(d.type) ? await put(d.back, `${d.type}-back`) : null,
      });
    }
    const { error } = await supabase.rpc("submit_kyc", { p_documents: documents });
    if (error) throw error;
  } catch (error) {
    if (uploaded.length > 0) {
      try {
        await supabase.storage.from("kyc").remove(uploaded);
      } catch {
        // Best-effort; the error that matters is the one below.
      }
    }
    throw error;
  }
}

function mapKycRow(row: unknown): KycQueueItem {
  const r = row as Record<string, unknown>;
  return { ...r, person: one(r.person), reviewer: one(r.reviewer) } as KycQueueItem;
}

/** Staff: ID checks waiting, oldest first - first sent, first checked. */
export async function listKycQueue(): Promise<KycQueueItem[]> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select(KYC_QUEUE_COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(mapKycRow);
}

/** Staff: the latest ID checks already decided, newest first. */
export async function listRecentKycReviews(limit = 20): Promise<KycQueueItem[]> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select(KYC_QUEUE_COLUMNS)
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(mapKycRow);
}

/** Staff: the approved ID check behind someone's badge, or null (6600). */
export async function getApprovedKyc(profileId: string): Promise<KycQueueItem | null> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select(KYC_QUEUE_COLUMNS)
    .eq("profile_id", profileId)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapKycRow(data) : null;
}

/** Staff: the latest ID a member sent - waiting, approved or not accepted - with who checked it. */
export async function getLatestKyc(profileId: string): Promise<KycQueueItem | null> {
  const { data, error } = await supabase
    .from("kyc_submissions")
    .select(KYC_QUEUE_COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapKycRow(data) : null;
}

/** Staff: how many ID checks are waiting. */
/** Everything waiting in ID checks: IDs plus certificates (8300). */
export async function countKycQueue(): Promise<number> {
  const [ids, certificates] = await Promise.all([
    supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (ids.error) throw ids.error;
  if (certificates.error) throw certificates.error;
  return (ids.count ?? 0) + (certificates.count ?? 0);
}

/** Signed links to ID photos, by path. */
export async function kycPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from("kyc").createSignedUrls(paths, KYC_URL_SECONDS);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

/** Staff: approve (gives the verified badge) or reject with a reason. */
export async function reviewKyc(
  submissionId: string,
  approve: boolean,
  reason?: KycRejectionCode,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("review_kyc", {
    p_submission: submissionId,
    p_approve: approve,
    p_reason: approve ? null : (reason ?? "other"),
    p_note: approve ? null : note?.trim() || null,
  });
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
// Every upload gets a fresh timestamped path and is never overwritten, so
// phones and the CDN may keep it for a year instead of re-downloading each
// face every hour.
const IMMUTABLE_CACHE = "31536000";

export async function uploadAvatar(userId: string, original: File): Promise<string> {
  const file = await shrinkImage(original, IMAGE_MAX_SIDE.avatar);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: IMMUTABLE_CACHE, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------
// Certificates (optional proof of training, shown on the profile)
// ---------------------------------------------------------------------
const CERTIFICATE_COLUMNS =
  "id,profile_id,title,file_url,file_type,created_at,skill_id,status,reviewed_at,rejection_code,rejection_note";

export async function listCertificates(profileId: string): Promise<Certificate[]> {
  return unwrap(
    await supabase
      .from("certificates")
      .select(CERTIFICATE_COLUMNS)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
  );
}

export async function addCertificate(
  userId: string,
  profileId: string,
  title: string,
  skillId: string | null,
  original: File,
): Promise<Certificate> {
  const file = await shrinkImage(original, IMAGE_MAX_SIDE.certificate);
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${userId}/cert-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(path, file, { upsert: true, cacheControl: IMMUTABLE_CACHE, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data: pub } = supabase.storage.from("certificates").getPublicUrl(path);
  return unwrap(
    await supabase
      .from("certificates")
      .insert({ profile_id: profileId, title: title.trim(), skill_id: skillId, file_url: pub.publicUrl, file_type: file.type })
      .select(CERTIFICATE_COLUMNS)
      .single(),
  );
}

export async function removeCertificate(id: string): Promise<void> {
  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) throw error;
}

/** A certificate waiting in the staff queue, with who sent it and the skills they list. */
export interface CertificateToCheck extends Certificate {
  owner: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    skills: UserSkillDetail[];
  };
}

/** Staff: certificates waiting for a check, oldest first. */
export async function listPendingCertificates(): Promise<CertificateToCheck[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select(
      CERTIFICATE_COLUMNS +
        ",owner:profiles!certificates_profile_id_fkey(id,full_name,avatar_url," +
        "user_skills(custom_label,custom_note,rate_amount,rate_unit,skills(id,name_en,name_ne,emoji,category,sort_order)))",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  type Row = Certificate & {
    owner: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      user_skills: (Omit<UserSkillDetail, keyof Skill> & { skills: Skill | Skill[] | null })[];
    } | null;
  };
  return ((data ?? []) as unknown as Row[]).flatMap((row) => {
    if (!row.owner) return [];
    const { user_skills, ...owner } = row.owner;
    const skills = user_skills
      .flatMap(({ skills: s, ...us }) => {
        const skill = one(s);
        return skill ? [{ ...skill, ...us }] : [];
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return [{ ...row, owner: { ...owner, skills } }];
  });
}

/** Staff: approve a certificate for one of the member's skills, or turn it down. */
export async function reviewCertificate(input: {
  certificateId: string;
  approve: boolean;
  skillId?: string | null;
  reason?: CertificateRejection | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("review_certificate", {
    p_certificate: input.certificateId,
    p_approve: input.approve,
    p_skill: input.skillId ?? null,
    p_reason: input.reason ?? null,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Notice board - staff post, everyone reads (5000_notice_board.sql)
// ---------------------------------------------------------------------
// staff_roles has a second FK back to profiles (granted_by), so the embed
// names the profile_id constraint, same as PROFILE_COLUMNS_WITH_BADGES.
const NOTICE_COLUMNS =
  "id,title,body,image_url,created_at," +
  "author:profiles!notices_author_profile_id_fkey(id,full_name,avatar_url,staff_roles!staff_roles_profile_id_fkey(role))";

type NoticeAuthorRow = Pick<Profile, "id" | "full_name" | "avatar_url"> & {
  staff_roles?: { role: StaffRole } | { role: StaffRole }[] | null;
};

function mapNoticeRow(row: unknown): Notice {
  const { author, ...rest } = row as Omit<Notice, "author"> & {
    author: NoticeAuthorRow | NoticeAuthorRow[] | null;
  };
  const a = one(author);
  return {
    ...rest,
    author: a
      ? { id: a.id, full_name: a.full_name, avatar_url: a.avatar_url, staff_role: one(a.staff_roles)?.role ?? null }
      : null,
  };
}

export const NOTICES_PAGE = 12;

export async function listNotices(page = 0, pageSize = NOTICES_PAGE): Promise<Notice[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("notices")
    .select(NOTICE_COLUMNS)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []).map(mapNoticeRow);
}

export async function getNotice(id: string): Promise<Notice | null> {
  const { data, error } = await supabase.from("notices").select(NOTICE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapNoticeRow(data) : null;
}

/**
 * Posts a notice. The database does the rest: every member gets an alert,
 * and an email with the image, from the notices insert trigger. Staff-only
 * - enforced by RLS on both the table and the storage bucket.
 */
export async function publishNotice(
  userId: string,
  profileId: string,
  input: { title: string; body: string; image: File | null },
): Promise<Notice> {
  let imagePath: string | null = null;
  let imageUrl: string | null = null;
  if (input.image) {
    const file = await shrinkImage(input.image, IMAGE_MAX_SIDE.notice);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    imagePath = `${userId}/notice-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("notices")
      .upload(imagePath, file, { cacheControl: IMMUTABLE_CACHE, contentType: file.type });
    if (error) throw error;
    imageUrl = supabase.storage.from("notices").getPublicUrl(imagePath).data.publicUrl;
  }

  const body = input.body.trim();
  const { data, error } = await supabase
    .from("notices")
    .insert({ author_profile_id: profileId, title: input.title.trim(), body: body || null, image_url: imageUrl })
    .select(NOTICE_COLUMNS)
    .single();
  if (error) {
    // Nothing will ever show an image whose notice never got posted.
    if (imagePath) await supabase.storage.from("notices").remove([imagePath]);
    throw error;
  }
  return mapNoticeRow(data);
}

/** The object path inside `bucket` that one of its public URLs points at. */
function publicPathIn(bucket: string, url: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length));
}

/** Takes a notice down - its alerts go with it (on delete cascade). Staff-only via RLS. */
export async function deleteNotice(notice: Pick<Notice, "id" | "image_url">): Promise<void> {
  const { error } = await supabase.from("notices").delete().eq("id", notice.id);
  if (error) throw error;
  // Best-effort: nothing links to the image once the notice is gone, and a
  // leftover file must never make the delete itself look like it failed.
  const path = notice.image_url ? publicPathIn("notices", notice.image_url) : null;
  if (path) await supabase.storage.from("notices").remove([path]);
}

/** Opening a notice clears its alert, however you got there. True if one was unread. */
export async function markNoticeAlertRead(profileId: string, noticeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profileId)
    .eq("notice_id", noticeId)
    .eq("is_read", false)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
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

export function shapeMessage(row: unknown): ChatMessage {
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
  profile_verifications?: { verified_at: string } | { verified_at: string }[] | null;
  skill_verifications?: { skill_id: string }[] | null;
  staff_roles?: { role: StaffRole } | { role: StaffRole }[] | null;
}

/** All of "my" chats, one row per conversation, newest message first. */
export async function listConversations(myProfileId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("messages")
    // profile_verifications/staff_roles both carry a second FK back to
    // profiles (verified_by/granted_by) - same as PROFILE_COLUMNS_WITH_
    // BADGES above, the embed must name the profile_id constraint or
    // PostgREST refuses it as ambiguous, even nested this deep.
    .select(
      "profile_a,profile_b,sender_profile_id,body,created_at,read_at,deleted_at," +
        "message_reactions(profile_id,emoji)," +
        "a:profiles!messages_profile_a_fkey(id,full_name,avatar_url,is_official" +
        BADGE_COLUMNS +
        ",staff_roles!staff_roles_profile_id_fkey(role))," +
        "b:profiles!messages_profile_b_fkey(id,full_name,avatar_url,is_official" +
        BADGE_COLUMNS +
        ",staff_roles!staff_roles_profile_id_fkey(role))",
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
      otherIsVerified: one(other.profile_verifications) != null,
      otherSkillVerified: (other.skill_verifications?.length ?? 0) > 0,
      otherStaffRole: one(other.staff_roles)?.role ?? null,
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

// ---------------------------------------------------------------------
// Payment details and Duleko's fees (5600_payment_details_and_fees.sql)
// ---------------------------------------------------------------------
// Duleko never moves money: members list where they can be paid, and
// workers record paying Duleko's monthly fee for an admin to confirm.

const PAYMENT_METHOD_COLUMNS =
  "id,profile_id,kind,bank_code,bank_name,branch,account_number,account_name,wallet_id,qr_url,is_primary,created_at";

/** The folder Duleko's own QR codes are kept in (admins only, by RLS). */
export const DULEKO_PAYMENTS_FOLDER = "duleko";

/**
 * A member's accounts (`owner` = their profile id) or Duleko's own
 * (`owner` = null), primary first. Someone else's come back empty unless
 * RLS lets you see them - a job with them, or their phone rule.
 */
export async function listPaymentMethods(owner: string | null): Promise<PaymentMethod[]> {
  const query = supabase.from("payment_methods").select(PAYMENT_METHOD_COLUMNS);
  const { data, error } = await (owner ? query.eq("profile_id", owner) : query.is("profile_id", null))
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

/** Puts a QR or a payment screenshot in the payments bucket, under a name nobody can guess. */
async function uploadPaymentImage(folder: string, original: File, kind: "qr" | "proof"): Promise<string> {
  const file = await shrinkImage(original, IMAGE_MAX_SIDE[kind], kind === "qr" ? 0.92 : 0.82);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("payments")
    .upload(path, file, { cacheControl: IMMUTABLE_CACHE, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("payments").getPublicUrl(path).data.publicUrl;
}

/** Best-effort: a leftover image must never make a save or delete look like it failed. */
async function removePaymentImage(url: string | null | undefined): Promise<void> {
  const path = url ? publicPathIn("payments", url) : null;
  if (!path) return;
  try {
    await supabase.storage.from("payments").remove([path]);
  } catch {
    // Ignored on purpose.
  }
}

/** Only the fields that belong to the kind - the database refuses the rest. */
function paymentFields(draft: PaymentMethodDraft) {
  const clean = (value: string | null) => value?.trim() || null;
  if (draft.kind === "bank") {
    return {
      bank_code: draft.bank_code,
      bank_name: draft.bank_code === "other" ? clean(draft.bank_name) : null,
      branch: clean(draft.branch),
      account_number: draft.account_number?.replace(/\s+/g, "") || null,
      account_name: draft.account_name.trim(),
      wallet_id: null,
    };
  }
  return {
    bank_code: null,
    bank_name: null,
    branch: null,
    account_number: null,
    account_name: draft.account_name.trim(),
    wallet_id: draft.wallet_id?.replace(/\D/g, "").replace(/^977(?=9)/, "") || null,
  };
}

export interface SavePaymentMethodInput {
  /** Storage folder: the signed-in user's auth id, or DULEKO_PAYMENTS_FOLDER. */
  folder: string;
  /** Whose account: a profile id, or null for one of Duleko's. */
  owner: string | null;
  /** The account being edited; leave out to add one. */
  existing?: PaymentMethod | null;
  draft: PaymentMethodDraft;
  /** A new QR photo to use. */
  qr?: File | null;
  /** Take the existing QR off. */
  removeQr?: boolean;
}

/** Adds or edits one account and returns the fresh list. */
export async function savePaymentMethod(input: SavePaymentMethodInput): Promise<PaymentMethod[]> {
  const { folder, owner, existing, draft, qr, removeQr } = input;
  const uploaded = qr ? await uploadPaymentImage(folder, qr, "qr") : null;
  const qr_url = uploaded ?? (removeQr ? null : (existing?.qr_url ?? null));
  const row = { ...paymentFields(draft), qr_url };

  const { error } = existing
    ? await supabase.from("payment_methods").update(row).eq("id", existing.id)
    : await supabase.from("payment_methods").insert({ ...row, kind: draft.kind, profile_id: owner });
  if (error) {
    if (uploaded) await removePaymentImage(uploaded);
    throw error;
  }
  if (existing?.qr_url && existing.qr_url !== qr_url) await removePaymentImage(existing.qr_url);
  return listPaymentMethods(owner);
}

export async function makePrimaryPaymentMethod(id: string, owner: string | null): Promise<PaymentMethod[]> {
  const { error } = await supabase.from("payment_methods").update({ is_primary: true }).eq("id", id);
  if (error) throw error;
  return listPaymentMethods(owner);
}

export async function deletePaymentMethod(method: PaymentMethod): Promise<PaymentMethod[]> {
  const { error } = await supabase.from("payment_methods").delete().eq("id", method.id);
  if (error) throw error;
  await removePaymentImage(method.qr_url);
  return listPaymentMethods(method.profile_id);
}

/** Where a worker stands with Duleko's fees: their own (no id), or anyone's for staff. */
/** My referral code, how many joined with it, and who invited me (7900). */
export interface MyReferral {
  code: string | null;
  joined: number;
  referred_by: string | null;
  /** Still inside the first 7 days, with no code added yet. */
  can_enter: boolean;
}

export async function getMyReferral(): Promise<MyReferral> {
  const { data, error } = await supabase.rpc("my_referral");
  if (error) throw error;
  return data as MyReferral;
}

/** "I joined with this code": a free job for me and for them. Returns their name. */
export async function applyReferral(code: string): Promise<{ referrer_name: string }> {
  const { data, error } = await supabase.rpc("apply_referral", { p_code: code });
  if (error) throw error;
  return data as { referrer_name: string };
}

export async function getFeeAccount(workerId?: string): Promise<FeeAccount> {
  const { data, error } = await supabase.rpc("fee_account", workerId ? { p_worker: workerId } : {});
  if (error) throw error;
  return data as FeeAccount;
}

const FEE_CHARGE_COLUMNS =
  "id,engagement_id,worker_profile_id,job_title,price,amount,welcome,completed_on,period,created_at";

/** numeric comes back from PostgREST as a string or a number; always a number here. */
function mapCharge(row: unknown): FeeCharge {
  const c = row as FeeCharge;
  return { ...c, price: Number(c.price) };
}

export async function listFeeCharges(workerId: string): Promise<FeeCharge[]> {
  const { data, error } = await supabase
    .from("fee_charges")
    .select(FEE_CHARGE_COLUMNS)
    .eq("worker_profile_id", workerId)
    .order("completed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapCharge);
}

/** Duleko's fee on one job, once it is completed - null when it carries none. */
export async function getFeeForJob(engagementId: string): Promise<FeeCharge | null> {
  const { data, error } = await supabase
    .from("fee_charges")
    .select(FEE_CHARGE_COLUMNS)
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCharge(data) : null;
}

const FEE_PAYMENT_COLUMNS =
  "id,worker_profile_id,amount,method,paid_to_id,paid_to_label,transaction_id,proof_url,note,status,rejection_reason,reviewed_at,created_at";

export async function listFeePayments(workerId: string): Promise<FeePayment[]> {
  return unwrap(
    await supabase
      .from("fee_payments")
      .select(FEE_PAYMENT_COLUMNS)
      .eq("worker_profile_id", workerId)
      .order("created_at", { ascending: false })
      .limit(100),
  );
}

export interface FeePaymentInput {
  amount: number;
  method: FeePayment["method"];
  paid_to_id: string | null;
  transaction_id: string | null;
  note: string | null;
}

/** A worker saying they paid Duleko. It waits for an admin to confirm it. */
export async function recordFeePayment(
  userId: string,
  workerId: string,
  input: FeePaymentInput,
  proof: File | null,
): Promise<void> {
  const proof_url = proof ? await uploadPaymentImage(userId, proof, "proof") : null;
  const { error } = await supabase.from("fee_payments").insert({
    worker_profile_id: workerId,
    amount: input.amount,
    method: input.method,
    paid_to_id: input.method === "cash" ? null : input.paid_to_id,
    transaction_id: input.transaction_id?.trim() || null,
    note: input.note?.trim() || null,
    proof_url,
  });
  if (error) {
    if (proof_url) await removePaymentImage(proof_url);
    throw error;
  }
}

/** Takes back a payment recorded by mistake, while it still waits to be checked. */
export async function withdrawFeePayment(payment: FeePayment): Promise<void> {
  const { error } = await supabase.from("fee_payments").delete().eq("id", payment.id);
  if (error) throw error;
  await removePaymentImage(payment.proof_url);
}

/** Staff: totals and every worker with fees. */
export async function getFeeOverview(): Promise<FeeOverview> {
  const { data, error } = await supabase.rpc("fee_overview");
  if (error) throw error;
  return data as FeeOverview;
}

type FeePaymentRow = Omit<FeePayment, "worker"> & {
  worker: NonNullable<FeePayment["worker"]> | NonNullable<FeePayment["worker"]>[] | null;
};

/** Staff: payments waiting to be checked, oldest first. */
export async function listPaymentsToCheck(): Promise<FeePayment[]> {
  const { data, error } = await supabase
    .from("fee_payments")
    .select(
      FEE_PAYMENT_COLUMNS +
        ",worker:profiles!fee_payments_worker_profile_id_fkey(id,full_name,avatar_url,member_no)",
    )
    .eq("status", "reported")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as FeePaymentRow[]).map((row) => ({ ...row, worker: one(row.worker) ?? undefined }));
}

/** Admins: the money arrived (confirm), or it didn't (reject, saying why). */
export async function reviewFeePayment(id: string, accept: boolean, reason?: string | null): Promise<void> {
  const { data, error } = await supabase
    .from("fee_payments")
    .update(accept ? { status: "confirmed" } : { status: "rejected", rejection_reason: reason?.trim() || null })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS turns a moderator's attempt into "nothing updated" rather than an error.
  if (!data?.length) throw new Error("ADMIN_ONLY");
}

// ---------------------------------------------------------------------
// Job board - members post work, workers send offers (5800_job_board.sql).
// Posts are public; offers are only for the worker and the poster. Every
// write except posting goes through a function, which also sends the
// alerts.
// ---------------------------------------------------------------------
const JOB_PERSON_COLUMNS =
  "id,full_name,avatar_url,rating,rating_count,district,municipality,locality" +
  BADGE_COLUMNS +
  ",staff_roles!staff_roles_profile_id_fkey(role)";

const JOB_POST_COLUMNS =
  "id,employer_profile_id,kind,skill_id,title,details,district,municipality,location_text,work_date," +
  "budget_min,budget_max,price_unit,status,engagement_id,offer_count,lat,lng,created_at,updated_at," +
  "skill:skills(id,name_en,name_ne,emoji,category)," +
  `poster:profiles!job_posts_employer_profile_id_fkey(${JOB_PERSON_COLUMNS})`;

const JOB_OFFER_COLUMNS = "id,job_post_id,worker_profile_id,amount,note,status,created_at,updated_at";

function mapJobPerson(row: unknown): JobPerson | null {
  const profile = mapProfileRow(one(row as Record<string, unknown> | Record<string, unknown>[] | null));
  return profile as JobPerson | null;
}

function mapJobPost(row: unknown): JobPost {
  const { skill, poster, ...rest } = row as Omit<JobPost, "skill" | "poster"> & {
    skill: Skill | Skill[] | null;
    poster: unknown;
  };
  return {
    ...rest,
    budget_min: rest.budget_min == null ? null : Number(rest.budget_min),
    budget_max: rest.budget_max == null ? null : Number(rest.budget_max),
    skill: one(skill),
    poster: mapJobPerson(poster),
  };
}

function mapJobOffer(row: unknown): JobOffer {
  const { worker, post, ...rest } = row as Omit<JobOffer, "worker" | "post"> & { worker?: unknown; post?: unknown };
  return {
    ...rest,
    amount: Number(rest.amount),
    worker: worker === undefined ? undefined : mapJobPerson(worker),
    post: post === undefined ? undefined : post ? mapJobPost(one(post as object | object[])) : null,
  };
}

export const JOBS_PAGE = 12;

/** Open posts whose day hasn't passed, newest first - in one district, or anywhere. */
export async function listJobPosts(params: {
  kind?: JobPostKind;
  district?: string | null;
  skill?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<JobPost[]> {
  const pageSize = params.pageSize ?? JOBS_PAGE;
  const from = (params.page ?? 0) * pageSize;
  let query = supabase
    .from("job_posts")
    .select(JOB_POST_COLUMNS)
    .eq("status", "open")
    .eq("kind", params.kind ?? "hire")
    .gte("work_date", todayKey());
  if (params.district) query = query.eq("district", params.district);
  if (params.skill) query = query.eq("skill_id", params.skill);
  const { data, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []).map(mapJobPost);
}

export async function getJobPost(id: string): Promise<JobPost | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase.from("job_posts").select(JOB_POST_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapJobPost(data) : null;
}

/** Everything I've posted, whatever its state. */
export async function listMyJobPosts(myProfileId: string, page = 0, pageSize = JOBS_PAGE): Promise<JobPost[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("job_posts")
    .select(JOB_POST_COLUMNS)
    .eq("employer_profile_id", myProfileId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []).map(mapJobPost);
}

export interface JobPostInput {
  kind: JobPostKind;
  skill_id: string;
  title: string;
  details: string | null;
  district: string;
  municipality: string | null;
  /** Hiring only; an offer post has no exact place and sets its own last day (6700). */
  location_text: string | null;
  work_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  /** Per hour, day, km... null for the whole job (8000). */
  price_unit: PriceUnit | null;
  /**
   * The exact place and pin. The database keeps both for the poster and
   * the chosen worker only (job_post_places, 6100); the post itself shows
   * its area and the pin's ~1 km square.
   */
  lat: number | null;
  lng: number | null;
}

/** The exact place of my own post - nobody else can read it. */
export interface JobPostPlace {
  location_text: string | null;
  lat: number | null;
  lng: number | null;
}

export async function getJobPostPlace(postId: string): Promise<JobPostPlace | null> {
  const { data, error } = await supabase
    .from("job_post_places")
    .select("location_text,lat,lng")
    .eq("job_post_id", postId)
    .maybeSingle();
  if (error) throw error;
  return (data as JobPostPlace | null) ?? null;
}

/** Open hiring posts with a pin inside the map's view (offer posts have no pin). */
export async function listJobPostsInBounds(bounds: MapBounds, skill?: string | null): Promise<JobPost[]> {
  let query = supabase
    .from("job_posts")
    .select(JOB_POST_COLUMNS)
    .eq("status", "open")
    .eq("kind", "hire")
    .gte("work_date", todayKey())
    .gte("lat", bounds.south)
    .lte("lat", bounds.north)
    .gte("lng", bounds.west)
    .lte("lng", bounds.east);
  if (skill) query = query.eq("skill_id", skill);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map(mapJobPost);
}

/** Posts a job. The database alerts available workers nearby with that skill. */
export async function createJobPost(employerProfileId: string, input: JobPostInput): Promise<JobPost> {
  const { data, error } = await supabase
    .from("job_posts")
    .insert({ ...input, employer_profile_id: employerProfileId })
    .select(JOB_POST_COLUMNS)
    .single();
  if (error) throw error;
  return mapJobPost(data);
}

/** The poster's view: every offer on their post, with who sent it. */
export async function listOffersForPost(postId: string): Promise<JobOffer[]> {
  const { data, error } = await supabase
    .from("job_offers")
    .select(`${JOB_OFFER_COLUMNS},worker:profiles!job_offers_worker_profile_id_fkey(${JOB_PERSON_COLUMNS})`)
    .eq("job_post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobOffer);
}

/** A worker's own offer on a post, if they've made one. */
export async function getMyOffer(postId: string, myProfileId: string): Promise<JobOffer | null> {
  const { data, error } = await supabase
    .from("job_offers")
    .select(JOB_OFFER_COLUMNS)
    .eq("job_post_id", postId)
    .eq("worker_profile_id", myProfileId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapJobOffer(data) : null;
}

/** Every offer I've sent, newest activity first, with the post it was for. */
export async function listMyOffers(myProfileId: string, page = 0, pageSize = JOBS_PAGE): Promise<JobOffer[]> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("job_offers")
    .select(`${JOB_OFFER_COLUMNS},post:job_posts(${JOB_POST_COLUMNS})`)
    .eq("worker_profile_id", myProfileId)
    .order("updated_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []).map(mapJobOffer);
}

/** My open posts with offers waiting to be chosen from - "choose a worker" on Work. */
export async function listMyPostsWithOffers(myProfileId: string): Promise<JobPost[]> {
  const { data, error } = await supabase
    .from("job_posts")
    .select(JOB_POST_COLUMNS)
    .eq("employer_profile_id", myProfileId)
    .eq("status", "open")
    .eq("kind", "hire")
    .gte("work_date", todayKey())
    .gt("offer_count", 0)
    .order("work_date", { ascending: true })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(mapJobPost);
}

/**
 * How much of mine is live on the board: open posts, and offers still
 * waiting on an open post. The counts on Work's tabs and the board's
 * shortcuts to them.
 */
export async function countMyBoardActivity(myProfileId: string): Promise<{ openPosts: number; waitingOffers: number }> {
  const today = todayKey();
  const [posts, offers] = await Promise.all([
    supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("employer_profile_id", myProfileId)
      .eq("status", "open")
      .gte("work_date", today),
    supabase
      .from("job_offers")
      .select("id,job_posts!inner(id)", { count: "exact", head: true })
      .eq("worker_profile_id", myProfileId)
      .eq("status", "pending")
      .eq("job_posts.status", "open")
      .gte("job_posts.work_date", today),
  ]);
  return { openPosts: posts.count ?? 0, waitingOffers: offers.count ?? 0 };
}

/** Sends an offer, or changes the one already sent. */
export async function makeJobOffer(postId: string, amount: number, note: string | null): Promise<JobOffer> {
  const { data, error } = await supabase.rpc("make_job_offer", {
    p_job_post_id: postId,
    p_amount: amount,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return mapJobOffer(data);
}

export async function withdrawJobOffer(offerId: string): Promise<void> {
  const { error } = await supabase.rpc("withdraw_job_offer", { p_offer_id: offerId });
  if (error) throw error;
}

/** The poster picks an offer: returns the work request it became. */
export async function chooseJobOffer(offerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("choose_job_offer", { p_offer_id: offerId });
  if (error) throw error;
  return data as string;
}

export async function closeJobPost(postId: string): Promise<void> {
  const { error } = await supabase.rpc("close_job_post", { p_job_post_id: postId });
  if (error) throw error;
}

/** What staff can change on a service post (7200). */
export interface StaffPostEdit {
  title: string;
  details: string | null;
  budget_min: number | null;
  budget_max: number | null;
}

/**
 * Staff only, service posts only (7200). Each takes the reason the poster
 * is told in their alert, and is kept in job_post_moderation.
 */
export async function staffEditJobPost(postId: string, edit: StaffPostEdit, reason: string): Promise<void> {
  const { error } = await supabase.rpc("staff_edit_job_post", {
    p_job_post_id: postId,
    p_title: edit.title,
    p_details: edit.details,
    p_budget_min: edit.budget_min,
    p_budget_max: edit.budget_max,
    p_reason: reason,
  });
  if (error) throw error;
}

/** Takes the post off the board; the poster still sees it, closed. */
export async function staffCloseJobPost(postId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("staff_close_job_post", { p_job_post_id: postId, p_reason: reason });
  if (error) throw error;
}

/** Deletes the post for good. */
export async function staffDeleteJobPost(postId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("staff_delete_job_post", { p_job_post_id: postId, p_reason: reason });
  if (error) throw error;
}
