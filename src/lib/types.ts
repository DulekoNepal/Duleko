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
  avatar_url: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  locality: string | null;
  is_available: boolean;
  language: Lang;
  rating: number;
  rating_count: number;
  lat: number | null;
  lng: number | null;
  location_shared_at: string | null;
  created_at: string;
  updated_at: string;
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
    | "friend_accepted";
  title_en: string;
  title_ne: string;
  body_en: string | null;
  body_ne: string | null;
  engagement_id: string | null;
  actor_name: string | null;
  is_read: boolean;
  created_at: string;
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
