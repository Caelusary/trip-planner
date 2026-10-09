import { getCurrentUser } from "@/lib/supabase/user";
import { TopNav } from "@/components/TopNav";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  // Individual pages under /trips/* already redirect to /login when signed
  // out (see e.g. app/trips/page.tsx) — this fetch is only to surface the
  // signed-in user's email in the nav bar's account avatar, so it
  // deliberately doesn't redirect itself and tolerates a null user.
  // `getCurrentUser` is memoized per request (React `cache()`) — the page
  // rendered inside this layout calls it too, and previously each of those
  // independently hit Supabase's auth server; now they share one call.
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      {/* Hidden on print — the Trip Pass route (app/trips/[id]/pass) is the
          one page in here meant to be printed, and the nav has no place on
          a printed ticket. */}
      <div className="print:hidden">
        <TopNav email={user?.email ?? null} />
      </div>
      {/* TopNav is `sticky`, not `fixed` — it still occupies its own space
          in normal flow, so content just flows below it with no
          compensating padding needed (the old fixed BottomNav needed a
          pb-28 hack here for exactly that reason; this doesn't). */}
      <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-16 md:px-8 md:pt-10">
        {children}
      </main>
    </div>
  );
}
