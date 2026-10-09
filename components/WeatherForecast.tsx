import type { ForecastDay } from "@/lib/weather";
import { formatDayShort, formatWeekdayShort } from "@/lib/format";

/**
 * The trip's forecast as one row of day cards (weekday, icon, high/low), one column per day so
 * a phone shows the whole range at a glance instead of a 2-column grid with a stray last card.
 * Replaced the old SVG horizon chart, where past 3-4 days it was hard to tell which icon and
 * temperature belonged to which day. The cards are visual only; screen readers get the list below.
 */
export function WeatherForecast({ forecast }: { forecast: ForecastDay[] }) {
  if (forecast.length === 0) return null;

  return (
    <div>
      <div
        className="grid max-w-3xl gap-1.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${forecast.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {forecast.map((day, i) => (
          <div
            key={day.date}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-3 text-center sm:gap-1.5 sm:p-3 ${
              i === 0 ? "border-accent-400/40 bg-accent-400/10" : "border-white/12 bg-white/5"
            }`}
          >
            <span className="ticket-label">{i === 0 ? "Today" : formatWeekdayShort(day.date)}</span>
            {/* eslint-disable-next-line @next/next/no-img-element -- deliberately not next/image: openweathermap.org isn't in next.config.ts's images.remotePatterns (the CSP's img-src allows it), and this icon set is tiny and already CDN-cached. */}
            <img
              src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
              alt=""
              width={48}
              height={48}
              className="h-10 w-10 sm:h-12 sm:w-12"
            />
            <span className="hidden text-xs text-white/75 capitalize sm:block">{day.condition}</span>
            <span className="font-mono text-sm tabular-nums">
              <span className="font-semibold text-white">{day.tempMax}°</span>
              <span className="text-white/70"> {day.tempMin}°</span>
            </span>
          </div>
        ))}
      </div>

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

/**
 * Matches WeatherForecast's grid (5 days, same gap and card height) so swapping the Suspense
 * fallback for the resolved forecast doesn't shift the rest of the page.
 */
export function WeatherForecastSkeleton() {
  return (
    <div className="grid max-w-3xl grid-cols-5 gap-1.5 sm:gap-3" role="status" aria-label="Loading the forecast">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="skeleton h-[104px] rounded-xl sm:h-[132px]" />
      ))}
    </div>
  );
}
