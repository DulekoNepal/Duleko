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
}

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
  kind: "request" | "accepted" | "declined" | "confirmed" | "completed" | "cancelled" | "review";
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
