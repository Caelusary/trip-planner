"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BudgetTier } from "@/lib/attractions";

export interface CarouselItem {
  id: string;
  name: string;
  city: string;
  country: string;
  image: string;
  description: string;
  rating: number;
  budgetTier: BudgetTier;
  budgetLabel: string;
  bestTime: string;
  highlights: [string, string, string];
  funFact: string;
  /** Where a tap on the primary card should navigate to. */
  href: string;
}

interface CarouselStackProps {
  items: CarouselItem[];
  followedIds: Set<string>;
  onToggleFollow: (id: string) => void;
}

const DRAG_COMMIT_PX = 90;
const TAP_MAX_PX = 6;
// The stack renders a small window of items around the active index instead
// of just the primary card. Two behind: the immediately-previous card (kept
// VISIBLE as a left-side peek, so advancing forward doesn't make the old
// primary vanish — it slides left and settles in behind the new primary)
// plus one further invisible pre-stage so a second backward step also
// slides in smoothly instead of popping into existence. Symmetric on the
// forward side: one visible peek, one dimmer visible peek, one invisible
// pre-stage.
const SLOTS_BEHIND = 2;
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
// works unchanged whether the card renders at 280px or 400px wide.
function styleForSlot(slot: number, dragPx: number): SlotStyle {
  if (slot === 0) {
    return {
      transform: `translate(${dragPx}px, 0) rotate(${dragPx / 24}deg)`,
      transformOrigin: "center",
      opacity: 1,
      zIndex: 40,
    };
  }
  if (slot === 1) {
    // transform-origin sits at the card's own bottom-right corner, so
    // scaling shrinks toward that corner and the translate below moves the
    // (unshrunk) corner exactly that many pixels past the primary card's
    // edge — the peek amount is the translate value, full stop, regardless
    // of the card's actual rendered width.
    return {
      transform: "translate(16px, 14px) scale(0.88)",
      transformOrigin: "bottom right",
      opacity: 1,
      zIndex: 30,
    };
  }
  if (slot === 2) {
    return {
      transform: "translate(32px, 26px) scale(0.72)",
      transformOrigin: "bottom right",
      opacity: 0.85,
      zIndex: 20,
      filter: "blur(0.5px)",
    };
  }
  if (slot === -1) {
    // Mirror of slot 1: the card that just receded from the primary
    // position slides left and settles here, visibly tucked behind the new
    // primary (lower z-index) rather than fading away.
    return {
      transform: "translate(-16px, 14px) scale(0.88)",
      transformOrigin: "bottom left",
      opacity: 1,
      zIndex: 30,
    };
  }
  if (slot === -2) {
    // Invisible pre-stage mirroring slot 3, so a second consecutive
    // backward step also slides in instead of popping into place.
    return {
      transform: "translate(-20%, 16%) scale(0.6)",
      transformOrigin: "bottom left",
      opacity: 0,
      zIndex: 0,
    };
  }
  // slot === 3: pre-staged one step beyond the tertiary card — fully
  // invisible, exists only so the next forward swipe has somewhere to slide
  // in from.
  return {
    transform: "translate(20%, 16%) scale(0.6)",
    transformOrigin: "bottom right",
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

// Also revealed on hover (mouse) via `group-hover`, but hover has no
// keyboard or touch equivalent — most visitors (touch devices have no real
// hover state; keyboard users never trigger :hover at all) could never see
// this content otherwise. `forceOpen` is driven by an explicit, focusable
// toggle button rendered alongside the image so the same content is always
// reachable without a pointer.
function HighlightsOverlay({
  item,
  id,
  forceOpen,
}: {
  item: CarouselItem;
  id: string;
  forceOpen: boolean;
}) {
  return (
    <div
      id={id}
      className={`absolute inset-0 z-10 flex flex-col justify-center gap-1.5 bg-gradient-to-b from-black/92 via-black/85 to-black/92 p-3 transition-opacity duration-300 ${
        forceOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <p className="text-accent-400 text-[10px] font-semibold tracking-wide uppercase">
        Best time · {item.bestTime}
      </p>
      <ul className="flex flex-col gap-1 text-[11px] leading-snug text-white/90">
        {item.highlights.map((highlight, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-accent-400 shrink-0">★</span>
            <span className="line-clamp-1">{highlight}</span>
          </li>
        ))}
      </ul>
      <p className="mt-0.5 line-clamp-2 text-[10px] text-white/60 italic">✨ {item.funFact}</p>
    </div>
  );
}

export function CarouselStack({ items, followedIds, onToggleFollow }: CarouselStackProps) {
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
  // Keyboard/touch-reachable equivalent of the hover-only highlights
  // overlay: the id of the card whose overlay is pinned open via its info
  // toggle button, or null when nothing is pinned (hover still works
  // independently via CSS).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const atStart = index === 0;
  const atEnd = index === items.length - 1;

  // Relative moves use a functional update so two events arriving before
  // React re-renders (e.g. a fast double-click) each advance by one step
  // instead of both resolving against the same stale `index`. Both this and
  // `goTo` also close any pinned-open highlights overlay so it can't stay
  // open on a card that has scrolled out of the primary position.
  function step(delta: number) {
    setExpandedId(null);
    setIndex((current) => Math.min(Math.max(current + delta, 0), items.length - 1));
  }

  function goTo(next: number) {
    setExpandedId(null);
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
        covered by, anything outside this box (e.g. the budget filter
        <select> rendered above it).
      */}
      <div className="relative isolate mx-auto h-[29rem] w-full max-w-[22rem]">
        {visible.map(({ item, slot }) => {
          const style = styleForSlot(slot, slot === 0 ? dragPx : 0);
          // Both peek directions are interactive: clicking a left peek
          // steps back to it, a right peek steps forward to it.
          const interactive = slot === -1 || slot === 1 || slot === 2;
          const following = followedIds.has(item.id);
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
                <div className="group relative h-44 w-full shrink-0 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    draggable={false}
                    // Only the primary card is ever the user's immediate
                    // focus; the peeking cards behind/ahead of it (up to 5
                    // more <img>s mounted at once) can decode/paint whenever
                    // the browser gets around to it instead of competing for
                    // bandwidth and main-thread time with the active card.
                    loading={slot === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full select-none object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-900 to-transparent" />
                  <HighlightsOverlay
                    item={item}
                    id={`highlights-${item.id}`}
                    forceOpen={expandedId === item.id}
                  />
                  {slot === 0 && (
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedId((current) => (current === item.id ? null : item.id));
                      }}
                      aria-expanded={expandedId === item.id}
                      aria-controls={`highlights-${item.id}`}
                      aria-label={
                        expandedId === item.id
                          ? `Hide highlights for ${item.name}`
                          : `Show highlights for ${item.name}`
                      }
                      className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-base text-white shadow-lg backdrop-blur transition hover:bg-ink-900"
                    >
                      <span aria-hidden="true">{expandedId === item.id ? "✕" : "ⓘ"}</span>
                    </button>
                  )}
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
                      💰 {item.budgetLabel}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
                      {item.bestTime}
                    </span>
                  </div>

                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFollow(item.id);
                    }}
                    className={`mt-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      following
                        ? "bg-white/10 text-white/70 hover:bg-white/15"
                        : "bg-accent-500 text-ink-950 hover:bg-accent-400"
                    }`}
                  >
                    {following ? "Following" : "Follow"}
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
          <span
            key={item.id}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "bg-accent-400 w-5" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
