export type Lang = "en" | "ne";

/**
 * The three staff tiers, ranked low to high. Read from the `staff_roles`
 * table - never stored as a column on `profiles` itself, so a profile
 * update can never grant a role.
 */
export type CallPermission = "everyone" | "accepted_work" | "friends" | "nobody";

export type StaffRole = "moderator" | "admin" | "technical_admin";

export type EngagementStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "confirmed"
  | "completed"
  | "cancelled";

export type SkillCategory = "trades" | "professional" | "personal";

export interface Skill {
  id: string;
  name_en: string;
  name_ne: string;
  emoji: string;
  sort_order?: number;
  category: SkillCategory;
}

/** A skill a profile has listed, with its optional custom entry and rate. */
export interface UserSkillDetail extends Skill {
  custom_label: string | null;
  custom_note: string | null;
  rate_amount: number | null;
  rate_unit: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  about: string | null;
  bio: string | null;
  age: number | null;
  education: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  locality: string | null;
  is_available: boolean;
  /** The one Duleko account the automatic welcome message is sent from. */
  is_official: boolean;
  /** Opaque handle used in shared links, so they never carry the row id. */
  public_slug: string;
  /** Duleko Membership ID, e.g. "DLK-26-00042" - issued once at sign-up, never changes. */
  member_no: string;
  language: Lang;
  rating: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  location_shared_at: string | null;
  /** null = never asked; 'granted' auto-shares silently on every login; 'declined' means never ask again. */
  location_consent: "granted" | "declined" | null;
  /** Who may see this person's phone number (and so use the Call button). */
  call_permission: CallPermission;
  created_at: string;
  updated_at: string;
  /** Set once a moderator/admin verifies this profile - drives the hollow green badge. */
  is_verified: boolean;
  /** Set when this profile belongs to staff - drives the solid staff badge instead. */
  staff_role: StaffRole | null;
}

/** A training/skill certificate a worker has chosen to show on their profile. */
export interface Certificate {
  id: string;
  profile_id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

/** Row shape returned by the search_workers RPC. */
export interface WorkerCardData {
  id: string;
  full_name: string;
  about: string | null;
  avatar_url: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  locality: string | null;
  is_available: boolean;
  rating: number;
  rating_count: number;
  skills: Skill[];
  free_on_day: boolean;
  match_score: number;
  distance_km: number | null;
  is_verified: boolean;
  staff_role: StaffRole | null;
}

export type CancellationReason =
  | "schedule_conflict"
  | "change_of_plans"
  | "price_disagreement"
  | "found_someone_else"
  | "no_longer_needed"
  | "other";

export interface Engagement {
  id: string;
  employer_profile_id: string;
  worker_profile_id: string;
  skill_id: string | null;
  title: string;
  details: string | null;
  work_date: string;
  location_text: string;
  payment_amount: number | null;
  payment_note: string | null;
  status: EngagementStatus;
  cancelled_by: string | null;
  cancellation_reason: CancellationReason | null;
  cancellation_note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementWithParties extends Engagement {
  employer: Pick<Profile, "id" | "full_name" | "avatar_url" | "rating" | "rating_count">;
  worker: Pick<Profile, "id" | "full_name" | "avatar_url" | "rating" | "rating_count">;
  skill: Skill | null;
  my_review: { id: string; rating: number; comment: string | null } | null;
}

/** One offer in a back-and-forth price negotiation on a pending engagement. */
export interface Bid {
  id: string;
  engagement_id: string;
  bidder_profile_id: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  engagement_id: string;
  reviewer_profile_id: string;
  reviewee_profile_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  kind:
    | "request"
    | "accepted"
    | "declined"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "review"
    | "friend_request"
    | "friend_accepted"
    | "message"
    | "welcome"
    | "verified"
    | "verify_reminder"
    | "announcement"
    | "notice"
    /** To a worker: Duleko confirmed, or couldn't find, a fee payment. */
    | "fee_payment"
    /** To admins: a worker recorded paying their fees. */
    | "fee_review";
  title_en: string;
  title_ne: string;
  body_en: string | null;
  body_ne: string | null;
  engagement_id: string | null;
  /** Set for kinds like "message" that link to a profile rather than an engagement. */
  related_profile_id: string | null;
  /** Set for "notice" - the notice board post this alert is about. */
  notice_id: string | null;
  actor_name: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * One post on the Duleko notice board. Only staff can publish one;
 * everyone, guests included, can read them.
 */
export interface Notice {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  /** null once the staff member who posted it has deleted their account. */
  author: (Pick<Profile, "id" | "full_name" | "avatar_url"> & { staff_role: StaffRole | null }) | null;
}

/**
 * Whether the same notifications should also leave the app. Email is on
 * by default; SMS is opt-in because each text costs money, and it only
 * ever fires for the important kinds (see the 'sms_kinds' app setting).
 */
export interface NotificationPrefs {
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface AvailabilityDay {
  id: string;
  profile_id: string;
  day: string;
  status: "available" | "booked";
  engagement_id: string | null;
}

export type ReportReason = "spam" | "fake_profile" | "abusive" | "no_show" | "unsafe" | "other";

export type ReportStatus = "open" | "reviewed" | "dismissed";

/** One user report, with just enough of each party to show in the moderation queue. */
export interface ReportWithParties {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  reporter: Pick<Profile, "id" | "full_name" | "avatar_url">;
  reported: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface Friendship {
  id: string;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: FriendshipStatus;
  created_at: string;
  /** Whichever side of the row isn't "me". */
  other: Pick<Profile, "id" | "full_name" | "avatar_url" | "rating" | "rating_count">;
}

/** One person's reaction to a message. */
export interface MessageReaction {
  profile_id: string;
  emoji: string;
}

/** The quoted message shown above a reply - just enough to render the stub. */
export interface RepliedMessage {
  id: string;
  body: string;
  sender_profile_id: string;
  deleted_at: string | null;
}

/** A single direct message between two profiles. */
export interface ChatMessage {
  id: string;
  profile_a: string;
  profile_b: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
  /** Set once the sender edits the text; null for an untouched message. */
  edited_at: string | null;
  reply_to_id: string | null;
  reply_to: RepliedMessage | null;
  message_reactions: MessageReaction[];
}

/** One row in the "all my chats" list - the other person plus their latest message. */
export interface ConversationSummary {
  otherProfileId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  otherIsOfficial: boolean;
  otherIsVerified: boolean;
  otherStaffRole: StaffRole | null;
  lastBody: string;
  lastCreatedAt: string;
  lastSenderProfileId: string;
  /** True when the other person sent the last message and I haven't opened the thread since. */
  unread: boolean;
  /** Set when my own last message has been read - drives the "Seen" tick in the list. */
  lastReadAt: string | null;
  /** The last message was unsent, so the preview reads "removed" rather than empty. */
  lastDeleted: boolean;
  /** One emoji standing in for any reactions on the last message, shown in the preview. */
  lastReaction: string | null;
}

// ---------------------------------------------------------------------
// Payment details and Duleko's fees (5600_payment_details_and_fees.sql)
// ---------------------------------------------------------------------
export type PaymentKind = "bank" | "esewa" | "khalti";

/**
 * One bank account or eSewa/Khalti wallet money can be paid into: a
 * member's own, or (profile_id null) one of Duleko's official accounts.
 */
export interface PaymentMethod {
  id: string;
  profile_id: string | null;
  kind: PaymentKind;
  /** Banks only: a code from lib/banks.ts, or "other" with bank_name typed in. */
  bank_code: string | null;
  bank_name: string | null;
  branch: string | null;
  account_number: string | null;
  account_name: string;
  /** eSewa / Khalti: the wallet's mobile number. */
  wallet_id: string | null;
  qr_url: string | null;
  is_primary: boolean;
  created_at: string;
}

/** What the form edits - everything a member types or picks. */
export interface PaymentMethodDraft {
  kind: PaymentKind;
  bank_code: string | null;
  bank_name: string | null;
  branch: string | null;
  account_number: string | null;
  account_name: string;
  wallet_id: string | null;
}

export interface FeeTier {
  /** The top of this band of the price; null for the last, open-ended one. */
  up_to: number | null;
  percent: number;
}

export interface FeeRules {
  tiers: FeeTier[];
  /** Fees apply to jobs requested on or after this day (YYYY-MM-DD). */
  starts_on: string;
  welcome_jobs: number;
  /** A month's fees are due by this day of the next Nepali month. */
  due_day: number;
}

export type FeePeriodStatus = "open" | "due" | "overdue" | "paid";

/** One Nepali month's fees. */
export interface FeePeriod {
  /** "2083-08": BS year and month. */
  period: string;
  jobs: number;
  amount: number;
  paid: number;
  left: number;
  due_on: string;
  status: FeePeriodStatus;
}

/** Where a worker stands - see fee_summary_for() in the migration. */
export interface FeeAccount {
  today: string;
  current_period: string | null;
  periods: FeePeriod[];
  charged: number;
  paid: number;
  awaiting: number;
  balance: number;
  payable_now: number;
  overdue: number;
  due_on: string | null;
  max_payment: number;
  blocked: boolean;
  welcome_left: number;
  rules: FeeRules;
}

/** Duleko's fee on one completed job. */
export interface FeeCharge {
  id: string;
  engagement_id: string | null;
  worker_profile_id: string;
  job_title: string;
  price: number;
  amount: number;
  welcome: boolean;
  completed_on: string;
  period: string;
  created_at: string;
}

export type FeePaymentStatus = "reported" | "confirmed" | "rejected";

export interface FeePayment {
  id: string;
  worker_profile_id: string;
  amount: number;
  method: PaymentKind | "cash";
  paid_to_id: string | null;
  paid_to_label: string | null;
  transaction_id: string | null;
  proof_url: string | null;
  note: string | null;
  status: FeePaymentStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  /** Staff lists only: who recorded it. */
  worker?: Pick<Profile, "id" | "full_name" | "avatar_url" | "member_no">;
}

/** One worker's line in the staff overview. */
export interface FeeWorkerLine {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  member_no: string;
  charged: number;
  paid: number;
  awaiting: number;
  balance: number;
  overdue: number;
  blocked: boolean;
  due_on: string | null;
}

export interface FeeOverview {
  charged: number;
  paid: number;
  awaiting: number;
  balance: number;
  overdue: number;
  workers: FeeWorkerLine[];
}
