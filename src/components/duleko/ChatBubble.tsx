import { useRef, useState } from "react";
import { CornerUpLeft, MoreHorizontal, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { withinEditWindow } from "@/lib/queries";
import { cn, relativeTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

/** The row shown first - the six people actually reach for. */
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

/** The full palette behind the "+", one tap away. */
export const ALL_REACTIONS = [
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
  "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤗",
  "😮", "😯", "🤯", "😱", "🥺", "😢", "😭", "😔",
  "😡", "🤬", "😤", "🙄", "😴", "🤔", "🤝", "🙏",
  "👍", "👎", "👏", "🙌", "💪", "✌️", "🤞", "👌",
  "🔥", "✨", "🎉", "💯", "✅", "❌", "⭐", "💰",
];

export type BubblePanel = "menu" | "emoji" | "unsend";

interface ChatBubbleProps {
  message: ChatMessage;
  mine: boolean;
  myProfileId: string;
  otherName: string;
  /** Which popover is open on this message, if any. */
  panel: BubblePanel | null;
  onPanel: (panel: BubblePanel | null) => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onUnsend: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onJumpTo: (messageId: string) => void;
  /** Briefly ringed after jumping to it from a reply stub. */
  highlighted: boolean;
}

// Drag further than this and releasing fires a reply.
const SWIPE_TRIGGER_PX = 48;
const SWIPE_MAX_PX = 76;
// Below this the gesture is still ambiguous, so vertical scrolling wins.
const SWIPE_DECIDE_PX = 8;

export function ChatBubble({
  message: m,
  mine,
  myProfileId,
  otherName,
  panel,
  onPanel,
  onReply,
  onEdit,
  onUnsend,
  onReact,
  onJumpTo,
  highlighted,
}: ChatBubbleProps) {
  const { t, lang } = useI18n();
  const [dragX, setDragX] = useState(0);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");

  const removed = Boolean(m.deleted_at);
  const canEdit = mine && !removed && withinEditWindow(m.created_at);

  // Messenger's directions: your own messages drag left, theirs drag
  // right - both toward the middle of the screen.
  const swipeSign = mine ? -1 : 1;

  function onPointerDown(e: React.PointerEvent) {
    if (removed || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = "undecided";
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < SWIPE_DECIDE_PX && Math.abs(dy) < SWIPE_DECIDE_PX) return;
      // Let the list scroll if the finger is mostly going up or down.
      axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.current !== "horizontal") return;

    // Only toward the middle, and with a hard stop so it feels anchored.
    const travel = dx * swipeSign;
    setDragX(travel <= 0 ? 0 : Math.min(travel, SWIPE_MAX_PX) * swipeSign);
  }

  function onPointerUp() {
    if (Math.abs(dragX) >= SWIPE_TRIGGER_PX) onReply(m);
    start.current = null;
    axis.current = "undecided";
    setDragX(0);
  }

  function closePanels() {
    setShowAllEmojis(false);
    onPanel(null);
  }

  function react(emoji: string) {
    onReact(m, emoji);
    closePanels();
  }

  const reactions = groupReactions(m, myProfileId);
  const quoted = m.reply_to;

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {quoted && (
        <button
          type="button"
          onClick={() => onJumpTo(quoted.id)}
          className={cn(
            "mb-0.5 max-w-[78%] truncate rounded-t-xl border-l-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-left text-xs text-slate-500",
            mine && "border-l-0 border-r-2 text-right",
          )}
        >
          <span className="font-medium text-slate-600">
            {quoted.sender_profile_id === myProfileId ? t("youLabel") : otherName}
          </span>
          {" · "}
          {quoted.deleted_at ? t("messageRemoved") : quoted.body}
        </button>
      )}

      <div
        className="relative flex w-full items-center gap-1"
        style={{
          justifyContent: mine ? "flex-end" : "flex-start",
          transform: `translateX(${dragX}px)`,
          transition: dragX === 0 ? "transform 160ms ease-out" : undefined,
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* The arrow that slides in from behind as the bubble is dragged. */}
        {Math.abs(dragX) > 4 && (
          <CornerUpLeft
            className={cn(
              "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
              mine ? "right-0" : "left-0",
            )}
            style={{ opacity: Math.min(Math.abs(dragX) / SWIPE_TRIGGER_PX, 1) }}
            aria-hidden
          />
        )}

        {mine && !removed && <MenuButton onClick={() => onPanel(panel ? null : "menu")} label={t("messageActions")} />}

        <div
          id={`msg-${m.id}`}
          className={cn(
            "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
            removed
              ? "bg-slate-50 italic text-slate-400"
              : mine
                ? "bg-brand-700 text-white"
                : "bg-slate-100 text-slate-900",
            highlighted && "ring-2 ring-brand-400 ring-offset-1",
          )}
        >
          {removed ? t("messageRemoved") : m.body}
        </div>

        {!mine && !removed && <MenuButton onClick={() => onPanel(panel ? null : "menu")} label={t("messageActions")} />}
      </div>

      <p className={cn("mt-0.5 px-1 text-[10px] text-slate-400", mine ? "text-right" : "text-left")}>
        {relativeTime(m.created_at, lang)}
        {m.edited_at && !removed && ` · ${t("edited")}`}
      </p>

      {reactions.length > 0 && (
        <div className="-mt-0.5 mb-1 flex flex-wrap gap-1">
          {reactions.map(([emoji, { count, mine: myReaction }]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(m, emoji)}
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-xs transition-colors duration-200",
                myReaction ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white",
              )}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {panel === "menu" && (
        <div className="mb-1 flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <MenuItem icon={SmilePlus} label={t("react")} onClick={() => onPanel("emoji")} />
          <MenuItem icon={CornerUpLeft} label={t("reply")} onClick={() => { onReply(m); closePanels(); }} />
          {canEdit && <MenuItem icon={Pencil} label={t("edit")} onClick={() => { onEdit(m); closePanels(); }} />}
          {mine && (
            <MenuItem icon={Trash2} label={t("unsend")} destructive onClick={() => onPanel("unsend")} />
          )}
        </div>
      )}

      {panel === "emoji" && (
        <div className="mb-1 w-[min(20rem,85vw)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <div className="flex items-center gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                className="rounded-lg px-1.5 py-1 text-lg transition-colors duration-200 hover:bg-slate-100"
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAllEmojis((v) => !v)}
              aria-expanded={showAllEmojis}
              className="ml-auto rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100"
            >
              {showAllEmojis ? "−" : "+"}
            </button>
          </div>
          {showAllEmojis && (
            <div className="mt-1 grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto border-t border-slate-100 pt-1.5">
              {ALL_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className="rounded-lg py-1 text-lg transition-colors duration-200 hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === "unsend" && (
        <div className="mb-1 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 shadow-sm">
          <span className="text-xs text-red-800">{t("unsendConfirm")}</span>
          <button
            type="button"
            onClick={() => onUnsend(m)}
            className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors duration-200 hover:bg-red-700"
          >
            {t("unsend")}
          </button>
          <button
            type="button"
            onClick={closePanels}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100"
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-full p-1 text-slate-400 opacity-60 transition-opacity duration-200 hover:bg-slate-100 hover:opacity-100 focus-visible:opacity-100"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden />
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-200",
        destructive ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

/** One row per distinct emoji, with a count and whether it includes mine. */
function groupReactions(m: ChatMessage, myProfileId: string) {
  const byEmoji = new Map<string, { count: number; mine: boolean }>();
  for (const r of m.message_reactions) {
    const entry = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.profile_id === myProfileId) entry.mine = true;
    byEmoji.set(r.emoji, entry);
  }
  return [...byEmoji.entries()];
}
