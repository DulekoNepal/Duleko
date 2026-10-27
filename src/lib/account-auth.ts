import { supabase } from "./supabase";
import { translateStatic, type StringKey } from "./i18n";
import { localMobile } from "./phone-auth";

/**
 * 4-digit email codes and 4-digit PINs, through the `account-auth` edge
 * function (migration 8100). Each helper either finishes its job - often
 * signing the person in - or throws an AccountAuthError whose message is
 * already in their language.
 */

export class AccountAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The function's answer codes, in the person's words. */
const MESSAGES: Record<string, StringKey> = {
  bad_email: "authEmailInvalid",
  email_taken: "authEmailTaken",
  no_account: "authNoAccount",
  too_soon: "authCodeTooSoon",
  too_many: "authCodeTooMany",
  busy: "authEmailBusy",
  email_limit: "authEmailLimit",
  email_failed: "authEmailFailed",
  code_wrong: "authCodeWrong",
  code_expired: "authCodeExpired",
  code_locked: "authCodeLocked",
  bad_phone: "authPhoneInvalid",
  phone_taken: "authPhoneTaken",
  bad_pin: "authPinIncomplete",
  weak_pin: "authPinWeak",
  pin_wrong: "authWrongPhoneOrPin",
  pin_locked: "authPinLocked",
  no_pin: "wrongPin",
  signed_out: "somethingWrong",
};

type Answer = Record<string, unknown> & { error?: string };

async function call(action: string, fields: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke<Answer>("account-auth", {
    body: { action, ...fields },
  });
  if (error || !data) throw new AccountAuthError("server", translateStatic("somethingWrong"));
  if (data.error) {
    let message = translateStatic(MESSAGES[data.error] ?? "somethingWrong");
    for (const [key, value] of Object.entries(data)) message = message.replace(`{${key}}`, String(value));
    // "{left} tries left" with no count to show reads as a typo.
    if (data.error === "code_wrong" && data.left === undefined) message = translateStatic("invalidOrExpiredCode");
    throw new AccountAuthError(data.error, message);
  }
  return data;
}

/** Signs in with whatever the function handed back. */
async function finishSignIn(answer: Answer): Promise<void> {
  if (typeof answer.token_hash === "string") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: answer.token_hash, type: "magiclink" });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({
    phone: String(answer.phone),
    password: String(answer.password),
  });
  if (error) throw error;
}

export async function sendEmailCode(email: string, purpose: "signup" | "reset", lang: "en" | "ne"): Promise<void> {
  await call("email_code_send", { email: email.trim(), purpose, lang });
}

/** The right code signs them in; the app then asks for a password. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  await finishSignIn(await call("email_code_verify", { email: email.trim(), code }));
}

export async function pinSignUp(phone: string, pin: string): Promise<void> {
  await finishSignIn(await call("pin_sign_up", { phone: localMobile(phone), pin }));
}

export async function pinSignIn(phone: string, pin: string): Promise<void> {
  await finishSignIn(await call("pin_sign_in", { phone: localMobile(phone), pin }));
}

/** Confirms the signed-in person's 4-digit PIN (wrong tries count towards the lock). */
export async function checkMyPin(pin: string): Promise<void> {
  await call("pin_check", { pin });
}

/**
 * Settings: a new PIN. `currentPin` for an account that has one already
 * (4 or old 6 digits); `phone` when an email or Google account adds one.
 */
export async function setMyPin(input: { pin: string; currentPin?: string; phone?: string }): Promise<void> {
  await call("pin_set", {
    pin: input.pin,
    current_pin: input.currentPin,
    phone: input.phone ? localMobile(input.phone) : undefined,
  });
}

/** 4, 6 (an older PIN), or null when no account signs in with this number. */
export async function phonePinLength(phone: string): Promise<4 | 6 | null> {
  const { data, error } = await supabase.rpc("phone_pin_length", { p_phone: localMobile(phone) });
  if (error) throw error;
  return data === 4 || data === 6 ? data : null;
}

export interface MyPin {
  /** 98XXXXXXXX */
  phone: string;
  length: 4 | 6;
}

/** The number + PIN this account can sign in with, if it has one. */
export async function getMyPin(): Promise<MyPin | null> {
  const { data, error } = await supabase.rpc("my_pin");
  if (error) throw error;
  return data ? (data as MyPin) : null;
}
