import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { SkillTile } from "@/components/duleko/SkillIcon";
import { VerifiedBadge, verificationTier, type VerificationTier } from "@/components/duleko/VerifiedBadge";
import { DulekoCover } from "./DulekoCover";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/components/ui/photo-lightbox";
import { useI18n } from "@/lib/i18n";
import type { AvailabilityDay, Certificate, Profile, Skill, UserSkillDetail } from "@/lib/types";
import { cn, formatDate, formatMoney, formatNumber, locationShort, skillName } from "@/lib/utils";

/**
 * The pieces both profile pages are built from - your own (/profile) and
 * someone else's (/worker/...) - so the two always look like one design:
 * the header card, its numbers and status, the pinned tab bar, and the
 * section contents.
 */

// ---------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------

/** The header card. Edge to edge on a phone, a card from sm up. */
export function HeroCard({ lifted = false, children }: { lifted?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "@container animate-in-up relative -mx-4 -mt-3 border-b border-slate-200 bg-surface sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border sm:shadow-sm",
        // Lifted only while a menu in it is open, so the menu can spill
        // over the tab bar below - the pinned bar passes over it otherwise.
        lifted && "z-[25]",
      )}
    >
      {children}
    </section>
  );
}

/**
 * The cover: Duleko's own artwork for everyone (see DulekoCover), showing
 * how far Duleko has checked the person and the tools of their skills.
 * Its badge pill and skills open whatever `onBadge` and `onSkill` lead to.
 */
export function HeroCover({
  person,
  skills,
  onBadge,
  onSkill,
}: {
  person: Pick<Profile, "is_verified" | "verified_skill_ids" | "staff_role" | "staff_title_en" | "staff_title_ne">;
  /** Their skills in profile order - the cover follows them (see DulekoCover). */
  skills: Skill[];
  onBadge?: () => void;
  onSkill?: (skillId: string) => void;
}) {
  const { lang } = useI18n();
  const tier = verificationTier(person);
  const role = lang === "ne" ? (person.staff_title_ne ?? person.staff_title_en) : person.staff_title_en;
  return (
    <DulekoCover
      tier={tier}
      skills={skills}
      verifiedSkillIds={person.verified_skill_ids}
      roleTitle={role}
      onBadge={onBadge}
      onSkill={onSkill}
      className="h-28 sm:rounded-t-3xl @md:h-36 @2xl:h-44 @4xl:h-52"
    />
  );
}

/** Everything under the cover. */
export function HeroBody({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-4 @2xl:px-6 @2xl:pb-5">{children}</div>;
}

/**
 * The photo pulled up into the cover, with whatever sits on its corner (a
 * camera button on your own, the online dot on someone else's), and the
 * actions using the room beside it.
 */
/** The ring around the profile photo: mild green, mild orange, both for staff. */
const PHOTO_RING: Record<VerificationTier, React.CSSProperties> = {
  staff: { background: "conic-gradient(#86efac, #fdba74, #86efac, #fdba74, #86efac)" },
  full: { background: "#86efac" },
  half: { background: "#fdba74" },
  none: {},
};

export function HeroTopRow({
  name,
  src,
  tier = "none",
  badge,
  actions,
}: {
  name: string;
  src?: string | null;
  tier?: VerificationTier;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const avatar = <Avatar name={name} src={src} size={112} className="h-22! w-22! @2xl:h-30! @2xl:w-30!" />;
  return (
    <div className="flex items-start justify-between gap-3">
      <div
        className={cn(
          "relative -mt-12 shrink-0 rounded-full bg-surface shadow-md @2xl:-mt-16",
          // A ring draws outside its element, so the white gap takes the
          // inner half of the padding and the colour shows in the outer half.
          tier === "none" ? "p-1" : "p-1.5 [&>*:first-child]:ring-[3px] [&>*:first-child]:ring-surface",
        )}
        style={PHOTO_RING[tier]}
      >
        {/* A real photo opens full screen, for anyone; initials have nothing to show. */}
        {src ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("viewProfilePhoto", { name })}
            className="block cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
        {badge}
      </div>
      {actions}
      <PhotoLightbox src={open ? (src ?? null) : null} alt={t("viewProfilePhoto", { name })} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Name and badge, headline, then where they are and when they joined. */
export function HeroIdentity({
  person,
}: {
  person: Pick<
    Profile,
    | "full_name"
    | "bio"
    | "staff_role"
    | "is_verified"
    | "verified_skill_ids"
    | "created_at"
    | "province"
    | "district"
    | "municipality"
    | "ward"
    | "locality"
  >;
}) {
  const { t, lang } = useI18n();
  const place = locationShort(person, lang);
  return (
    <div className="mt-3">
      {/* Wraps rather than truncates - a name is never cut short. */}
      <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold leading-tight tracking-tight text-slate-900 @2xl:text-2xl">
        <span className="min-w-0 break-words">{person.full_name}</span>
        <VerifiedBadge
          staffRole={person.staff_role}
          verified={person.is_verified}
          skillVerified={person.verified_skill_ids.length > 0}
          size={22}
        />
      </h2>
      {person.bio && <p className="mt-1 text-[15px] leading-snug text-slate-700">{person.bio}</p>}
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
        <li className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className={cn("min-w-0", !place && "italic")}>{place || t("profileNoPlace")}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {t("profileJoined", { date: formatDate(person.created_at.slice(0, 10), lang) })}
        </li>
      </ul>
    </div>
  );
}

export interface StatItem {
  label: string;
  value: string;
  star?: boolean;
  onClick?: () => void;
}

/** The four numbers - each one a shortcut to where it comes from. */
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <ul className="grid grid-cols-4 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50/70">
      {items.map(({ label, value, star, onClick }) => (
        <li key={label} className="min-w-0">
          <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className="flex h-full w-full flex-col items-center justify-center px-1 py-2.5 transition-colors enabled:hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 [li:first-child>&]:rounded-l-2xl [li:last-child>&]:rounded-r-2xl"
          >
            <span className="flex items-center gap-1 text-base font-bold tabular-nums leading-tight text-slate-900">
              {star && <Star className="h-3.5 w-3.5 fill-sun-400 text-sun-400" aria-hidden />}
              {value}
            </span>
            <span className="mt-0.5 max-w-full truncate text-[11px] font-medium text-slate-500">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Taking work or not: green with a live dot when on. `children` sits on the right (your own switch). */
export function StatusStrip({
  on,
  title,
  hint,
  children,
}: {
  on: boolean;
  title: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ring-1 ring-inset transition-colors duration-300",
        on ? "bg-brand-50 ring-brand-200" : "bg-slate-50 ring-slate-200",
      )}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
        {on && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", on ? "bg-brand-500" : "bg-slate-400")} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", on ? "text-brand-900" : "text-slate-800")}>{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/** Numbers beside the status from @3xl, stacked on a phone. */
export function HeroSummary({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 grid grid-cols-1 gap-2.5 @3xl:grid-cols-2">{children}</div>;
}

// ---------------------------------------------------------------------
// The pinned tab bar
// ---------------------------------------------------------------------

/**
 * Switching tabs while scrolled down brings the new tab in from its top,
 * with the bar still pinned, instead of landing halfway down it. Call
 * `willSwitch()` before changing the tab.
 */
export function useStickyTabs(tab: string) {
  const barRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    const bar = barRef.current;
    const anchor = anchorRef.current;
    if (!bar || !anchor) return;
    const pinnedAt = parseFloat(getComputedStyle(bar).top) || 0;
    const top = anchor.getBoundingClientRect().top + window.scrollY - pinnedAt;
    if (window.scrollY > top) window.scrollTo({ top });
  }, [tab]);

  return {
    barRef,
    anchorRef,
    willSwitch: () => {
      pending.current = true;
    },
  };
}

export type StickyTabs = ReturnType<typeof useStickyTabs>;

/**
 * The tab row, pinned under the top bar while the page scrolls: 65px is
 * the phone header / tablet bar (64 + its border), 73px the desktop bar.
 */
export function StickyTabBar<T extends string>({
  tabs,
  active,
  onSelect,
  label,
  idPrefix,
  sticky,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
  /** Tabs get `${idPrefix}-tab-${id}`; the panel is `${idPrefix}-panel`. */
  idPrefix: string;
  sticky: StickyTabs;
}) {
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow keys move between tabs, the way a tab row should behave.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const edge = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (!step && edge == null) return;
    e.preventDefault();
    const next = tabs[edge ?? (index + step + tabs.length) % tabs.length];
    buttons.current[next.id]?.focus();
    onSelect(next.id);
  }

  return (
    <>
      <div ref={sticky.anchorRef} aria-hidden />
      <div
        ref={sticky.barRef}
        className="sticky top-[calc(65px+var(--sat))] z-20 -mx-4 bg-cream-50/90 px-4 py-2 backdrop-blur-md md:top-[65px] md:mx-0 md:px-0 lg:top-[73px]"
      >
        <div role="tablist" aria-label={label} className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 md:max-w-xl">
          {tabs.map(({ id, label: tabLabel }, index) => {
            const selected = active === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  buttons.current[id] = el;
                }}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${id}`}
                aria-selected={selected}
                aria-controls={`${idPrefix}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  "min-w-0 truncate rounded-xl py-2 font-semibold transition-all duration-200",
                  // Five tabs on a phone: each as wide as its word, so a long
                  // one isn't cut short to keep them all equal.
                  tabs.length > 4 ? "flex-auto px-1.5 text-[12px] sm:flex-1 sm:px-2 sm:text-[13px]" : "flex-1 px-2 text-[13px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                  selected
                    ? "bg-surface text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-200"
                    : "text-slate-500 hover:bg-surface/60 hover:text-slate-800",
                )}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

/**
 * One column on a phone, in the order the children's `order-*` classes
 * give; two from @3xl, where each ProfileColumn becomes a column of its
 * own and the order resets.
 */
export function ProfileColumns({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4 @3xl:grid @3xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] @3xl:items-start">
      {children}
    </div>
  );
}

export function ProfileColumn({ children }: { children: React.ReactNode }) {
  return <div className="contents @3xl:flex @3xl:min-w-0 @3xl:flex-col @3xl:gap-4">{children}</div>;
}

/** The small "Edit" / "Add" at the right of a section's heading. */
export function SectionAction({ icon: Icon = Pencil, label, onClick }: { icon?: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-my-1.5 h-8 shrink-0 rounded-full px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Button>
  );
}

/** A dashed "nothing here yet - add it" tile, used by every empty section of your own profile. */
export function EmptyPrompt({ icon: Icon, title, hint, onClick }: { icon: LucideIcon; title: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        {hint && <span className="block text-xs leading-snug text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

/** Nothing here yet, on someone else's profile - quiet, not a prompt. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-slate-400">{children}</p>;
}

/** Placeholder rows while a section's rows load. */
export function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-12 rounded-xl" />
      ))}
    </div>
  );
}

/** An intro that folds to a few lines when long; the full text is a tap away. */
export function AboutText({ text }: { text: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 320 || text.split("\n").length > 5;
  return (
    <>
      <p className={cn("whitespace-pre-line text-[15px] leading-7 text-slate-700", long && !expanded && "line-clamp-4")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 text-sm font-semibold text-brand-700 hover:underline"
        >
          {expanded ? t("showLess") : t("seeMore")}
        </button>
      )}
    </>
  );
}

/** One fact in a details list. Use inside a <dl className={FACT_LIST}>. */
export function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

export const FACT_LIST = "-my-2.5 divide-y divide-slate-100";

/**
 * Skills with their price on the right. `onRateMissing` turns "No rate
 * set" into a shortcut (your own profile, to set one).
 */
export function SkillRateList({ skills, onRateMissing }: { skills: UserSkillDetail[]; onRateMissing?: () => void }) {
  const { t, lang } = useI18n();
  return (
    <ul className="-my-1 divide-y divide-slate-100">
      {skills.map((s) => {
        const label = s.id === "other" && s.custom_label ? s.custom_label : skillName(s, lang);
        return (
          <li key={s.id} className="flex min-w-0 items-center gap-3 py-2.5">
            <SkillTile skillId={s.id} category={s.category} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
              {s.custom_note && <p className="line-clamp-1 text-xs text-slate-500">{s.custom_note}</p>}
            </div>
            {s.rate_amount != null ? (
              <p className="shrink-0 text-right leading-tight">
                <span className="block text-sm font-bold tabular-nums text-slate-900">{formatMoney(s.rate_amount, lang)}</span>
                {s.rate_unit && <span className="block text-[11px] text-slate-500">/ {s.rate_unit}</span>}
              </p>
            ) : onRateMissing ? (
              <button
                type="button"
                onClick={onRateMissing}
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {t("rateNotSet")}
              </button>
            ) : (
              <span className="shrink-0 text-[11px] text-slate-400">{t("rateNotSet")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Why a certificate wasn't accepted, as one sentence. */
function certReason(c: Certificate, t: ReturnType<typeof useI18n>["t"]): string | null {
  switch (c.rejection_code) {
    case "unclear":
      return t("kycReasonUnclear");
    case "name_mismatch":
      return t("certReasonNameMismatch");
    case "not_valid":
      return t("certReasonNotValid");
    default:
      return null;
  }
}

/**
 * Certificates, each opening its file and showing whether Duleko checked
 * it. `onRemove` adds a delete button and means it's your own profile:
 * only you see "Being checked" and why one wasn't accepted.
 */
export function CertificateList({
  certificates,
  skills = [],
  onRemove,
}: {
  certificates: Certificate[];
  /** The person's skills, to name the one each certificate proves. */
  skills?: Skill[];
  onRemove?: (certificate: Certificate) => void;
}) {
  const { t, lang } = useI18n();
  const own = Boolean(onRemove);
  return (
    <ul className="-my-1 divide-y divide-slate-100">
      {certificates.map((c) => {
        const Icon = c.file_type === "application/pdf" ? FileText : ImageIcon;
        const skill = skills.find((s) => s.id === c.skill_id);
        return (
          <li key={c.id} className="group flex min-w-0 items-center gap-3 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sun-400/15 text-sun-500">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <a
              href={c.file_url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                <span className="truncate">{c.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              </span>
              <span className="block text-xs text-slate-500">
                {[skill && skillName(skill, lang), formatDate(c.created_at.slice(0, 10), lang)].filter(Boolean).join(" · ")}
              </span>
              {c.status === "approved" ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  {t("certStatusApproved")}
                </span>
              ) : own && c.status === "pending" ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <Clock className="h-3 w-3" aria-hidden />
                  {t("certStatusPending")}
                </span>
              ) : own && c.status === "rejected" ? (
                <span className="mt-1 block text-[11px] leading-snug text-red-600">
                  <span className="font-semibold">{t("certStatusRejected")}</span>
                  {" · "}
                  {[certReason(c, t), c.rejection_note].filter(Boolean).join(" ")}
                </span>
              ) : null}
            </a>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(c)}
                aria-label={`${t("delete")}: ${c.title}`}
                title={t("delete")}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "5 days marked busy", what that means, and the next few busy dates. */
export function BusyDaysSummary({
  days,
  emptyText,
  hint,
}: {
  days: AvailabilityDay[];
  emptyText: string;
  hint: string;
}) {
  const { t, lang } = useI18n();
  const busy = days.filter((d) => d.status === "booked");
  const upcoming = [...busy].sort((a, b) => a.day.localeCompare(b.day)).slice(0, 6);
  return (
    <>
      <p className="text-sm font-semibold text-slate-900">
        {busy.length > 0 ? t("daysMarkedBusy", { count: formatNumber(busy.length, lang) }) : emptyText}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
      {upcoming.length > 0 && (
        <div className="mt-3.5">
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("profileBusyUpcoming")}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {upcoming.map((d) => (
              <li key={d.day} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-surface">
                {formatDate(d.day, lang)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
