import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A row of single-digit boxes for a 6-digit email code - typing, pasting
 * the whole code at once, and backspacing all move focus the way a phone
 * keyboard's own OTP autofill expects.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function setAt(index: number, digit: string) {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit;
    onChange(chars.join("").trimEnd());
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setAt(index, "");
      return;
    }
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
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Verification code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-12 w-10 rounded-xl border border-slate-300 text-center text-lg font-semibold text-slate-900",
            "transition-colors duration-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
          )}
        />
      ))}
    </div>
  );
}
