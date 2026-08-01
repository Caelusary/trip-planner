"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/TripMap";

// Leaflet touches `window` at module load time, which crashes during
// server-side rendering — `ssr: false` (only valid from a Client
// Component, hence this thin wrapper around the server-rendered trip page)
// defers loading it until the browser.
const TripMap = dynamic(() => import("@/components/TripMap").then((mod) => mod.TripMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-white/5" />,
});

export function TripMapLoader({ points }: { points: MapPoint[] }) {
  return <TripMap points={points} />;
}
