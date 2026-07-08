import { useEffect, useState } from "react";
import { DEFAULT_COUNTRY, isSupportedCountry, type CountryCode } from "@/lib/attractions";

const GEOLOCATION_TIMEOUT_MS = 6000;

/**
 * Best-effort browser geolocation → country lookup. Starts (and stays) on
 * DEFAULT_COUNTRY for denied/unsupported/errored/unrecognized-country cases,
 * so the carousel always has something to show instead of blocking on a
 * permission prompt.
 */
export function useUserCountry(): { country: CountryCode; detecting: boolean } {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setDetecting(false);
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/geolocate?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (!cancelled && isSupportedCountry(data.country)) {
            setCountry(data.country);
          }
        } catch {
          // Network failure — stay on the default country.
        } finally {
          if (!cancelled) setDetecting(false);
        }
      },
      () => {
        if (!cancelled) setDetecting(false);
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 600_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { country, detecting };
}
