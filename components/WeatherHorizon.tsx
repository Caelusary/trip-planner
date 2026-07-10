import type { ForecastDay } from "@/lib/weather";
import { formatDayShort } from "@/lib/format";

const DAY_WIDTH = 100;
const LINE_TOP = 34;
const LINE_BOTTOM = 94;
const HEIGHT = 138;

/**
 * Renders the trip's forecast as a single horizon-line chart (temps as a
 * skyline silhouette) instead of a row of identical boxes — icons and temps
 * sit directly on the line they describe. Pure SVG, no client JS.
 */
export function WeatherHorizon({ forecast }: { forecast: ForecastDay[] }) {
  // Every calculation below (min/max temp range, the SVG path strings
  // indexing points[0] and points[points.length - 1]) assumes at least one
  // day of data — callers are expected to only render this when
  // forecast.length > 0, but degrade to nothing instead of throwing if that
  // ever isn't true (e.g. a future caller forgetting the guard), rather than
  // crashing the whole page render.
  if (forecast.length === 0) return null;

  const width = forecast.length * DAY_WIDTH;
  const highs = forecast.map((d) => d.tempMax);
  const lows = forecast.map((d) => d.tempMin);
  const minT = Math.min(...lows);
  const maxT = Math.max(...highs);
  const range = maxT - minT || 1;

  const points = forecast.map((day, i) => {
    const x = i * DAY_WIDTH + DAY_WIDTH / 2;
    const y = LINE_TOP + (1 - (day.tempMax - minT) / range) * (LINE_BOTTOM - LINE_TOP);
    return { ...day, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath =
    `M${points[0].x},${LINE_BOTTOM} ` +
    points.map((p) => `L${p.x},${p.y}`).join(" ") +
    ` L${points[points.length - 1].x},${LINE_BOTTOM} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        aria-hidden="true"
        className="block"
      >
        <defs>
          <linearGradient id="horizon-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#horizon-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-accent-400)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <g key={p.date}>
            <text
              x={p.x}
              y={16}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fillOpacity="0.55"
            >
              {formatDayShort(p.date)}
            </text>
            <image
              href={`https://openweathermap.org/img/wn/${p.icon}.png`}
              x={p.x - 18}
              y={p.y - 42}
              width="36"
              height="36"
            />
            <circle cx={p.x} cy={p.y} r="3" fill="var(--color-accent-400)" />
            <text x={p.x} y={LINE_BOTTOM + 24} textAnchor="middle" fontSize="13" fill="white">
              {p.tempMax}° / {p.tempMin}°
            </text>
          </g>
        ))}
      </svg>

      <ul className="sr-only">
        {forecast.map((day) => (
          <li key={day.date}>
            {formatDayShort(day.date)}: {day.condition}, high {day.tempMax}°, low {day.tempMin}°
          </li>
        ))}
      </ul>
    </div>
  );
}
