"use client";

import { useFormStatus } from "react-dom";

type Variant = "primary" | "danger" | "ghost" | "dangerGhost";

// `min-h-11` (44px) guarantees every submit button meets the minimum touch
// target regardless of variant/padding — some variants (danger, ghost) use
// tight text-sm padding that would otherwise land at ~32-36px tall.
const BASE =
  "inline-flex min-h-11 items-center justify-center transition-[background-color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: `${BASE} rounded-md bg-accent-500 px-4 py-2 font-medium text-ink-950 hover:bg-accent-400`,
  danger: `${BASE} rounded-md border border-danger-400/40 px-3 py-1.5 text-sm text-danger-300 hover:bg-danger-500/20`,
  ghost: `${BASE} rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10`,
  dangerGhost: `${BASE} rounded-md px-3 py-2 text-sm text-danger-300 hover:bg-danger-500/15`,
};

interface SubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Label shown while the enclosing form's server action is pending. */
  pendingLabel?: string;
  variant?: Variant;
}

/**
 * Submit button that disables itself and shows a spinner while the
 * enclosing <form action={...}> server action is pending.
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  className = "",
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${VARIANT_CLASSES[variant]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            aria-hidden="true"
            className={`h-4 w-4 animate-spin rounded-full border-2 ${
              variant === "primary"
                ? "border-ink-950/30 border-t-ink-950"
                : "border-current/30 border-t-current"
            }`}
          />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
