import { useId } from "react";
import { Label } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { useI18n } from "@/lib/i18n";
import { PIN_LENGTH } from "@/lib/phone-auth";
import { cn } from "@/lib/utils";

/** A Nepali mobile number, with the +977 already there so nobody types it. */
export function MobileNumberInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  readOnly,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-stretch overflow-hidden rounded-xl border border-slate-300 bg-surface transition-colors duration-200",
        "focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/25",
        (disabled || readOnly) && "bg-slate-100",
      )}
    >
      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium tabular-nums text-slate-600">
        +977
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="98XXXXXXXX"
        // Room for "+977 98X-XXX-XXXX" pasted whole; the digits are trimmed below.
        maxLength={20}
        value={value}
        // Digits only, and a +977 pasted from contacts is dropped.
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits.length > 10 && digits.startsWith("977") ? digits.slice(3) : digits.slice(0, 10));
        }}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-3 tabular-nums tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none",
          (disabled || readOnly) && "text-slate-500",
        )}
      />
    </div>
  );
}

/** Six masked boxes for a PIN, with a label, an optional Show/Hide, and a hint or error. */
export function PinField({
  label,
  value,
  onChange,
  masked,
  onToggleMasked,
  hint,
  error,
  disabled,
  autoFocus,
  action,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  masked: boolean;
  /** Shows the Show/Hide PIN button. */
  onToggleMasked?: () => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Under the boxes, e.g. "Forgot PIN?". */
  action?: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className={cn("mb-3.5", className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0">
          {label}
        </Label>
        {onToggleMasked && (
          <button
            type="button"
            onClick={onToggleMasked}
            className="rounded-md px-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            {masked ? t("authPinShow") : t("authPinHide")}
          </button>
        )}
      </div>
      <OtpInput
        id={id}
        length={PIN_LENGTH}
        value={value}
        onChange={onChange}
        masked={masked}
        disabled={disabled}
        autoFocus={autoFocus}
        label={label}
        digitLabel={(n) => t("authPinDigit", { n })}
        className="justify-between gap-1.5 sm:justify-start sm:gap-2"
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
      {action}
    </div>
  );
}
