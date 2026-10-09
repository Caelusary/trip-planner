import Link from "next/link";

/**
 * A blank boarding pass: the empty state for any list in the app. The
 * stub shows a placeholder code instead of a city, so an empty screen
 * still looks like this app (and tells you what will fill it).
 */
export function EmptyState({
  code = "???",
  title,
  body,
  actions = [],
}: {
  code?: string;
  title: string;
  body: string;
  actions?: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className="glass-card enter flex items-stretch overflow-hidden">
      <div className="ticket-stub flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 py-8">
        <span
          aria-hidden="true"
          className="font-display text-[1.75rem] leading-none font-semibold tracking-wide text-white/25"
        >
          {code}
        </span>
        <span className="ticket-label">Gate</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 px-5 py-6 sm:px-7">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="max-w-[52ch] text-sm leading-relaxed text-white/70">{body}</p>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.primary
                    ? "press bg-accent-500 hover:bg-accent-400 text-ink-950 inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold"
                    : "press inline-flex min-h-11 items-center rounded-md border border-white/25 px-4 text-sm text-white/90 hover:bg-white/10"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
