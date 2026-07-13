"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const TABS = [
  { href: "/trips/upcoming", label: "Upcoming trips" },
  { href: "/trips/history", label: "Trip history" },
] as const;

/** Read by TabPanelTransition on the destination page to pick a direction. */
export const TAB_DIRECTION_KEY = "trip-planner:tab-direction";

interface IndicatorRect {
  left: number;
  width: number;
}

/**
 * The "Upcoming trips" / "Trip history" tab switcher. The active-tab
 * underline is measured directly off the real link elements (offsetLeft/
 * width relative to the nav container) and repositioned via a plain CSS
 * `transition` — no browser View Transitions API, no dependency on when
 * the destination page's data finishes loading (that combination was
 * tried first and verified live to never actually animate, since the
 * transition's snapshot was captured before the Suspense-streamed content
 * arrived; see TabPanelTransition.tsx for how the content side works).
 */
export function TripsNav() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((tab) => pathname?.startsWith(tab.href));
  const containerRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);

  // Runs before paint so the indicator never visibly snaps into place on
  // first mount — only genuine tab-to-tab changes animate, via the CSS
  // `transition` on .trip-tab-indicator picking up the new left/width.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeLink = activeIndex === -1 ? null : linkRefs.current[activeIndex];
    if (!container || !activeLink) {
      setIndicator(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    setIndicator({ left: linkRect.left - containerRect.left, width: linkRect.width });
  }, [activeIndex]);

  function recordDirection(targetIndex: number) {
    if (activeIndex === -1) return;
    sessionStorage.setItem(TAB_DIRECTION_KEY, targetIndex > activeIndex ? "forward" : "back");
  }

  return (
    <nav
      ref={containerRef}
      className="relative flex items-center gap-4 text-sm text-white/70"
      aria-label="Trips"
    >
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            ref={(el) => {
              linkRefs.current[index] = el;
            }}
            onClick={() => recordDirection(index)}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-0.5 py-1 transition hover:text-white ${
              isActive ? "font-medium text-white" : ""
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      {indicator && (
        <span
          aria-hidden="true"
          className="trip-tab-indicator bg-accent-400 absolute -bottom-1 left-0 h-0.5 rounded-full"
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      )}
    </nav>
  );
}
