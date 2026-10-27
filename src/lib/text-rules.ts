import { useI18n, type StringKey } from "./i18n";

/**
 * No phone numbers or emojis in what people write for others to read:
 * names, bios, skills, job posts, offers, work requests and reviews
 * (migration 8200 enforces the same rules in the database).
 */

/** 9+ digits in a row, Latin or Nepali, with spaces, dots, dashes, slashes, brackets or + between. */
const PHONE = /[0-9०-९](?:[\s().+/-]*[0-9०-९]){8,}/;

/** The emoji and pictograph blocks, symbols and dingbats, the emoji variation selector and keycap mark. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;

/** What's wrong with a piece of text, as the message to show, or undefined when it's fine. */
export function textRuleKey(text: string | null | undefined): StringKey | undefined {
  if (!text) return undefined;
  if (PHONE.test(text)) return "errTextHasPhone";
  if (EMOJI.test(text)) return "errTextHasEmoji";
  return undefined;
}

/** The message for the first of these texts that breaks a rule. */
export function firstTextRuleKey(...texts: (string | null | undefined)[]): StringKey | undefined {
  for (const text of texts) {
    const key = textRuleKey(text);
    if (key) return key;
  }
  return undefined;
}

/**
 * For forms: the message for the first text that breaks a rule, in the
 * reader's language, or undefined. Shown under the field as people type.
 */
export function useTextRule(): (...texts: (string | null | undefined)[]) => string | undefined {
  const { t } = useI18n();
  return (...texts) => {
    const key = firstTextRuleKey(...texts);
    return key ? t(key) : undefined;
  };
}
