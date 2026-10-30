import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { translateStatic, type StringKey } from "./i18n";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once .env.local has been filled in. The app shows a setup screen when false. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * One browser client for the whole app. The session is persisted so a user on a
 * cheap phone with a flaky connection stays logged in between visits.
 */
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // The Android app gets Google's answer back through an address any
      // app could claim, so it carries a one-time code that only this app
      // can redeem, not the session itself (see google-sign-in.ts).
      flowType: Capacitor.isNativePlatform() ? "pkce" : "implicit",
    },
  },
);

/** The job board's error codes and what each tells the person. */
const JOB_ERRORS: [string, StringKey][] = [
  ["JOB_DATE_PAST", "errJobDatePast"],
  ["JOB_POST_LIMIT", "errJobPostLimit"],
  ["JOB_NOT_OPEN", "errJobNotOpen"],
  ["JOB_EXPIRED", "errJobExpired"],
  ["JOB_OWN_POST", "errJobOwnPost"],
  ["JOB_NEEDS_SKILLS", "errJobNeedsSkills"],
  ["JOB_NOT_FOUND", "errJobNotFound"],
  ["JOB_OFFER_NOT_PENDING", "errJobOfferNotPending"],
  ["JOB_BAD_AMOUNT", "errJobBadAmount"],
  ["JOB_SKILL_REQUIRED", "errJobSkillRequired"],
  ["JOB_OFFER_NEEDS_SKILL", "errJobOfferNeedsSkill"],
  ["JOB_NOT_HIRING", "errJobNotHiring"],
  // Staff managing service posts (7200_staff_manage_service_posts.sql)
  ["JOB_NOT_SERVICE", "errJobNotService"],
  ["MOD_REASON_REQUIRED", "errModReasonRequired"],
  ["MOD_NO_CHANGE", "errModNoChange"],
  ["ACCOUNT_SUSPENDED", "errAccountSuspended"],
];

/** ID checks for the verified badge (6300_kyc_verification.sql). */
const KYC_ERRORS: [string, StringKey][] = [
  ["KYC_PENDING", "errKycPending"],
  ["KYC_ALREADY_VERIFIED", "errKycAlreadyVerified"],
  ["KYC_STAFF", "errKycStaff"],
  ["KYC_DOCUMENT_REQUIRED", "errKycDocumentRequired"],
  ["KYC_BACK_REQUIRED", "errKycBackRequired"],
  ["KYC_FRONT_REQUIRED", "errKycPhotos"],
  ["KYC_BAD_DOCUMENT", "errKycPhotos"],
  ["KYC_BAD_FILE", "errKycPhotos"],
  ["KYC_ALREADY_REVIEWED", "errKycAlreadyReviewed"],
  ["KYC_NOT_FOUND", "errKycAlreadyReviewed"],
  ["KYC_REASON_REQUIRED", "errKycReasonRequired"],
  // Certificate checks for the skill badge (8300)
  ["CERT_SKILL_NOT_LISTED", "errCertSkillNotListed"],
  ["CERT_SKILL_REQUIRED", "errCertSkillRequired"],
  ["CERT_ALREADY_REVIEWED", "errCertAlreadyReviewed"],
  ["CERT_NOT_FOUND", "errCertAlreadyReviewed"],
  ["CERT_REASON_REQUIRED", "errKycReasonRequired"],
  ["NAME_LOCKED_VERIFIED", "errNameLockedVerified"],
  // Work agreed over a call (6800_call_deals.sql)
  ["CALL_NOT_ALLOWED", "errCallNotAllowed"],
  ["CALL_NOT_FOUND", "errCallNotFound"],
  ["CALL_ALREADY_ANSWERED", "errCallAnswered"],
  ["CALL_BAD_AMOUNT", "errCallBadAmount"],
  ["CALL_DEAL_NOT_FOUND", "errCallNotFound"],
  ["CALL_DEAL_ANSWERED", "errCallDealAnswered"],
  // Staff settle disputed deals (8400)
  ["CALL_DEAL_SETTLED", "errDealSettled"],
  ["CALL_DEAL_OWN", "errDealOwn"],
  ["AGE_LOCKED_VERIFIED", "errAgeLockedVerified"],
  // No phone numbers or emojis in bios, posts and the like (8200)
  ["TEXT_HAS_PHONE", "errTextHasPhone"],
  ["TEXT_HAS_EMOJI", "errTextHasEmoji"],
  // The investor form (8500)
  ["INVESTOR_INCOMPLETE", "errInvestorIncomplete"],
  ["INVESTOR_BAD_EMAIL", "investErrEmail"],
  ["INVESTOR_TOO_MANY", "errInvestorTooMany"],
];

/** Turns any thrown value into a short message we can show a user. */
export function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as { message?: string; error_description?: string; code?: string };
  // Postgres unique_violation on the one-phone-one-account constraint -
  // surface a friendly bilingual message instead of the raw SQL error.
  if (e.code === "23505" && e.message?.includes("profile_contacts_phone_unique")) {
    return translateStatic("phoneAlreadyRegistered");
  }
  // Supabase Auth's one-account-per-email guard (password signup on an
  // email that already has an account, Google or otherwise).
  if (
    e.code === "user_already_exists" ||
    /already registered|already exists/i.test(e.message || "")
  ) {
    return translateStatic("emailAlreadyRegistered");
  }
  // A stale, reused, or mistyped OTP - the code path, not the email/password one.
  if (
    e.code === "otp_expired" ||
    /otp.*expired|token has expired|invalid.*(otp|token)/i.test(e.message || "")
  ) {
    return translateStatic("invalidOrExpiredCode");
  }
  // Wrong email/password - Supabase's own wording ("Invalid login credentials")
  // reads like a system message, not something aimed at the person typing it.
  if (e.code === "invalid_credentials" || /invalid login credentials/i.test(e.message || "")) {
    return translateStatic("incorrectCredentials");
  }
  // Payment details and Duleko's fees (5600_payment_details_and_fees.sql).
  const message = e.message || "";
  if (message.includes("PAYMENT_METHOD_LIMIT")) return translateStatic("errPaymentLimit");
  if (message.includes("FEES_OVERDUE")) return translateStatic("errFeesOverdue");
  if (message.includes("FEE_NOTHING_TO_PAY")) return translateStatic("errFeeNothing");
  if (message.includes("FEE_ACCOUNT_REQUIRED")) return translateStatic("errFeeAccount");
  if (message.includes("ADMIN_ONLY")) return translateStatic("errAdminOnly");
  if (message.includes("FEE_PAYMENT_TOO_MUCH")) {
    const most = Number((error as { details?: string }).details);
    return translateStatic("errFeeTooMuch").replace("{amount}", Number.isFinite(most) ? `Rs ${most.toLocaleString("en-IN")}` : "");
  }
  if (message.includes("payment_methods_wallet_id_check")) return translateStatic("payBadWallet");
  if (message.includes("payment_methods_account_number_check")) return translateStatic("payBadNumber");
  // The job board (5800_job_board.sql).
  const jobError = JOB_ERRORS.find(([code]) => message.includes(code));
  if (jobError) return translateStatic(jobError[1]);
  const kycError = KYC_ERRORS.find(([code]) => message.includes(code));
  if (kycError) return translateStatic(kycError[1]);
  // The resend/reset-code cooldown Supabase enforces server-side.
  if (e.code === "over_email_send_rate_limit" || /security purposes.*after \d+ seconds/i.test(e.message || "")) {
    return translateStatic("pleaseWaitBeforeRetry");
  }
  return e.error_description || e.message || "Something went wrong. Please try again.";
}
