"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBudget, type Activity } from "@/lib/attractions";

export interface CarouselItem {
  id: string;
  name: string;
  city: string;
  country: string;
  image: string;
  description: string;
  rating: number;
  budgetMin: number;
  budgetMax: number;
  bestTime: string;
  activities: Activity[];
  funFact: string;
  /** Where a tap on the primary card should navigate to. */
  href: string;
}

interface CarouselStackProps {
  items: CarouselItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

const DRAG_COMMIT_PX = 90;
const TAP_MAX_PX = 6;
// Symmetric window: two visible peek cards stack behind the primary card on
// EACH side (slots ±1, ±2), plus one invisible pre-stage per side (±3) so a
// third consecutive step in either direction slides smoothly into place
// instead of popping into existence. The deck always reads as balanced —
// same depth left and right — instead of favoring one direction.
const SLOTS_BEHIND = 3;
const SLOTS_AHEAD = 3;

interface SlotStyle {
  transform: string;
  transformOrigin: string;
  opacity: number;
  zIndex: number;
  filter?: string;
}

// Every offset here is either a fixed pixel value or a percentage of the
// card's own (fluid) box — nothing depends on a known pixel width, so this
// works unchanged whether the card renders at 280px or 400px wide. Positive
// slots (ahead, to the right) and negative slots (behind, to the left) are
// exact mirrors of each other via `side`, so the stack is always visually
// symmetric around the primary card.
function styleForSlot(slot: number, dragPx: number): SlotStyle {
  const magnitude = Math.abs(slot);
  const side = slot < 0 ? -1 : 1;
  const corner = side < 0 ? "bottom left" : "bottom right";

  if (magnitude === 0) {
    return {
      transform: `translate(${dragPx}px, 0) rotate(${dragPx / 24}deg)`,
      transformOrigin: "center",
      opacity: 1,
      zIndex: 40,
    };
  }
  if (magnitude === 1) {
    return {
      transform: `translate(${side * 16}px, 14px) scale(0.88)`,
      transformOrigin: corner,
      opacity: 1,
      zIndex: 30,
    };
  }
  if (magnitude === 2) {
    // No dimming/blur here — every visible slot stays fully opaque and
    // sharp so the deck reads as a continuous stack of real cards, not
    // cards fading in and out at the edges.
    return {
      transform: `translate(${side * 32}px, 26px) scale(0.72)`,
      transformOrigin: corner,
      opacity: 1,
      zIndex: 20,
    };
  }
  // magnitude === 3: pre-staged one step beyond the second peek — fully
  // invisible, exists only so the next swipe in that direction has somewhere
  // to slide in from instead of popping into place.
  return {
    transform: `translate(${side * 20}%, 16%) scale(0.6)`,
    transformOrigin: corner,
    opacity: 0,
    zIndex: 0,
  };
}

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

// Full-screen detail view opened by the "i" info icon on any card. Instead
// of a modal that pops/fades in over the page, this panel is laid out at
// full-viewport size from the start and MORPHS into view: a CSS transform
// (FLIP technique) makes it visually start out scaled/positioned to exactly
// overlay the source card, then animates that transform back to identity —
// so it genuinely reads as the card itself growing into the fullscreen
// surface, not a separate dialog appearing on top of it. Closing reverses
// the same transform, shrinking the surface back down onto the card it
// came from before unmounting.
function AttractionMorphView({
  item,
  sourceRect,
  triggerEl,
  onClose,
}: {
  item: CarouselItem;
  sourceRect: DOMRect;
  /** The element that opened this dialog — focus returns here on close. */
  triggerEl: HTMLElement | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleClose() {
    setExpanded(false);
    window.setTimeout(onClose, 440);
  }

  // This is declared aria-modal, so it must behave like one for keyboard
  // and screen-reader users: move focus in on open, keep it inside the
  // dialog while open (Tab/Shift+Tab wrap instead of escaping to the page
  // behind the overlay), and hand it back to whatever opened the dialog
  // once it unmounts.
  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => {
      triggerEl?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsedTransform = `translate(${sourceRect.left}px, ${sourceRect.top}px) scale(${
    sourceRect.width / window.innerWidth
  }, ${sourceRect.height / window.innerHeight})`;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity"
        style={{ opacity: expanded ? 1 : 0, transitionDuration: "460ms" }}
        onClick={handleClose}
        aria-hidden="true"
      />
      {/*
        transform-origin pinned to the top-left so the translate/scale
        values above map directly onto viewport coordinates — no centering
        math needed, the collapsed transform just IS the source card's box.
      */}
      <div
        ref={dialogRef}
        className="absolute inset-0 flex flex-col overflow-y-auto bg-ink-900 shadow-2xl"
        style={{
          transformOrigin: "0 0",
          transform: expanded ? "translate(0px, 0px) scale(1, 1)" : collapsedTransform,
          borderRadius: expanded ? "0px" : "20px",
          transition:
            "transform 460ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 460ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} highlights`}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          ref={closeButtonRef}
          className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-white shadow-lg backdrop-blur transition hover:bg-ink-800"
          style={{
            opacity: expanded ? 1 : 0,
            transition: expanded ? "opacity 200ms ease 220ms" : "opacity 120ms ease",
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <div className="relative h-64 w-full shrink-0 overflow-hidden sm:h-80">
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
          <div className="absolute right-6 bottom-4 left-6">
            <p className="font-display text-2xl font-semibold text-white sm:text-3xl">{item.name}</p>
            <p className="text-accent-400/90 text-sm font-medium">
              @{item.city}, {item.country}
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
          <p className="text-accent-400 text-xs font-semibold tracking-wide uppercase">
            Best time to visit · {item.bestTime}
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-white/60 uppercase">
              Must-see activities
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {item.activities.map((activity) => (
                <div key={activity.name} className="overflow-hidden rounded-xl bg-white/5">
                  <div className="h-28 w-full overflow-hidden sm:h-32">
                    <img
                      src={activity.image}
                      alt={activity.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="px-2.5 py-2 text-xs leading-snug text-white/90">{activity.name}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="rounded-xl bg-white/5 p-4 text-sm text-white/70 italic">✨ {item.funFact}</p>
        </div>
      </div>
    </div>
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
  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

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
      router.push(items[index].href);
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
      <div className="relative isolate mx-auto h-[29rem] w-full max-w-[22rem]">
        {visible.map(({ item, slot }) => {
          const style = styleForSlot(slot, slot === 0 ? dragPx : 0);
          // Both peek directions are interactive: clicking a left peek
          // steps back to it, a right peek steps forward to it. Symmetric
          // on both sides — up to two peeks deep either way.
          const interactive = slot !== 0 && Math.abs(slot) <= 2;
          const selected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="absolute inset-0 will-change-transform"
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
                {/*
                  Pointer/touch users navigate to this destination by
                  tapping the card (handled by the pointerdown/up handlers
                  above). That gesture has no keyboard equivalent, so this
                  visually-hidden link gives keyboard users the same
                  destination — normally off-screen, it appears in place
                  when tabbed to.
                */}
                {slot === 0 && (
                  <Link
                    href={item.href}
                    className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-30 focus-visible:rounded-md focus-visible:bg-accent-500 focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-xs focus-visible:font-semibold focus-visible:text-ink-950 focus-visible:shadow-lg"
                  >
                    View {item.name} details
                  </Link>
                )}
                <div className="relative h-44 w-full shrink-0 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    draggable={false}
                    // Only the primary card is ever the user's immediate
                    // focus; the peeking cards behind/ahead of it (up to 6
                    // more <img>s mounted at once) can decode/paint whenever
                    // the browser gets around to it instead of competing for
                    // bandwidth and main-thread time with the active card.
                    loading={slot === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full select-none object-cover"
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
                    className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-sm text-white shadow-lg backdrop-blur transition hover:bg-ink-900"
                  >
                    <span aria-hidden="true">ⓘ</span>
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
                      💰 {formatBudget(item.budgetMin, item.budgetMax)}
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
                    }}
                    className={`mt-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
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

      <div className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Jump to ${item.name}`}
            aria-current={i === index ? "true" : undefined}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "bg-accent-400 w-5" : "w-1.5 bg-white/25 hover:bg-white/40"
            }`}
          />
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
