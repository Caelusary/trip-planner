import Link from "next/link";
import { connection } from "next/server";
import { StatusPanel, STATUS_BUTTON_PRIMARY } from "@/components/StatusPanel";

/**
 * Shown for unknown URLs, trips that aren't yours (notFound() in the trip
 * pages) and expired or disabled share links. Previously Next's bare
 * default 404, which looked like a different site.
 */
export default async function NotFound() {
  // Render per request rather than prerendering: the CSP nonce proxy.ts
  // issues has to be stamped on this page's scripts too, and a static
  // build-time page has no request to take it from.
  await connection();
  return (
    <main id="main" className="flex flex-1 items-center justify-center p-6">
      <StatusPanel
        status="Not on the board"
        tone="neutral"
        title="We can't find that trip"
        body="The link may be mistyped, the trip may have been deleted, or its owner turned sharing off."
      >
        <Link href="/" className={STATUS_BUTTON_PRIMARY}>
          Go to Trip Planner
        </Link>
      </StatusPanel>
    </main>
  );
}
