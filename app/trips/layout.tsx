import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  // Individual pages under /trips/* already redirect to /login when signed
  // out (see e.g. app/trips/page.tsx) — this fetch is only to surface the
  // signed-in user's email in the nav bar's account avatar, so it
  // deliberately doesn't redirect itself and tolerates a null user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <TopNav email={user?.email ?? null} />
      {/* TopNav is `sticky`, not `fixed` — it still occupies its own space
          in normal flow, so content just flows below it with no
          compensating padding needed (the old fixed BottomNav needed a
          pb-28 hack here for exactly that reason; this doesn't). */}
      <div className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}
