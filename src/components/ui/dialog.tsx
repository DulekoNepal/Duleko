import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A lightweight modal: no dependency, closes on Escape or backdrop click,
 * and renders as a bottom sheet on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Callers pass an inline arrow for onClose, so its identity changes on
  // every render of the parent. Keeping it in a ref keeps it out of the
  // effect's dependencies: with it in there, every keystroke in a field
  // inside the dialog re-ran the whole effect, and the focus handling
  // below would yank the caret out of the field and onto the ✕ button
  // after a single character.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Send focus into the dialog, and put it back where it was on close -
    // otherwise a keyboard user lands back at the top of the page. A field
    // wins over a button, so a dialog that asks for something lands ready
    // to type in rather than on its close button.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const field = panel?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])");
    (field ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Trap Tab inside the panel: wrap around at either end.
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
    // Deliberately only `open`: see the ref above.
  }, [open]);

  if (!open) return null;

  // Portalled to the body, not rendered wherever the JSX happens to sit.
  // A card that opens one of these is often itself `interactive` - hover
  // lift, overflow-hidden, the works - and once that card is under a
  // full-screen dialog, the pointer is technically still "over" it. A
  // dialog nested inside such a card inherits its hover transform, which
  // creates a new containing block for this panel's `fixed` positioning
  // and traps the whole dialog inside the card's own clipped box instead
  // of covering the screen. Escaping to the body side-steps the ancestor
  // entirely, the way an overlay like this should behave regardless of
  // where it's opened from.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl",
          "sm:max-w-lg sm:rounded-2xl",
          className,
        )}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn("px-4 pt-4", footer ? "pb-4" : "pb-[calc(1rem+env(safe-area-inset-bottom))]")}>
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
