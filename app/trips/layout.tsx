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
      <div className="min-w-0 flex-1 px-4 pb-10 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
