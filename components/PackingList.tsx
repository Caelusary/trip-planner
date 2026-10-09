"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/SubmitButton";

interface PackingItemView {
  id: string;
  label: string;
  checked: boolean;
}

interface PackingListProps {
  items: PackingItemView[];
  addAction: (formData: FormData) => Promise<void>;
  toggleAction: (itemId: string, checked: boolean) => Promise<void>;
  renameAction: (itemId: string, label: string) => Promise<void>;
  deleteAction: (itemId: string) => Promise<void>;
  generateAction: () => Promise<void>;
}

export function PackingList({
  items,
  addAction,
  toggleAction,
  renameAction,
  deleteAction,
  generateAction,
}: PackingListProps) {
  const [pending, startTransition] = useTransition();
  // The item currently being renamed (its in-progress edit text), only one
  // item at a time, so a plain id + draft pair is enough rather than a map.
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);

  function handleToggle(itemId: string, checked: boolean) {
    startTransition(async () => {
      await toggleAction(itemId, checked);
    });
  }

  function startEditing(item: PackingItemView) {
    setEditing({ id: item.id, label: item.label });
  }

  function commitEdit() {
    if (!editing) return;
    const label = editing.label.trim();
    const original = items.find((item) => item.id === editing.id)?.label;
    setEditing(null);
    // Skip the round trip for a no-op edit (blank or unchanged): an empty
    // label would also just fail server-side validation.
    if (!label || label === original) return;
    startTransition(async () => {
      await renameAction(editing.id, label);
    });
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      await deleteAction(itemId);
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      await generateAction();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="inline-flex min-h-11 items-center self-start rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Suggest packing items
      </button>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/5 pl-3"
            >
              <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1 text-sm">
                {/* The label pads the small native checkbox out to a 44px tap target. */}
                <label className="-ml-3 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                  <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => handleToggle(item.id, event.target.checked)}
                  aria-label={item.checked ? `Mark ${item.label} as not packed` : `Mark ${item.label} as packed`}
                  className="accent-accent-500 h-4 w-4 shrink-0"
                  />
                </label>
                {editing?.id === item.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editing.label}
                    onChange={(event) => setEditing({ id: item.id, label: event.target.value })}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitEdit();
                      } else if (event.key === "Escape") {
                        setEditing(null);
                      }
                    }}
                    className="glass-input min-h-11 min-w-0 flex-1 px-2 py-1 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    aria-label={`Rename ${item.label}`}
                    title="Click to rename"
                    className={`min-h-11 min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left transition hover:bg-white/10 ${
                      item.checked ? "text-white/40 line-through" : "text-white/90"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label={`Remove ${item.label}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/70">
          Nothing yet. Add an item below or get suggestions.
        </p>
      )}

      <form action={addAction} className="flex items-center gap-2">
        <input
          name="label"
          placeholder="Add an item…"
          required
          className="glass-input min-w-0 flex-1 px-3 py-2 text-sm"
        />
        <SubmitButton pendingLabel="Adding…" className="shrink-0 px-3 py-2 text-sm">
          Add
        </SubmitButton>
      </form>
    </div>
  );
}
