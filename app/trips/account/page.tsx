import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchPastTrips, fetchUpcomingTrips } from "@/lib/trips";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/PageHeader";
import { tripNights } from "@/components/TripCard";

const MEMBER_SINCE = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial = (user.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  // Counts are a nice-to-have here: if the trip queries fail, the page
  // still renders (and log out still works) with the stats left out.
  const supabase = await createClient();
  const [upcoming, past] = await Promise.all([
    fetchUpcomingTrips(supabase, user.id).catch(() => null),
    fetchPastTrips(supabase, user.id).catch(() => null),
  ]);
  const nightsAway = past?.reduce((sum, t) => sum + tripNights(t.start_date, t.end_date), 0);
  const stats =
    upcoming && past
      ? [
          { label: "Upcoming", value: upcoming.length, href: "/trips/upcoming" },
          { label: "Completed", value: past.length, href: "/trips/history" },
          { label: "Nights away", value: nightsAway ?? 0, href: "/trips/history" },
        ]
      : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <PageHeader title="Account" />

      <section aria-label="Profile" className="glass-card enter overflow-hidden">
        <div className="flex items-center gap-4 p-6">
          <span
            aria-hidden="true"
            className="bg-accent-400/20 text-accent-400 font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="ticket-label">Traveller</p>
            <p className="text-base font-medium break-all text-white/90">{user.email}</p>
            {user.created_at && (
              <p className="ticket-data mt-0.5 text-xs text-white/70">
                Member since {MEMBER_SINCE.format(new Date(user.created_at))}
              </p>
            )}
          </div>
        </div>

        {stats && (
          <ul className="grid grid-cols-3 border-t border-dashed border-white/15">
            {stats.map((stat, i) => (
              <li key={stat.label} className={i > 0 ? "border-l border-dashed border-white/15" : ""}>
                <Link
                  href={stat.href}
                  className="flex min-h-11 flex-col gap-0.5 px-4 py-4 transition hover:bg-white/5 sm:px-6"
                >
                  <span className="ticket-label">{stat.label}</span>
                  <span className="ticket-data text-accent-400 text-2xl leading-tight font-medium">
                    {stat.value}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={logout} className="border-t border-dashed border-white/15 p-6">
          <SubmitButton variant="ghost" pendingLabel="Logging out…" className="w-full">
            Log out
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
