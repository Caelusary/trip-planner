"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h3.5v-6h3v6H17a1 1 0 0 0 1-1V10" />
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

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20.5s-7.5-4.6-9.6-9.3C.9 7.8 3 5 6.1 5c1.9 0 3.4 1 5.9 3.4C14.5 6 16 5 17.9 5 21 5 23.1 7.8 21.6 11.2 19.5 15.9 12 20.5 12 20.5Z" />
    </svg>
  );
}

function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

const TABS = [
  { href: "/trips", label: "Trips", Icon: HomeIcon, exact: true },
  { href: "/trips#plan-trip", label: "Plan", Icon: PlusIcon, exact: false },
  { href: "/trips/saved", label: "Saved", Icon: HeartIcon, exact: false },
  { href: "/trips/account", label: "Account", Icon: UserIcon, exact: false },
] as const;

/**
 * Floating, frosted-glass bottom tab bar — the mobile navigation surface
 * (desktop keeps the existing left sidebar, see TripsSidebar.tsx). Replaces
 * the old sticky-top mobile bar (SidebarNav's former MobileTabBar +
 * MobileAccountMenu): those covered "Upcoming vs. History" and an account
 * dropdown specifically, where this covers the app's top-level sections —
 * different enough in scope that collapsing the old desktop tab set wasn't
 * the right shape for it.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-white/15 bg-ink-900/70 fixed inset-x-0 bottom-3 z-30 mx-auto flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-xl md:hidden"
    >
      {TABS.map(({ href, label, Icon, exact }) => {
        const path = href.split("#")[0];
        const isActive = exact ? pathname === path : pathname?.startsWith(path);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors ${
              isActive ? "bg-accent-500 text-ink-950" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
