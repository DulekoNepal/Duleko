import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A row of single-digit boxes for an email code or a PIN - typing, pasting
 * the whole code at once, and backspacing all move focus the way a phone
 * keyboard's own OTP autofill expects. Six digits by default, to match
 * Supabase's own email OTP length - not something we choose, it's what
 * `{{ .Token }}` in the auth email templates actually renders.
 * `masked` hides the digits, for a PIN.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
  masked,
  id,
  label = "Verification code",
  digitLabel = (n) => `Digit ${n}`,
  className,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  masked?: boolean;
  /** Goes on the first box, so a <label htmlFor> focuses it. */
  id?: string;
  label?: string;
  digitLabel?: (n: number) => string;
  className?: string;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function setAt(index: number, digit: string) {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit;
    onChange(chars.join("").trimEnd());
  }

  function handleChange(index: number, raw: string) {
    let digits = raw.replace(/\D/g, "");
    if (!digits) {
      setAt(index, "");
      return;
    }
    // Typing into a box that already holds a digit: keep the new one, not
    // both - two digits in one box would otherwise read as a paste below.
    const current = value[index]?.trim();
    if (digits.length === 2 && current) digits = digits[0] === current ? digits[1] : digits[0];
    // A pasted code lands in whichever box was focused - spread it across
    // the rest instead of leaving it stuck in one square.
    if (digits.length > 1) {
      onChange(digits.slice(0, length));
      inputs.current[Math.min(digits.length, length) - 1]?.focus();
      return;
    }
    setAt(index, digits);
    if (index < length - 1) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index]?.trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <div className={cn("flex justify-center gap-2", className)} role="group" aria-label={label}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          id={i === 0 ? id : undefined}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={masked ? "off" : i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={digitLabel(i + 1)}
          className={cn(
            "h-12 w-10 rounded-xl border border-slate-300 bg-surface text-center text-lg font-semibold text-slate-900",
            "transition-colors duration-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          )}
        />
      ))}
    </div>
  );
}
