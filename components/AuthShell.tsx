/**
 * Layout for the signed-out screens (log in, sign up). Desktop splits into
 * a brand side, with a sample boarding pass showing what the app makes,
 * and the form; phones get the wordmark and a one-line pitch above the
 * form so the first screen still says what this is.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section aria-labelledby="brand-title" className="enter flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent-400 h-6 w-6">
              <path d="M12 3L4 20L12 16L20 20L12 3Z" fill="currentColor" fillOpacity="0.9" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight">Trip Planner</span>
          </div>
          <div className="flex flex-col gap-3">
            <p id="brand-title" className="page-title max-w-[16ch]">
              Every trip on one boarding pass.
            </p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-white/70 sm:text-base">
              Dates, stops, the forecast and your packing list, together in one place you can print
              or share.
            </p>
          </div>
          <SampleTicket />
        </section>
        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </main>
  );
}

/** Decorative: what a planned trip looks like. Hidden from assistive tech. */
function SampleTicket() {
  return (
    <div aria-hidden="true" className="hidden max-w-md lg:block">
      <div className="glass-card flex items-stretch overflow-hidden">
        <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-5">
          <span className="font-display text-accent-400 text-[1.75rem] leading-none font-semibold">LIS</span>
          <span className="ticket-label">PT</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-5 py-4">
          <div>
            <p className="font-display text-lg leading-tight font-semibold">Lisbon long weekend</p>
            <p className="text-sm text-white/70">3 stops · forecast ready</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Depart", "May 14"],
              ["Nights", "4"],
              ["Packed", "9/12"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="ticket-label">{label}</p>
                <p className="ticket-data text-sm text-white/90">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
