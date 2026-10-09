import Link from "next/link";

/**
 * The title block every signed-in screen opens with: a display-size title,
 * one line of context underneath (counts, next departure), and at most one
 * action on the right. Keeps the rhythm identical from page to page.
 */
export function PageHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <header className="enter flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {meta && <p className="mt-2 text-sm text-white/70">{meta}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="press bg-accent-500 hover:bg-accent-400 text-ink-950 inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {action.label}
        </Link>
      )}
    </header>
  );
}
