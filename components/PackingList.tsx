"use client";

import { useTransition } from "react";
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
  deleteAction: (itemId: string) => Promise<void>;
  generateAction: () => Promise<void>;
}

export function PackingList({
  items,
  addAction,
  toggleAction,
  deleteAction,
  generateAction,
}: PackingListProps) {
  const [pending, startTransition] = useTransition();

  function handleToggle(itemId: string, checked: boolean) {
    startTransition(async () => {
      await toggleAction(itemId, checked);
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
        className="self-start rounded-md border border-white/30 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Suggest packing items
      </button>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => handleToggle(item.id, event.target.checked)}
                  className="accent-accent-500 h-4 w-4 shrink-0"
                />
                <span className={`truncate ${item.checked ? "text-white/40 line-through" : "text-white/90"}`}>
                  {item.label}
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label={`Remove ${item.label}`}
                className="shrink-0 px-1 text-white/40 hover:text-white/80"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/70">
          Nothing yet — add an item below or generate suggestions.
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
