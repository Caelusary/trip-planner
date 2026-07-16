import { NextRequest, NextResponse } from "next/server";
import { fetchLiveRates } from "@/lib/exchange-rates";
import { clientKey, isRateLimited } from "@/lib/rate-limit";

// Generous: this endpoint takes no query params, so every client only ever
// needs to hit it once per page load — this just blunts scripted abuse.
const RATE_LIMIT_PER_MINUTE = 30;

export async function GET(request: NextRequest) {
  if (isRateLimited(`exchange-rates:${clientKey(request)}`, RATE_LIMIT_PER_MINUTE)) {
    return NextResponse.json({ rates: null }, { status: 429 });
  }

  const rates = await fetchLiveRates();
  return NextResponse.json(
    { rates },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
