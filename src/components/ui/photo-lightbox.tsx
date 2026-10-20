import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * One photo, full screen on black - a profile picture or a cover, opened
 * by tapping it. Closes on the ✕, a tap outside the picture, Escape, or
 * the phone's Back button (it adds a history step, so Back closes it
 * rather than leaving the profile).
 */
export function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Back closes the photo instead of the page.
    window.history.pushState({ ...window.history.state, lightbox: true }, "");
    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      onClose();
    };
    function close() {
      window.history.back();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = previousOverflow;
      // Closed some other way (✕, a tap): take back the step we added.
      if (!closedByBack && window.history.state?.lightbox) window.history.back();
    };
    // Only when the photo itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-3 pb-[calc(0.75rem+var(--sab))] pt-[calc(3.5rem+var(--sat))]"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="animate-in-up max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        // A tap on the photo itself keeps it open.
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-3 top-[calc(0.75rem+var(--sat))] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>,
    document.body,
  );
}
