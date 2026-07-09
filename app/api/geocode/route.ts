import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/weather";
import { clientKey, isRateLimited } from "@/lib/rate-limit";

const MAX_QUERY_LENGTH = 100;
// Generous enough for keystroke-driven autocomplete, tight enough to blunt scripted abuse.
const RATE_LIMIT_PER_MINUTE = 60;

export async function GET(request: NextRequest) {
  if (isRateLimited(`geocode:${clientKey(request)}`, RATE_LIMIT_PER_MINUTE)) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchCities(query);
  // City name -> coordinates is effectively static data (mirrors the 30-day
  // `next: { revalidate }` window on the underlying OpenWeatherMap fetch in
  // lib/weather.ts). Without this header every keystroke-driven autocomplete
  // request — even for a query already answered a second ago — re-hits this
  // route and, cache misses aside, skips any HTTP-level caching entirely.
  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=2592000" } },
  );
}
