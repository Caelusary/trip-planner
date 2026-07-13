import Link from "next/link";
import type { SVGProps } from "react";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { SidebarNav, MobileTabBar } from "@/components/SidebarNav";
import { MobileAccountMenu } from "@/components/MobileAccountMenu";

function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 3L4 20L12 16L20 20L12 3Z" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Persistent left sidebar for the whole /trips/* section (desktop), plus
 * its mobile collapse: a single sticky top bar. Replaces the old top
 * <Header> — logo, nav (components/SidebarNav.tsx), a "Plan a trip" quick
 * action, and a profile section (signed-in email + log out) all live here
 * now. `email` is fetched server-side in app/trips/layout.tsx via the same
 * `supabase.auth.getUser()` pattern every page under app/trips/ already
 * uses, so no extra client-side fetch is needed just to show it.
 */
export function TripsSidebar({ email }: { email: string | null }) {
  const initial = (email ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      {/* ---------- Desktop: fixed-width, full-height sidebar ---------- */}
      <aside
        className="border-white/10 bg-ink-900/70 hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:justify-between md:gap-8 md:overflow-y-auto md:border-r md:px-5 md:py-6 md:backdrop-blur-xl"
        aria-label="Trips navigation"
      >
        <div className="flex flex-col gap-8">
          <Link
            href="/trips"
            className="flex shrink-0 items-center gap-2 rounded-md transition hover:opacity-80"
          >
            <LogoMark className="text-accent-400 h-5 w-5 shrink-0" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Trip Planner
            </span>
          </Link>
          <SidebarNav />
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/trips#plan-trip"
            className="bg-accent-500 hover:bg-accent-400 text-ink-950 flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition"
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            Plan a trip
          </Link>

          <div className="glass-card flex flex-col gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="bg-accent-400/20 text-accent-400 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/90">
                  {email ?? "Signed in"}
                </p>
                <p className="text-[10px] tracking-wide text-white/40 uppercase">Account</p>
              </div>
            </div>
            <form action={logout}>
              <SubmitButton variant="ghost" pendingLabel="Logging out…" className="w-full">
                Log out
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile: single sticky top bar ---------- */}
      <header className="border-white/10 bg-ink-950/85 sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-2 backdrop-blur-xl md:hidden">
        <Link
          href="/trips"
          aria-label="Trip Planner home"
          className="flex shrink-0 items-center rounded-md p-1 transition hover:opacity-80"
        >
          <LogoMark className="text-accent-400 h-5 w-5" />
        </Link>
        <MobileTabBar />
        <MobileAccountMenu email={email} />
      </header>
    </>
  );
}
