"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon resolves relative image paths that break
// once bundled — pointing them at the same package version's own images on
// a CDN sidesteps bundler-specific asset-import configuration entirely
// (map tiles below already come from a third-party host, so this doesn't
// introduce a new category of external dependency).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

interface TripMapProps {
  points: MapPoint[];
}

export function TripMap({ points }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: false });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markers = points.map((point) =>
      L.marker([point.lat, point.lon]).addTo(map).bindPopup(point.label),
    );

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 11);
    } else {
      const bounds = L.latLngBounds(points.map((p): [number, number] => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [32, 32] });
    }

    // Effect re-runs whenever `points` changes (a stop added/removed) —
    // tearing the whole map down first avoids leaking the previous
    // instance's tile layer/markers into a stale Leaflet container.
    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <p className="text-sm text-white/70">
        No locations to show yet — stops need a recognized city before they can be plotted.
      </p>
    );
  }

  return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg" />;
}
