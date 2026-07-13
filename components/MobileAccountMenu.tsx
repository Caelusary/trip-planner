"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Mobile-only stand-in for the desktop sidebar's profile card: a compact
 * avatar button that discloses email + "Plan a trip" + "Log out" in a
 * small panel. Plain useState (not the experimental ViewTransition/
 * startViewTransition APIs this app deliberately avoids elsewhere) — this
 * is ordinary React state, so it's unaffected by that constraint.
 * Auto-closes on route change and Escape; the transparent full-screen
 * button behind the panel closes it on outside click/tap.
 */
export function MobileAccountMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const initial = (email ?? "?").trim().charAt(0).toUpperCase() || "?";

  // Close on route change. Adjusting state directly during render (React's
  // recommended pattern for "reset state when a prop changes") rather than
  // in an effect — an effect here would fire *after* the new route's first
  // paint, letting the stale-route menu flash open for a frame.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="bg-accent-400/20 text-accent-400 hover:bg-accent-400/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition"
      >
        {initial}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            aria-label="Account"
            className="glass-card enter absolute top-14 right-0 z-40 flex w-60 flex-col gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/90">
                {email ?? "Signed in"}
              </p>
              <p className="text-[10px] tracking-wide text-white/40 uppercase">Account</p>
            </div>
            <Link
              href="/trips#plan-trip"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="text-accent-400 -mx-1 rounded-md px-1 py-1 text-sm font-medium underline-offset-2 hover:underline"
            >
              Plan a trip
            </Link>
            <form action={logout}>
              <SubmitButton variant="ghost" pendingLabel="Logging out…" className="w-full">
                Log out
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
