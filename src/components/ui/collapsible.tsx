import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A collapsed-by-default section inside a Card. Used to keep the profile
 * screen compact — tap the header to expand, tap again to collapse.
 */
export function Collapsible({
  title,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between gap-3 py-1 text-left"
        >
          <span className="text-base font-semibold text-slate-900">{title}</span>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {action}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
