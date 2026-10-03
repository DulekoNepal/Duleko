import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ImagePlus, Info, Pin, X } from "lucide-react";
import { VerifiedBadge } from "@/components/duleko/VerifiedBadge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Label, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { MAX_PHOTO_INPUT_BYTES } from "@/lib/image";
import { publishNotice } from "@/lib/queries";
import { errorMessage } from "@/lib/supabase";
import { cn, relativeTime } from "@/lib/utils";
import type { Notice } from "@/lib/types";

/**
 * The notice board's building blocks: the card on the board, the compact
 * row on Home, who posted it, and the staff-only form to post one.
 */

const LINK_RE = /(https?:\/\/[^\s<>"')\]]+)/i;

/**
 * Notice text with its web links made tappable. Only staff can post a
 * notice, so unlike text from members, a link in one is trusted.
 */
export function NoticeText({ text, className }: { text: string; className?: string }) {
  // split() with a capture group keeps the links, at every odd index.
  const parts = text.split(LINK_RE);
  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        // Trailing punctuation belongs to the sentence, not the address.
        const href = part.replace(/[.,;:!?]+$/, "");
        return (
          <span key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              {href}
            </a>
            {part.slice(href.length)}
          </span>
        );
      })}
    </p>
  );
}

/** Who posted it and when - the staff badge says it is official. */
export function NoticeByline({ notice, avatarSize = 24 }: { notice: Notice; avatarSize?: number }) {
  const { t, lang } = useI18n();
  const name = notice.author?.full_name ?? t("dulekoTeam");
  return (
    <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
      <Avatar name={name} src={notice.author?.avatar_url} size={avatarSize} />
      <span className="flex min-w-0 items-center gap-1 font-medium text-slate-700">
        <span className="truncate">{name}</span>
        <VerifiedBadge staffRole={notice.author?.staff_role} size={13} />
      </span>
      <span aria-hidden className="text-slate-300">
        ·
      </span>
      <span className="shrink-0">{relativeTime(notice.created_at, lang)}</span>
    </span>
  );
}

/** One notice on the board. The whole card opens it. */
export function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <Link
      to="/notices/$noticeId"
      params={{ noticeId: notice.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* Cropped to one shape so the board lines up; the notice itself
          shows the whole image. */}
      {notice.image_url && (
        <img
          src={notice.image_url}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full border-b border-slate-100 bg-slate-100 object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-3.5">
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-brand-800">
          {notice.title}
        </h2>
        {/* Line breaks fold into spaces here: a blank line would spend one
            of the three preview lines on nothing. The notice keeps them. */}
        {notice.body && <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-slate-600">{notice.body}</p>}
        <div className="mt-auto pt-3">
          <NoticeByline notice={notice} />
        </div>
      </div>
    </Link>
  );
}

/** The latest notice as one compact row - Home's window onto the board. */
export function NoticeRow({ notice }: { notice: Notice }) {
  const { lang } = useI18n();
  return (
    <Link
      to="/notices/$noticeId"
      params={{ noticeId: notice.id }}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-2.5 shadow-sm transition-colors duration-200 hover:border-brand-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {notice.image_url ? (
        <img src={notice.image_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Pin className="h-5 w-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{notice.title}</span>
        {notice.body && <span className="block truncate text-xs text-slate-500">{notice.body}</span>}
        <span className="mt-0.5 block text-[11px] text-slate-400">{relativeTime(notice.created_at, lang)}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

const NOTICE_IMAGE_TYPES = ["image/jpeg", "image/png"];

/**
 * Staff-only: write and publish a notice. Mount it only while open, so
 * every new notice starts from an empty form. RLS refuses anyone else,
 * whatever this form does.
 */
export function NoticeComposer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user, profile } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const publish = useMutation({
    mutationFn: () => publishNotice(user!.id, profile!.id, { title, body, image }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast(t("noticePublished"));
      onClose();
    },
    onError: (error) => toast(errorMessage(error), "error"),
  });

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (!NOTICE_IMAGE_TYPES.includes(file.type)) {
      toast(t("noticeImageType"), "error");
      return;
    }
    if (file.size > MAX_PHOTO_INPUT_BYTES) {
      toast(t("photoTooBig"), "error");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit() {
    if (title.trim().length < 3) {
      setTitleError(t("noticeTitleTooShort"));
      return;
    }
    publish.mutate();
  }

  return (
    <Dialog
      open
      // Closing mid-publish would hide whether it went out.
      onClose={() => !publish.isPending && onClose()}
      title={t("postNotice")}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={publish.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} loading={publish.isPending}>
            {t("publishNotice")}
          </Button>
        </>
      }
    >
      <Field label={t("noticeTitle")} error={titleError}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError(undefined);
          }}
          placeholder={t("noticeTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={`${t("noticeText")} (${t("optional")})`}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("noticeTextPlaceholder")}
          rows={5}
          maxLength={3000}
        />
      </Field>

      <div className="mb-3.5">
        <Label>{`${t("noticeImage")} (${t("optional")})`}</Label>
        {preview ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={preview} alt="" className="max-h-64 w-full object-contain" />
            <button
              type="button"
              onClick={clearImage}
              aria-label={t("noticeRemoveImage")}
              title={t("noticeRemoveImage")}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-slate-700 shadow ring-1 ring-black/5 transition-colors hover:bg-surface"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-5 text-sm font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            {t("noticeAddImage")}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={NOTICE_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => chooseImage(e.target.files?.[0])}
        />
      </div>

      <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <Info className="mt-px h-4 w-4 shrink-0" aria-hidden />
        {t("noticeGoesToEveryone")}
      </p>
    </Dialog>
  );
}
