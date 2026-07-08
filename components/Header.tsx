import { logout } from "@/actions/auth";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-lg font-semibold">🧭 Trip Planner</span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
