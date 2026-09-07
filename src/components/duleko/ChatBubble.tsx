import { useRef, useState } from "react";
import { Copy, CornerUpLeft, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { withinEditWindow } from "@/lib/queries";
import { cn, formatClockTime } from "@/lib/utils";
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
  otherAvatarUrl: string | null;
  /** First of a run from this sender - gets the full top corner. */
  firstInRun: boolean;
  /** Last of a run - gets the timestamp, and their avatar. */
  lastInRun: boolean;
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
const LONG_PRESS_MS = 450;
// A long press that already opened the menu shouldn't be re-toggled by the
// contextmenu event the same gesture fires afterwards.
const SUPPRESS_CONTEXT_MS = 900;
// Popovers open upward unless the message is this close to the top of the
// thread, where there would be nowhere to draw them.
const FLIP_BELOW_PX = 210;

export function ChatBubble({
  message: m,
  mine,
  myProfileId,
  otherName,
  otherAvatarUrl,
  firstInRun,
  lastInRun,
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
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const rowRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Android fires contextmenu at the end of a long press too; without this
  // the press would open the menu and the contextmenu would shut it again.
  const openedAt = useRef(0);

  const removed = Boolean(m.deleted_at);
  const canEdit = mine && !removed && withinEditWindow(m.created_at);

  // Messenger's directions: your own messages drag left, theirs drag
  // right - both toward the middle of the screen.
  const swipeSign = mine ? -1 : 1;

  /** Open a popover on the side where there is actually room for it. */
  function openPanel(next: BubblePanel | null) {
    if (next) {
      const top = rowRef.current?.getBoundingClientRect().top ?? 0;
      setPlacement(top < FLIP_BELOW_PX ? "below" : "above");
      openedAt.current = Date.now();
    } else {
      setShowAllEmojis(false);
    }
    onPanel(next);
  }

  /** Right-click on a mouse, press-and-hold on a phone - no button needed. */
  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (removed) return;
    if (Date.now() - openedAt.current < SUPPRESS_CONTEXT_MS) return;
    openPanel(panel ? null : "menu");
  }

  function cancelLongPress() {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (removed || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = "undecided";
    // Press and hold is how you reach the menu on a phone.
    cancelLongPress();
    longPress.current = setTimeout(() => {
      navigator.vibrate?.(8);
      openPanel("menu");
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < SWIPE_DECIDE_PX && Math.abs(dy) < SWIPE_DECIDE_PX) return;
      cancelLongPress();
      // Let the list scroll if the finger is mostly going up or down.
      axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.current !== "horizontal") return;

    // Only toward the middle, and with a hard stop so it feels anchored.
    const travel = dx * swipeSign;
    setDragX(travel <= 0 ? 0 : Math.min(travel, SWIPE_MAX_PX) * swipeSign);
  }

  function onPointerUp() {
    cancelLongPress();
    if (Math.abs(dragX) >= SWIPE_TRIGGER_PX) onReply(m);
    start.current = null;
    axis.current = "undecided";
    setDragX(0);
  }

  function react(emoji: string) {
    onReact(m, emoji);
    openPanel(null);
  }

  const reactions = groupReactions(m, myProfileId);
  const quoted = m.reply_to;
  const panelSide = cn(
    "absolute z-20",
    placement === "above" ? "bottom-full mb-1" : "top-full mt-1",
    mine ? "right-0" : "left-0",
  );

  return (
    <div
      className={cn(
        "group relative flex flex-col",
        mine ? "items-end" : "items-start",
        // Mid-run messages have no timestamp under them, so they need the
        // gap for an overhanging reaction chip themselves.
        lastInRun ? "mb-1.5" : reactions.length > 0 ? "mb-3.5" : "mb-0.5",
        // Lift the whole row while its popover is open, so the popover sits
        // above neighbouring messages rather than under them.
        panel && "z-30",
      )}
    >
      {quoted && (
        // A faded echo of the message being quoted, so it carries *that*
        // message's colour rather than the colour of the reply sitting on
        // top of it. Which side it hangs on still follows the reply. The
        // negative margin tucks it under the bubble so they read as one.
        <button
          type="button"
          onClick={() => onJumpTo(quoted.id)}
          className={cn(
            "-mb-2 max-w-[70%] truncate rounded-t-xl px-3 pb-3.5 pt-1.5 text-left text-xs",
            // Inset 8px from the bubble's own edge on both sides: theirs
            // also clears the 28px avatar and its 6px gap.
            mine ? "mr-2" : "ml-[2.625rem]",
            quoted.sender_profile_id === myProfileId
              ? "bg-brand-100 text-brand-900/70"
              : "bg-slate-200/80 text-slate-600",
          )}
        >
          {quoted.deleted_at ? t("messageRemoved") : quoted.body}
        </button>
      )}

      <div
        ref={rowRef}
        className="relative flex w-full items-end gap-1.5"
        style={{
          justifyContent: mine ? "flex-end" : "flex-start",
          // Only while actually dragging: any transform makes this row a
          // stacking context, which would trap an open popover behind the
          // messages below it.
          transform: dragX === 0 ? undefined : `translateX(${dragX}px)`,
          transition: dragX === 0 ? "transform 160ms ease-out" : undefined,
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
      >
        {/* Their avatar sits against the last bubble of each run, like
            Messenger; earlier bubbles keep the same indent with a spacer. */}
        {!mine &&
          (lastInRun ? (
            <Avatar name={otherName} src={otherAvatarUrl} size={28} />
          ) : (
            <span className="h-7 w-7 shrink-0" aria-hidden />
          ))}

        {/* The arrow that slides in from behind as the bubble is dragged. */}
        {Math.abs(dragX) > 4 && (
          <CornerUpLeft
            className={cn("absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400", mine ? "right-0" : "left-0")}
            style={{ opacity: Math.min(Math.abs(dragX) / SWIPE_TRIGGER_PX, 1) }}
            aria-hidden
          />
        )}

        <div
          id={`msg-${m.id}`}
          className={cn(
            // Long press is the menu gesture, so text selection has to stay
            // out of its way - Copy in the menu covers what that takes away.
            // Positioned so reactions can hang off its bottom-right corner
            // on both sides of the thread.
            "relative max-w-[76%] select-none whitespace-pre-wrap break-words px-3.5 py-2 text-sm",
            // Rounded on the outside, tightened where a run joins up.
            mine
              ? cn("rounded-2xl", !firstInRun && "rounded-tr-md", !lastInRun && "rounded-br-md")
              : cn("rounded-2xl", !firstInRun && "rounded-tl-md", !lastInRun && "rounded-bl-md"),
            removed
              ? "border border-slate-200 bg-white italic text-slate-400"
              : mine
                ? "bg-brand-700 text-white"
                : "bg-slate-100 text-slate-900",
            highlighted && "ring-2 ring-brand-400 ring-offset-2",
          )}
        >
          {removed ? t("messageRemoved") : m.body}

          {reactions.length > 0 && (
            // Hanging off the bubble's bottom-right corner, anchored to the
            // bubble itself rather than to the column so it lands the same
            // way on incoming and outgoing messages.
            <span className="absolute -bottom-3 right-3 z-10 flex gap-1">
              {reactions.map(([emoji, { count, mine: myReaction }]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(m, emoji)}
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-xs leading-none shadow-sm ring-2 ring-white transition-colors duration-200",
                    myReaction ? "border-brand-300 bg-brand-50 text-slate-900" : "border-slate-200 bg-white text-slate-900",
                  )}
                >
                  {emoji}
                  {count > 1 ? ` ${count}` : ""}
                </button>
              ))}
            </span>
          )}
        </div>

        {panel === "menu" && (
          <div data-chat-popover className={cn(panelSide, "flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg")}>
            <MenuItem icon={SmilePlus} label={t("react")} onClick={() => openPanel("emoji")} />
            <MenuItem icon={CornerUpLeft} label={t("reply")} onClick={() => { onReply(m); openPanel(null); }} />
            <MenuItem
              icon={Copy}
              label={t("copy")}
              onClick={() => {
                void navigator.clipboard?.writeText(m.body);
                openPanel(null);
              }}
            />
            {canEdit && <MenuItem icon={Pencil} label={t("edit")} onClick={() => { onEdit(m); openPanel(null); }} />}
            {mine && <MenuItem icon={Trash2} label={t("unsend")} destructive onClick={() => openPanel("unsend")} />}
          </div>
        )}

        {panel === "emoji" && (
          <div data-chat-popover className={cn(panelSide, "w-[min(19rem,84vw)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg")}>
            <div className="flex items-center gap-0.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className="rounded-lg px-1.5 py-1 text-lg transition-transform duration-150 hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllEmojis((v) => !v)}
                aria-expanded={showAllEmojis}
                aria-label={t("react")}
                className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-200"
              >
                {showAllEmojis ? "−" : "+"}
              </button>
            </div>
            {showAllEmojis && (
              <div className="mt-1.5 grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto border-t border-slate-100 pt-1.5">
                {ALL_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    className="rounded-lg py-1 text-lg transition-transform duration-150 hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {panel === "unsend" && (
          <div data-chat-popover className={cn(panelSide, "flex w-max max-w-[min(20rem,86vw)] flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 shadow-lg")}>
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
              onClick={() => openPanel(null)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-white"
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </div>

      {lastInRun && (
        <p
          className={cn(
            "px-1 text-[11px] text-slate-400",
            // Clear the reaction chip hanging below the bubble.
            reactions.length > 0 ? "mt-3.5" : "mt-1",
            mine ? "text-right" : "ml-9",
          )}
        >
          {formatClockTime(m.created_at, lang)}
          {m.edited_at && !removed && ` · ${t("edited")}`}
        </p>
      )}
    </div>
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-200",
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
