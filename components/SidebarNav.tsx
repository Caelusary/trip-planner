"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

/** Read by TabPanelTransition on the destination page to pick a direction. */
export const TAB_DIRECTION_KEY = "trip-planner:tab-direction";

function UpcomingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <circle cx="12" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 8v4.5l3 1.75" />
      <path d="M4.6 9A7.5 7.5 0 1 1 5 15.2" />
      <path d="M3 5v4.4h4.4" />
    </svg>
  );
}

const TABS = [
  { href: "/trips/upcoming", label: "Upcoming trips", Icon: UpcomingIcon },
  { href: "/trips/history", label: "Trip history", Icon: HistoryIcon },
] as const;

/**
 * Shared by both nav renderings below (desktop 3D rail + mobile flat bar):
 * works out which tab is active for the current route, and records
 * forward/back direction in sessionStorage before navigating so
 * TabPanelTransition can play the matching one-shot enter animation on the
 * destination page. Migrated from the old top-header TripsNav — same
 * mechanism, just now driving a vertical sidebar (desktop) plus a flat
 * mobile bar instead of a single horizontal tab row. See
 * TabPanelTransition.tsx for why this is plain sessionStorage + CSS rather
 * than the View Transitions API.
 */
function useTripsTabs() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((tab) => pathname?.startsWith(tab.href));

  function recordDirection(targetIndex: number) {
    if (activeIndex === -1) return;
    sessionStorage.setItem(TAB_DIRECTION_KEY, targetIndex > activeIndex ? "forward" : "back");
  }

  return { activeIndex, recordDirection };
}

/**
 * Desktop sidebar nav: the two real tabs read as if wrapped around a
 * gently rotating vertical cylinder. Each item's resting tilt is a fixed
 * `rotateX`/`translateZ` pair (no measurement needed, unlike the old
 * horizontal underline) — the active tab rotates to face the viewer
 * (rotateX(0), pulled forward via translateZ, scaled up); the other real
 * tab keeps its resting tilt, still fully legible at text-white/70 (depth
 * is sold via transform/background only, never by dropping text contrast
 * below the 4.5:1 minimum). Two aria-hidden filler bars above/below
 * complete the illusion of the cylinder's surface continuing past the two
 * real stops — decorative only, never focusable, never announced.
 * `perspective`/`preserve-3d` and the transition itself live in
 * app/globals.css (.sidebar-cylinder / .sidebar-cylinder-track /
 * .sidebar-nav-item) so prefers-reduced-motion still applies even though
 * the transform *value* here is inline (same pattern as the old
 * .trip-tab-indicator).
 */
export function SidebarNav() {
  const { activeIndex, recordDirection } = useTripsTabs();

  return (
    <nav aria-label="Trips" className="sidebar-cylinder">
      <div className="sidebar-cylinder-track flex flex-col gap-3 py-1">
        <span aria-hidden="true" className="sidebar-nav-ghost sidebar-nav-ghost--top" />
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          // Resting tilt direction differs per slot so the two tabs curve
          // away on their own side of the cylinder rather than identically.
          const restTilt = index === 0 ? 10 : -10;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => recordDirection(index)}
              aria-current={isActive ? "page" : undefined}
              className={`sidebar-nav-item flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                isActive
                  ? "border-accent-400/40 bg-accent-400/15 font-medium text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
              style={{
                transform: isActive
                  ? "rotateX(0deg) translateZ(26px) scale(1.05)"
                  : `rotateX(${restTilt}deg) translateZ(-8px) scale(0.95)`,
              }}
            >
              <tab.Icon
                aria-hidden="true"
                className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-accent-400" : "text-white/45"}`}
              />
              {tab.label}
            </Link>
          );
        })}
        <span aria-hidden="true" className="sidebar-nav-ghost sidebar-nav-ghost--bottom" />
      </div>
    </nav>
  );
}

/**
 * Mobile collapse of the same two tabs: a flat pill segmented control. A
 * cylinder read nearly edge-on in a cramped top bar has no depth left to
 * show, so this intentionally drops the 3D treatment rather than forcing
 * it — same direction-recording as the desktop rail above.
 */
export function MobileTabBar() {
  const { activeIndex, recordDirection } = useTripsTabs();

  return (
    <nav aria-label="Trips" className="flex min-w-0 flex-1 items-center gap-1.5">
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => recordDirection(index)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors duration-200 ${
              isActive ? "bg-accent-400 text-ink-950" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <tab.Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
