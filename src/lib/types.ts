export type Lang = "en" | "ne";

export type EngagementStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface Skill {
  id: string;
  name_en: string;
  name_ne: string;
  emoji: string;
  sort_order?: number;
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
  language: Lang;
  rating: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  location_shared_at: string | null;
  created_at: string;
  updated_at: string;
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
    | "welcome";
  title_en: string;
  title_ne: string;
  body_en: string | null;
  body_ne: string | null;
  engagement_id: string | null;
  /** Set for kinds like "message" that link to a profile rather than an engagement. */
  related_profile_id: string | null;
  actor_name: string | null;
  is_read: boolean;
  created_at: string;
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
