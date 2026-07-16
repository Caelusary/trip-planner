import { createClient } from "@/lib/supabase/server";
import { TripsSidebar } from "@/components/TripsSidebar";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  // Individual pages under /trips/* already redirect to /login when signed
  // out (see e.g. app/trips/page.tsx) — this fetch is only to surface the
  // signed-in user's email in the sidebar's profile section, so it
  // deliberately doesn't redirect itself and tolerates a null user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <TripsSidebar email={user?.email ?? null} />
      {/* pb-28 (not pb-10) on mobile only — clears the fixed BottomNav (see
          components/BottomNav.tsx) so it never covers page content like a
          form's submit button. Overridden by md:py-8 at desktop width,
          where there's no bottom nav to clear. */}
      <div className="min-w-0 flex-1 px-4 pb-28 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
