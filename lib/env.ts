/**
 * Central, dependency-free environment variable validation.
 *
 * NEXT_PUBLIC_* vars are referenced statically (not via process.env[name])
 * so Next.js can inline them into client bundles at build time.
 */

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Add them to .env.local for local development, or to your hosting " +
        "provider's environment settings (e.g. Vercel > Project > Settings > " +
        "Environment Variables) and redeploy.",
    );
  }

  return { url: url as string, anonKey: anonKey as string };
}

let warnedMissingOpenWeatherKey = false;

/**
 * OPENWEATHER_API_KEY is optional — weather features degrade gracefully —
 * but a missing key is logged once by name so it is diagnosable.
 */
export function getOpenWeatherApiKey(): string | null {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    if (!warnedMissingOpenWeatherKey) {
      warnedMissingOpenWeatherKey = true;
      console.warn(
        "Environment variable OPENWEATHER_API_KEY is not set — weather " +
          "geocoding and forecasts are disabled.",
      );
    }
    return null;
  }
  return apiKey;
}
