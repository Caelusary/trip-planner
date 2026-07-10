"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatBudget } from "@/lib/attractions";
import { AttractionMorphView } from "./AttractionMorphView";
import { SLOTS_AHEAD, SLOTS_BEHIND, styleForSlot } from "./styleForSlot";
import type { CarouselItem, CarouselStackProps } from "./types";

const DRAG_COMMIT_PX = 90;
const TAP_MAX_PX = 6;
// The primary card keeps a fixed max width (22rem, see `max-w-[22rem]` on
// each card below) while the stage around it is now much wider (matches the
// page's max-w-3xl content column), so there's real room for peek cards to
// spread out horizontally instead of huddling right behind the primary
// card's edges.

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span className="text-sm tracking-tight" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? "text-accent-400" : "text-white/20"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function CarouselStack({ items, selectedIds, onToggleSelect }: CarouselStackProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [dragPx, setDragPx] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  // Gesture bookkeeping lives in refs, not state — pointerdown/pointerup can
  // land in the same React batch before a re-render commits, so reading
  // `dragging`/`dragStartX` back from state in that window would see stale
  // values (e.g. endDrag seeing dragging=false right after pointerdown set
  // it true) and silently drop the whole tap/swipe. Refs update immediately.
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  // Coalesces pointermove -> setDragPx to at most once per animation frame.
  // pointermove can fire far more often than the display refresh rate; at
  // one React state update (and re-render of every stacked card) per raw
  // event, a fast/precise input device can visibly stutter a drag gesture
  // that should be a smooth 60fps pull. Only the latest position within a
  // frame is kept — intermediate positions are never visually distinct.
  const rafRef = useRef<number | null>(null);
  const pendingDragPxRef = useRef(0);
  // The card whose morph view is open (plus the exact on-screen rect it
  // should grow FROM), or null when none is. Captured at click time from
  // the actual clicked card's DOM node, so the morph always originates from
  // wherever the user tapped — the primary card or a peek card alike.
  const [morph, setMorph] = useState<{
    item: CarouselItem;
    sourceRect: DOMRect;
    triggerEl: HTMLElement | null;
  } | null>(null);

  // Filtering (e.g. dragging the budget slider) changes `items` in place
  // without remounting this component, so a previously-valid index can end
  // up pointing past the end of a now-shorter array. Clamping here (rather
  // than remounting on every filter tweak) is what lets the stack animate
  // smoothly as the result set shrinks/grows instead of popping back to the
  // first card on every keystroke or slider tick.
  const [syncedItemsLength, setSyncedItemsLength] = useState(items.length);
  if (syncedItemsLength !== items.length) {
    setSyncedItemsLength(items.length);
    setIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }

  const atStart = index === 0;
  const atEnd = index === items.length - 1;

  // Relative moves use a functional update so two events arriving before
  // React re-renders (e.g. a fast double-click) each advance by one step
  // instead of both resolving against the same stale `index`.
  function step(delta: number) {
    setIndex((current) => Math.min(Math.max(current + delta, 0), items.length - 1));
  }

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), items.length - 1));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Capture can throw for a pointerId with no genuine active session (some
    // synthetic/automated input) — the drag still works fine without it, so
    // don't let that abort the gesture.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignored — see comment above.
    }
    isDraggingRef.current = true;
    dragStartXRef.current = event.clientX;
    setDragActive(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    pendingDragPxRef.current = event.clientX - dragStartXRef.current;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setDragPx(pendingDragPxRef.current);
    });
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const delta = event.clientX - dragStartXRef.current;
    isDraggingRef.current = false;
    setDragActive(false);
    setDragPx(0);

    if (Math.abs(delta) < TAP_MAX_PX) {
      // Tapping the card itself just... does nothing further (it's already
      // showing everything at a glance); it no longer jumps to the plan-a-
      // trip form. That jump-and-autofill now only happens from "Add to
      // Trip" below, which is the actual point where the user has expressed
      // intent to plan a trip here.
      return;
    }
    if (delta <= -DRAG_COMMIT_PX && !atEnd) step(1);
    else if (delta >= DRAG_COMMIT_PX && !atStart) step(-1);
  }

  const visible = useMemo(() => {
    const range: { item: CarouselItem; slot: number }[] = [];
    for (let offset = -SLOTS_BEHIND; offset <= SLOTS_AHEAD; offset++) {
      const i = index + offset;
      if (i >= 0 && i < items.length) range.push({ item: items[i], slot: offset });
    }
    return range;
  }, [items, index]);


  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4">
      {/*
        `isolate` (CSS `isolation: isolate`) forces this to be its own
        stacking context. Without it, the z-index values below (0–40) are
        compared against whatever else lives in the page's root stacking
        context — including totally unrelated controls elsewhere on the
        page — since a plain `position: relative` element with no z-index
        does NOT contain its descendants' stacking on its own. `isolate`
        guarantees the carousel's stack can never bleed out and cover, or be
        covered by, anything outside this box (e.g. the filters rendered
        above it).
      */}
      <div
        className= "relative isolate mx-auto h-[29rem] w-full max-w-3xl [container-type:inline-size]"
        tabIndex={0}
        onKeyDown={(event) => {
          if(event.key === "ArrowLeft") step(-1);
          if(event.key === "ArrowRight") step(1);
        }}
        >
        {visible.map(({ item, slot }) => {
          const style = styleForSlot(slot, slot === 0 ? dragPx : 0);
          // Both peek directions are interactive: clicking a left peek
          // steps back to it, a right peek steps forward to it. Symmetric
          // on both sides — up to three peeks deep either way.
          const interactive = slot !== 0 && Math.abs(slot) <= 3;
          const selected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="absolute top-0 left-1/2 h-full w-full max-w-[22rem] will-change-transform"
              style={{
                transform: style.transform,
                transformOrigin: style.transformOrigin,
                opacity: style.opacity,
                zIndex: style.zIndex,
                filter: style.filter,
                transition:
                  dragActive && slot === 0
                    ? "none"
                    : "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease, filter 420ms ease",
                pointerEvents: slot === 0 || interactive ? "auto" : "none",
                touchAction: slot === 0 ? "none" : undefined,
              }}
              onPointerDown={slot === 0 ? handlePointerDown : undefined}
              onPointerMove={slot === 0 ? handlePointerMove : undefined}
              onPointerUp={slot === 0 ? endDrag : undefined}
              onPointerCancel={slot === 0 ? endDrag : undefined}
              onClick={interactive ? () => goTo(index + slot) : undefined}
              role={interactive ? "button" : undefined}
              aria-label={interactive ? `Jump to ${item.name}` : undefined}
              aria-hidden={slot !== 0}
            >
              <div
                className={`glass-card relative flex h-full w-full flex-col overflow-hidden ${
                  slot === 0 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                }`}
              >
                <div className="relative h-44 w-full shrink-0 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    draggable={false}
                    // Only the primary card is ever the user's immediate
                    // focus; the peeking cards behind/ahead of it (up to 6
                    // more images mounted at once) can decode/paint whenever
                    // the browser gets around to it instead of competing for
                    // bandwidth and main-thread time with the active card.
                    loading={slot === 0 ? "eager" : "lazy"}
                    sizes="(min-width: 768px) 352px, 90vw"
                    className="select-none object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-900 to-transparent" />
                  {/*
                    Replaces the old hover-only overlay: a small, always-
                    visible info affordance that opens a full detail modal
                    on click/tap. No hidden-until-hover content — reachable
                    identically by mouse, touch, and keyboard.
                  */}
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      // Walk up to the actual card element so the morph
                      // view knows exactly where on screen to grow from —
                      // whichever card's icon was tapped, not just slot 0.
                      const triggerEl = event.currentTarget as HTMLElement;
                      const card = triggerEl.closest(".glass-card");
                      const rect = card?.getBoundingClientRect();
                      if (rect) setMorph({ item, sourceRect: rect, triggerEl });
                    }}
                    aria-label={`Show highlights for ${item.name}`}
                    className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-white shadow-lg backdrop-blur transition hover:bg-ink-900"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5.5" />
                      <circle cx="12" cy="7.75" r="0.75" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-4">
                  {/*
                    No `truncate`, no line-clamp on the name — it wraps
                    instead of being cut off. `min-h` reserves room for two
                    lines so short and long names occupy the same height
                    (keeps every card the same size) without ever hiding
                    part of a long one like "Mexico City Historic Center".
                  */}
                  <p className="font-display min-h-[3.25rem] text-lg leading-tight font-semibold text-white">
                    {item.name}
                  </p>
                  <p className="text-accent-400/90 text-xs font-medium">
                    @{item.city}, {item.country}
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Stars rating={item.rating} />
                    <span className="text-xs text-white/60">{item.rating.toFixed(1)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                      {formatBudget(item.budgetMin, item.budgetMax)}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
                      {item.bestTime}
                    </span>
                  </div>

                  {/*
                    Its own button, separate from the card's tap-to-navigate
                    handler above (stopPropagation on both pointerdown and
                    click) — tapping anywhere else on the card never adds it
                    to the trip, only this button does.
                  */}
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleSelect(item.id);
                      // Only jump to (and autofill) the plan-a-trip form when
                      // this add is what expressed that intent — toggling
                      // back off shouldn't yank the user down the page.
                      if (!selected) router.push(item.href);
                    }}
                    className={`relative mt-1 rounded-full px-3 py-1.5 text-xs font-semibold transition before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] ${
                      selected
                        ? "bg-white/10 text-white/70 hover:bg-white/15"
                        : "bg-accent-500 text-ink-950 hover:bg-accent-400"
                    }`}
                  >
                    {selected ? "Added ✓" : "Add to Trip"}
                  </button>

                  <p className="mt-auto line-clamp-2 text-[11px] text-white/50">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          aria-label="Previous destination"
          disabled={atStart}
          onClick={() => step(-1)}
          className="absolute top-1/2 left-2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/90 text-lg text-white shadow-lg backdrop-blur transition enabled:hover:scale-105 enabled:hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next destination"
          disabled={atEnd}
          onClick={() => step(1)}
          className="absolute top-1/2 right-2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/90 text-lg text-white shadow-lg backdrop-blur transition enabled:hover:scale-105 enabled:hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="flex items-center gap-2">
        {items.map((item, i) => (
          // The button itself is a real 24px (WCAG AA minimum) flex item —
          // not just the tiny visual dot — so the tap target is comfortably
          // larger than what's drawn. The dot stays visually small via the
          // nested span; sizing the hit area with real layout (padding/gap)
          // rather than a negative-margin hit-slop avoids adjacent dots'
          // enlarged tap areas overlapping and stealing each other's taps.
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Jump to ${item.name}`}
            aria-current={i === index ? "true" : undefined}
            className="group flex h-6 w-6 shrink-0 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "bg-accent-400 w-5" : "w-1.5 bg-white/25 group-hover:bg-white/40"
              }`}
            />
          </button>
        ))}
      </div>

      {morph && (
        <AttractionMorphView
          item={morph.item}
          sourceRect={morph.sourceRect}
          triggerEl={morph.triggerEl}
          onClose={() => setMorph(null)}
        />
      )}
    </div>
  );
}
