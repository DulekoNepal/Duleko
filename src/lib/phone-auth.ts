import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Signing in with a Nepali mobile number and a PIN (migration 6000).
 * Supabase Auth's phone provider does the work, with phone confirmations
 * off, so there is no SMS code yet.
 */

/** New PINs (migration 8100), checked by the account-auth function. */
export const PIN_LENGTH = 4;
/** PINs made before 8100, which are still the account's Supabase password. */
export const OLD_PIN_LENGTH = 6;

/**
 * An old 6-digit PIN is the account's Supabase password, with a fixed
 * wrapper so it meets any password-strength rule the project sets for
 * email accounts. It adds no secrecy (this repo is public); the 6 digits
 * are the secret. Never change it: those accounts' passwords depend on
 * it, and staff resets in the SQL editor use the same wrapper (see 6000).
 * 4-digit PINs never touch it (see account-auth.ts).
 */
export function pinToPassword(pin: string): string {
  return `Duleko-PIN-${pin}`;
}

/** 98XXXXXXXX from whatever was typed: spaces, dashes, a +977 in front. */
export function localMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("977") ? digits.slice(3) : digits;
}

/** A mobile number only (NTC, Ncell, Smart): one that can get an SMS code later. */
export function isNepaliMobile(input: string): boolean {
  return /^9[678]\d{8}$/.test(localMobile(input));
}

/** The form Supabase Auth wants: +97798XXXXXXXX. */
export function authPhone(input: string): string {
  return `+977${localMobile(input)}`;
}

/** Easy to guess: one digit repeated, a straight run up or down, or 123123-style repeats. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const steps = pin
    .split("")
    .slice(1)
    .map((d, i) => Number(d) - Number(pin[i]));
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return true;
  const half = pin.slice(0, pin.length / 2);
  return pin === half + half;
}

/**
 * The mobile number this account signs in with, or null for an email or
 * Google account. A restored session doesn't always carry `identities`,
 * so app_metadata is checked as well.
 */
export function signInMobile(user: User | null | undefined): string | null {
  if (!user?.phone) return null;
  const providers = [
    ...(user.identities?.map((i) => i.provider) ?? []),
    ...((user.app_metadata?.providers as string[] | undefined) ?? []),
    user.app_metadata?.provider,
  ];
  return providers.includes("phone") ? localMobile(user.phone) : null;
}

/** True when the number is already on any Duleko account, phone or contact. */
export async function phoneAccountExists(input: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("phone_account_exists", { p_phone: localMobile(input) });
  if (error) throw error;
  return Boolean(data);
}
