"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface DeleteTripButtonProps {
  tripName: string;
  action: () => Promise<void>;
}

/**
 * Deleting a trip cascades to every stop on it and can't be undone, so it
 * gets a confirm dialog instead of firing straight off a form submit.
 */
export function DeleteTripButton({ tripName, action }: DeleteTripButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger-400/40 px-3 py-1.5 text-sm text-danger-300 transition hover:bg-danger-500/20"
      >
        Delete trip
      </button>
      {open && (
        <ConfirmDialog
          title="Delete this trip?"
          description={`This permanently deletes "${tripName}" and every stop on it. This can't be undone.`}
          confirmLabel="Delete trip"
          pendingLabel="Deleting…"
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
