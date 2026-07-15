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
 * Shared by both nav renderings below (desktop sidebar rail + mobile flat
 * bar): works out which tab is active for the current route, and records
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
 * Desktop sidebar nav: a normal flat vertical nav bar (Vercel-dashboard
 * style) — the active tab gets an accent-tinted background/border, the
 * inactive one stays plain. The 3D tilted-cylinder treatment this used to
 * have was a misread of the user's request — the circular/3D ask was
 * actually for the attraction carousel (see CarouselStack/styleForSlot.ts),
 * not this nav.
 */
export function SidebarNav() {
  const { activeIndex, recordDirection } = useTripsTabs();

  return (
    <nav aria-label="Trips" className="flex flex-col gap-1.5">
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => recordDirection(index)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
              isActive
                ? "border-accent-400/40 bg-accent-400/15 font-medium text-white"
                : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <tab.Icon
              aria-hidden="true"
              className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-accent-400" : "text-white/45"}`}
            />
            {tab.label}
          </Link>
        );
      })}
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
