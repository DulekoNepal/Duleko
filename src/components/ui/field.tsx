import { cloneElement, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-slate-700", className)} {...props} />;
}

const controlClasses =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 transition-colors duration-200 " +
  "placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/25 " +
  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClasses, "h-11", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlClasses, "min-h-30 resize-y", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlClasses, "h-11 pr-8", className)} {...props}>
        {children}
      </select>
    );
  },
);

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ id?: string }>;
  className?: string;
}

/** Label + control + hint/error, wired up with a generated id. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  const control = cloneElement(children, { id });
  return (
    <div className={cn("mb-4", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      {control}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
