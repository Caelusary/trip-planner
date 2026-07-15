"use client";

import { useLayoutEffect, useState } from "react";
import { TAB_DIRECTION_KEY } from "@/components/SidebarNav";

/**
 * Plays a one-shot enter animation when this mounts after a tab switch
 * (Upcoming Trips <-> Trip History), reading the direction TripsNav
 * recorded in sessionStorage synchronously before navigating away. Falls
 * back to no animation when there's no recorded direction (first load,
 * "Plan a trip", "Back to trips", or any other non-tab navigation) so only
 * genuine tab-to-tab switches get the animated treatment.
export function TabPanelTransition({ children }: { children: React.ReactNode }) {
  const [animationClass, setAnimationClass] = useState("");

  // Layout effect (not a regular effect) so the class — and therefore the
  // animation's "from" state — is applied before the browser's first
  // paint of this page, avoiding a flash of the unanimated final state.
  useLayoutEffect(() => {
    const direction = sessionStorage.getItem(TAB_DIRECTION_KEY);
    sessionStorage.removeItem(TAB_DIRECTION_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (direction === "forward") setAnimationClass("tab-panel-enter-forward");
    else if (direction === "back") setAnimationClass("tab-panel-enter-back");
  }, []);

  return <div className={animationClass}>{children}</div>;
}
