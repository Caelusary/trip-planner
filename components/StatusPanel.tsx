/**
 * Departure-board style status panel for error and not-found screens: a
 * status chip ("Delayed", "Not found"), a title, one line of help, and the
 * way out. Error copy is announced via role="alert" by the caller's
 * choice of `alert`.
 */
export function StatusPanel({
  status,
  tone = "danger",
  title,
  body,
  alert = false,
  children,
}: {
  status: string;
  tone?: "danger" | "neutral";
  title: string;
  body: string;
  alert?: boolean;
  children?: React.ReactNode;
}) {
  const chip =
    tone === "danger"
      ? "border-danger-400/40 bg-danger-500/15 !text-danger-300"
      : "border-white/20 bg-white/5";
  return (
    <div className="glass-card enter flex w-full max-w-lg flex-col items-start gap-3 p-7">
      <span className={`ticket-label rounded-full border px-2.5 py-0.5 ${chip}`}>
        <span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
        {status}
      </span>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p role={alert ? "alert" : undefined} className="text-sm leading-relaxed text-white/75">
        {body}
      </p>
      {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const STATUS_BUTTON_PRIMARY =
  "press bg-accent-500 hover:bg-accent-400 text-ink-950 inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold";
export const STATUS_BUTTON_GHOST =
  "press inline-flex min-h-11 items-center rounded-md border border-white/25 px-4 text-sm text-white/90 hover:bg-white/10";

/**
 * Production builds replace a server error's message with a generic one
 * plus a digest, so only show the real message for errors that kept it
 * (client-side throws, which are written for users).
 */
export function userFacingMessage(error: Error & { digest?: string }, fallback: string) {
  return !error.digest && error.message ? error.message : fallback;
}
