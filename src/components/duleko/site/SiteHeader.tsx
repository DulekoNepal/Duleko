import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Compass, Home, Mail, Menu, ShieldCheck, Target, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, useSiteActions } from "./actions";
import { NAV, type NavEntry, type NavItem } from "./nav";
import { Brand, SiteButton } from "./ui";

const LINK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/mission": Target,
  "/safety": ShieldCheck,
};

function isItemActive(item: NavItem, pathname: string) {
  return pathname === item.to && !item.hash;
}

function isGroupActive(entry: Extract<NavEntry, { kind: "group" }>, pathname: string) {
  return entry.items.some((item) => item.to === pathname);
}

/**
 * Desktop (lg+): inline links plus two dropdowns - a wide "Who it's for"
 * panel and a compact "About" one - that open on hover or click.
 * Below lg: a hamburger opening a slide-in drawer with the same entries,
 * grouped, and the two primary actions pinned to its bottom.
 */
export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { createProfile, explore, signedIn } = useSiteActions();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef<string | null>(null);

  // A new page closes whatever was open.
  useEffect(() => {
    setDrawerOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Solid bar + shadow once the page moves, and a reading-progress line.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawerOpen(false);
      setOpenGroup(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  // The page underneath shouldn't scroll behind an open drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  // Rotating a tablet to landscape can cross into the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function hoverOpen(id: string) {
    window.clearTimeout(closeTimer.current);
    setOpenGroup(id);
  }

  function hoverClose() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), 140);
  }

  const closeAll = () => {
    setOpenGroup(null);
    setDrawerOpen(false);
  };

  const primaryCta = signedIn
    ? { label: "Open Duleko", onClick: () => explore("/") }
    : { label: "Create Your Profile", onClick: createProfile };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b pt-[var(--sat)] transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-slate-200/80 bg-white/90 shadow-[0_10px_30px_-18px_rgba(12,60,72,0.35)] backdrop-blur-xl"
            : "border-transparent bg-white/75 backdrop-blur",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link to="/" aria-label="Duleko home" className="shrink-0 rounded-xl" onClick={closeAll}>
            <Brand />
          </Link>

          <nav ref={navRef} className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Website">
            {NAV.map((entry) =>
              entry.kind === "link" ? (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                    pathname === entry.to
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                >
                  {entry.label}
                </Link>
              ) : (
                <div
                  key={entry.id}
                  className="relative"
                  onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(entry.id)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      lastPointer.current = e.pointerType;
                    }}
                    onClick={(e) => {
                      // A mouse already opened it on hover, so a click
                      // shouldn't immediately close it again. Touch and
                      // keyboard (detail 0) toggle.
                      if (lastPointer.current === "mouse" && e.detail > 0) setOpenGroup(entry.id);
                      else setOpenGroup((g) => (g === entry.id ? null : entry.id));
                      lastPointer.current = null;
                    }}
                    aria-expanded={openGroup === entry.id}
                    aria-haspopup="true"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                      isGroupActive(entry, pathname) || openGroup === entry.id
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                    )}
                  >
                    {entry.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        openGroup === entry.id && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  <DropdownPanel
                    entry={entry}
                    open={openGroup === entry.id}
                    pathname={pathname}
                    onNavigate={closeAll}
                    onExplore={() => {
                      closeAll();
                      explore("/");
                    }}
                  />
                </div>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {!signedIn && (
              <SiteButton variant="ghost" size="sm" className="hidden xl:inline-flex" onClick={() => explore("/")}>
                <Compass className="h-4 w-4" aria-hidden />
                Explore
              </SiteButton>
            )}
            <SiteButton size="sm" className="hidden sm:inline-flex" onClick={primaryCta.onClick}>
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </SiteButton>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="site-drawer"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={progressRef}
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500"
          aria-hidden
        />
      </header>

      {/* Outside the header on purpose: the header's backdrop-filter would
          otherwise become the containing block for this fixed overlay. */}
      <MobileDrawer
        open={drawerOpen}
        pathname={pathname}
        onClose={() => setDrawerOpen(false)}
        primaryCta={primaryCta}
        onExplore={() => {
          setDrawerOpen(false);
          explore("/");
        }}
        signedIn={signedIn}
      />
    </>
  );
}

function DropdownItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isItemActive(item, pathname);
  return (
    <Link
      to={item.to}
      hash={item.hash}
      onClick={onNavigate}
      className={cn(
        "group flex items-start gap-3 rounded-xl p-3 transition-colors",
        active ? "bg-brand-50" : "hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          active ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700 group-hover:bg-brand-100",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
          {item.label}
          <ArrowRight
            className="h-3.5 w-3.5 -translate-x-1 text-brand-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </span>
        <span className="mt-0.5 block text-sm text-slate-500">{item.description}</span>
      </span>
    </Link>
  );
}

function DropdownPanel({
  entry,
  open,
  pathname,
  onNavigate,
  onExplore,
}: {
  entry: Extract<NavEntry, { kind: "group" }>;
  open: boolean;
  pathname: string;
  onNavigate: () => void;
  onExplore: () => void;
}) {
  const wide = entry.id === "audiences";
  return (
    // pt-3 bridges the gap under the trigger so the pointer can travel into
    // the panel without it closing.
    <div
      className={cn(
        "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-all duration-200",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-teal-900/10",
          wide ? "grid w-[640px] grid-cols-[1fr_220px]" : "w-[340px]",
        )}
      >
        <div className="p-2">
          {entry.items.map((item) => (
            <DropdownItem key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>

        {wide ? (
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 to-teal-800 p-5 text-white">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-300">Duleko is for everyone</p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                You can need a service, provide a service, or do both.
              </p>
            </div>
            <button
              type="button"
              onClick={onExplore}
              className="relative mt-5 inline-flex items-center gap-1.5 self-start rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold ring-1 ring-white/25 transition-colors hover:bg-white/25"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Explore Duleko
            </button>
          </div>
        ) : (
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-600 transition-colors hover:text-brand-700"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {CONTACT_EMAIL}
          </a>
        )}
      </div>
    </div>
  );
}

function MobileDrawer({
  open,
  pathname,
  onClose,
  primaryCta,
  onExplore,
  signedIn,
}: {
  open: boolean;
  pathname: string;
  onClose: () => void;
  primaryCta: { label: string; onClick: () => void };
  onExplore: () => void;
  signedIn: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const rowClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
      active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50",
    );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-[visibility] duration-300 lg:hidden",
        open ? "visible" : "invisible",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-teal-900/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        id="site-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-b border-slate-100 pt-[var(--sat)]">
          <div className="flex h-16 items-center justify-between px-4">
            <Link to="/" onClick={onClose} aria-label="Duleko home">
              <Brand />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Website">
          <Link to="/" onClick={onClose} className={rowClass(pathname === "/")}>
            <Home className="h-5 w-5 text-brand-700" aria-hidden />
            Home
          </Link>

          {NAV.map((entry) => {
            if (entry.kind === "link") {
              const Icon = LINK_ICONS[entry.to] ?? Home;
              return (
                <Link key={entry.to} to={entry.to} onClick={onClose} className={rowClass(pathname === entry.to)}>
                  <Icon className="h-5 w-5 text-brand-700" aria-hidden />
                  {entry.label}
                </Link>
              );
            }
            return (
              <div key={entry.id} className="mt-4 border-t border-slate-100 pt-4">
                <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
                  {entry.label}
                </p>
                {entry.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item, pathname);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      hash={item.hash}
                      onClick={onClose}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        active ? "bg-brand-50" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-slate-900">{item.label}</span>
                        <span className="block text-sm text-slate-500">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/70 px-4 pb-[calc(var(--sab)+1rem)] pt-4">
          <SiteButton className="w-full" onClick={primaryCta.onClick}>
            <UserPlus className="h-4.5 w-4.5" aria-hidden />
            {primaryCta.label}
          </SiteButton>
          {!signedIn && (
            <SiteButton variant="outline" className="w-full" onClick={onExplore}>
              <Compass className="h-4.5 w-4.5" aria-hidden />
              Explore Duleko
            </SiteButton>
          )}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center justify-center gap-1.5 pt-1 text-sm text-slate-500 hover:text-brand-700"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
