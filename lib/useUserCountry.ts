import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_COUNTRY, isSupportedCountry, type CountryCode } from "@/lib/attractions";

const GEOLOCATION_TIMEOUT_MS = 6000;

/**
 * Best-effort browser geolocation → country lookup. Starts on
 * DEFAULT_COUNTRY and stays there until `detect()` is called explicitly —
 * the permission prompt should never fire without the user asking for it,
 * so this never runs itself on mount.
 */
export function useUserCountry(): {
  country: CountryCode;
  detecting: boolean;
  supported: boolean;
  detect: () => void;
} {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [detecting, setDetecting] = useState(false);
  // Starts false on both server and the client's first render (the server
  // has no `navigator` at all) and flips after mount — checking
  // `typeof navigator !== "undefined"` directly during render is exactly
  // the server/client branch that causes a hydration mismatch, since the
  // client's first render would then disagree with the server-rendered HTML.
  const [supported, setSupported] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported("geolocation" in navigator);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const detect = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/geolocate?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (mountedRef.current && isSupportedCountry(data.country)) {
            setCountry(data.country);
          }
        } catch {
          // Network failure — stay on the current country.
        } finally {
          if (mountedRef.current) setDetecting(false);
        }
      },
      () => {
        if (mountedRef.current) setDetecting(false);
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 600_000 },
    );
  }, []);

  return { country, detecting, supported, detect };
}
