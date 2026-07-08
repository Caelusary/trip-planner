import Link from "next/link";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5">
      <Link
        href="/trips"
        className="flex items-center gap-2 rounded-md transition hover:opacity-80"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-accent-400"
        >
          <path
            d="M12 3L4 20L12 16L20 20L12 3Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
        </svg>
        <span className="font-display text-lg font-semibold tracking-tight">
          Trip Planner
        </span>
      </Link>
      <form action={logout}>
        <SubmitButton variant="ghost" pendingLabel="Logging out…">
          Log out
        </SubmitButton>
      </form>
    </header>
  );
}
