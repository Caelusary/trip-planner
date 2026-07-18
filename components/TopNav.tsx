"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

/** Read by TabPanelTransition on the destination page to pick a direction. */
export const TAB_DIRECTION_KEY = "trip-planner:tab-direction";

function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 3L4 20L12 16L20 20L12 3Z" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// Same compass mark as the "Explore" row on the /trips page itself
// (components/TopAttractions.tsx) — same concept, same icon, so the nav tab
// and the page it points to visually read as the same destination.
function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.8 4.7a1 1 0 0 1-.5.5L7.5 16.5l1.8-4.7a1 1 0 0 1 .5-.5z" />
    </svg>
  );
}

function UpcomingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <circle cx="12" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8v4.5l3 1.75" />
      <path d="M4.6 9A7.5 7.5 0 1 1 5 15.2" />
      <path d="M3 5v4.4h4.4" />
    </svg>
  );
}

function SavedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20.5s-7.5-4.6-9.6-9.3C.9 7.8 3 5 6.1 5c1.9 0 3.4 1 5.9 3.4C14.5 6 16 5 17.9 5 21 5 23.1 7.8 21.6 11.2 19.5 15.9 12 20.5 12 20.5Z" />
    </svg>
  );
}

const TABS = [
  // `exact: true` — every other tab's href is also a valid *prefix* of this
  // one ("/trips"), so a plain `startsWith` match would make this tab (and
  // this tab alone) light up as "active" on every /trips/* page, not just
  // the tourist-attractions page itself.
  { href: "/trips", label: "Tourist attractions", Icon: CompassIcon, exact: true },
  { href: "/trips/upcoming", label: "Upcoming trips", Icon: UpcomingIcon, exact: false },
  { href: "/trips/history", label: "Trip history", Icon: HistoryIcon, exact: false },
  { href: "/trips/saved", label: "Saved", Icon: SavedIcon, exact: false },
  { href: "/trips/plan", label: "Plan a trip", Icon: PlusIcon, exact: false },
] as const;

/**
 * Shared by both nav renderings below (desktop sidebar rail + mobile flat
 * bar): works out which tab is active for the current route, and records
 * forward/back direction in sessionStorage before navigating so
 * TabPanelTransition can play the matching one-shot enter animation on the
 * destination page.
 */
function useTripsTabs() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((tab) =>
    tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href),
  );

  function recordDirection(targetIndex: number) {
    if (activeIndex === -1) return;
    sessionStorage.setItem(TAB_DIRECTION_KEY, targetIndex > activeIndex ? "forward" : "back");
  }

  return { activeIndex, recordDirection };
}

/**
 * A single horizontal top bar, used at every viewport width — replaces the
 * previous split layout (a fixed-width left sidebar on desktop,
 * TripsSidebar.tsx, plus a separate floating bottom tab bar on mobile,
 * BottomNav.tsx). One nav pattern everywhere means the ~16rem the sidebar
 * used to reserve is free for content (the page's own max-w-3xl -> max-w-5xl
 * bump, and the carousel stage in particular, both lean on that freed
 * width). `sticky` (not `fixed`) so it still occupies real space in normal
 * flow — content below it doesn't need the old BottomNav-clearing
 * `pb-28` hack, it just flows underneath naturally.
 *
 * "Plan a trip" and "Tourist attractions" (the /trips carousel/discover
 * page — previously reachable only via the logo or an ad hoc "← Back to
 * trips" text link on the Upcoming/History pages) are both plain tabs here,
 * the same as Upcoming/History/Saved — not a separately-styled teal CTA
 * button off on its own. Verified live that a distinctly-styled button
 * crammed in next to the account avatar read as visually disconnected from
 * the rest of the nav; one consistent tab treatment for every destination
 * fixes that instead of trying to make the odd-one-out button fit in.
 */
export function TopNav({ email }: { email: string | null }) {
  const { activeIndex, recordDirection } = useTripsTabs();
  const initial = (email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="border-white/10 bg-ink-900/70 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 md:px-8">
        <Link
          href="/trips"
          className="flex shrink-0 items-center gap-2 rounded-md transition hover:opacity-80"
        >
          <LogoMark className="text-accent-400 h-5 w-5 shrink-0" />
          <span className="font-display hidden text-lg font-semibold tracking-tight sm:inline">
            Trip Planner
          </span>
        </Link>

        <nav aria-label="Trips" className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {TABS.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => recordDirection(index)}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm transition sm:px-3 ${
                  isActive
                    ? "bg-accent-400/15 text-white font-medium"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <tab.Icon aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-accent-400" : "text-white/45"}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/trips/account"
          aria-label="Account"
          className="bg-accent-400/20 text-accent-400 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition hover:opacity-80"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
