"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RetryImage } from "@/components/RetryImage";
import { formatBudget } from "@/lib/attractions";
import { AttractionMorphView } from "./AttractionMorphView";
import { SLOTS_AHEAD, SLOTS_BEHIND, styleForSlot } from "./styleForSlot";
import type { CarouselItem, CarouselStackProps } from "./types";

const DRAG_COMMIT_PX = 90;
const TAP_MAX_PX = 6;
// Width of the fade at each edge of the stage, as a percent of its own
// width — see the `mask-image` on the stage div below.
const EDGE_FADE_PCT = 10;

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

  // Circular: the deck wraps around in both directions rather than
  // stopping at the ends, so stepping past the last item lands back on the
  // first (and vice versa). `((n % len) + len) % len` wraps correctly for
  // negative results too, unlike a plain `%` (JS's modulo keeps the sign of
  // its left operand, so `-1 % 5` is `-1`, not `4`).
  const canNavigate = items.length > 1;

  // Relative moves use a functional update so two events arriving before
  // React re-renders (e.g. a fast double-click) each advance by one step
  // instead of both resolving against the same stale `index`.
  function step(delta: number) {
    setIndex((current) => {
      const len = items.length;
      return len === 0 ? current : ((current + delta) % len + len) % len;
    });
  }

  function goTo(next: number) {
    const len = items.length;
    if (len === 0) return;
    setIndex(((next % len) + len) % len);
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
      return;
    }
    if (delta <= -DRAG_COMMIT_PX) step(1);
    else if (delta >= DRAG_COMMIT_PX) step(-1);
  }

  const visible = useMemo(() => {
    const len = items.length;
    if (len === 0) return [];
    const range: { item: CarouselItem; slot: number }[] = [];
    // Dedup via `seen`: when there are fewer items than slots (SLOTS_BEHIND
    // + SLOTS_AHEAD + 1 = 7), wrapping would otherwise place the same
    // physical item at two different slots at once (visually a duplicate
    // card), since the loop keeps circling back over a short list.
    const seen = new Set<number>();
    // Center-out order (0, -1, +1, -2, +2, -3, +3) — NOT a plain
    // left-to-right sweep from -SLOTS_BEHIND to +SLOTS_AHEAD. Verified live:
    // with a narrow category filter (e.g. 3 results), a left-to-right sweep
    // let the earliest, most-negative offsets claim every available index
    // before the loop ever reached 0 — so the dedup above skipped slot 0
    // (and every positive slot) entirely, leaving the front card empty and
    // every item bunched onto the far-left, heavily-faded depth levels.
    // Processing 0 first guarantees `items[index]` always lands at the
    // front slot; each further offset only adds a card if a distinct item
    // remains, so the fan shrinks symmetrically as the list runs out
    // instead of collapsing lopsided to one side.
    const offsets: number[] = [0];
    for (let depth = 1; depth <= Math.max(SLOTS_BEHIND, SLOTS_AHEAD); depth++) {
      if (depth <= SLOTS_BEHIND) offsets.push(-depth);
      if (depth <= SLOTS_AHEAD) offsets.push(depth);
    }
    for (const offset of offsets) {
      const i = ((index + offset) % len + len) % len;
      if (seen.has(i)) continue;
      seen.add(i);
      range.push({ item: items[i], slot: offset });
    }
    return range;
  }, [items, index]);

  // Rank (1 = highest-rated) of every currently-shown destination by its
  // own rating — independent of index/slot position, so the "Top N"
  // caption below reflects how good a destination actually is, not just
  // where it happens to sit in the deck. `[...items].sort` copies rather
  // than sorting `items` in place (which would silently reshuffle the
  // deck's own order out from under `visible` above).
  const ratingRank = useMemo(() => {
    const rankById = new Map<string, number>();
    [...items]
      .sort((a, b) => b.rating - a.rating)
      .forEach((item, i) => rankById.set(item.id, i + 1));
    return rankById;
  }, [items]);
  const currentRank = ratingRank.get(items[index]?.id ?? "");

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4">
      {/*
        `isolate` (CSS `isolation: isolate`) forces this to be its own
        stacking context, so the z-index values below (0–40) only ever
        compete against each other, never against unrelated page content.
        `overflow-hidden` clips the fan at this box's own edge — cards
        fade/rotate out of view at the boundary instead of spilling past it.
        That clip is only survivable because the front card is deliberately
        narrower than this stage (40cqw, see the front card's width below) — clipping a
        stage barely wider than its own front card would leave peek cards
        nothing to peek *into* (verified live: with the front card at ~100%
        of the stage, every peek card landed 91–100% covered).

        The `mask-image` softens that clip: without it, whichever peek card
        sits right at the edge gets sliced by a hard straight line the
        instant `overflow-hidden` cuts it off. Fading the outer
        EDGE_FADE_PCT of the stage to transparent means that same card
        dissolves out instead, so the boundary reads as a soft edge rather
        than a visible seam.
      */}
      <div
        className="relative isolate mx-auto h-[29rem] w-full max-w-5xl [container-type:inline-size] [perspective:1200px]"
        tabIndex={0}
        onKeyDown={(event) => {
          if(event.key === "ArrowLeft") step(-1);
          if(event.key === "ArrowRight") step(1);
        }}
        >
        {/*
          The mask + clip live on this inner wrapper, not the outer stage —
          the prev/next buttons below are positioned at the outer stage's own
          left-2/right-2 edges, exactly where a mask on their own container
          would fade them toward transparent along with the cards. Keeping
          them as a sibling (not a descendant) of the masked box means they
          stay at full opacity regardless of the card fan's edge fade.
        */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage: `linear-gradient(to right, transparent 0%, black ${EDGE_FADE_PCT}%, black ${100 - EDGE_FADE_PCT}%, transparent 100%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent 0%, black ${EDGE_FADE_PCT}%, black ${100 - EDGE_FADE_PCT}%, transparent 100%)`,
          }}
        >
        {visible.map(({ item, slot }) => {
          const style = styleForSlot(slot, slot === 0 ? dragPx : 0);
          const interactive = slot !== 0;
          const selected = selectedIds.has(item.id);
          // Only the front card carries the full info panel (name, rating,
          // price, description, Add-to-Trip button) — side cards are plain
          // photo tiles, tap one to bring it to the front where its info
          // appears. Matches the reference image (side cards are bare
          // photos) and, structurally, is what makes the narrower/clipped
          // stage above workable: a photo tile can read fine at 50% visible,
          // a card packed with text can't.
          return (
            <div
              key={item.id}
              className={`absolute top-0 left-1/2 h-full will-change-transform ${
                slot === 0
                  ? // No rem cap — see styleForSlot.ts's top comment: capping
                    // this while the offset scales with the stage (cqw) is
                    // exactly what let the two drift apart into a visible
                    // gap once the stage widened.
                    "w-[40cqw]"
                  : // Side tiles don't stretch to the stage's full height —
                    // that would stretch a wide-but-short-capped tile into a
                    // sliver, not the roughly photo-shaped tile the
                    // reference shows. `flex items-center` centers the
                    // fixed-height tile within this (still full-height,
                    // so the horizontal transform math above stays
                    // unaffected) wrapper instead. Also no rem cap, for the
                    // same reason as the front card above.
                    "flex w-[24cqw] items-center"
              }`}
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
              {slot === 0 ? (
                <div className="glass-card border-white/40 relative flex h-full w-full flex-col overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing">
                  <div className="relative h-44 w-full shrink-0 overflow-hidden">
                    <RetryImage
                      src={item.image}
                      alt={item.name}
                      fill
                      draggable={false}
                      // All slots eager: `loading="lazy"` on the peeking
                      // cards never actually triggered here — verified live
                      // that every lazy-loaded peek image stayed stuck at
                      // `complete: false` / `naturalWidth: 0` indefinitely
                      // (even ones whose network request had already
                      // succeeded), an IntersectionObserver interaction
                      // quirk with this stack's 3D transforms/will-change
                      // layers. Since at most 7 cards are ever mounted at
                      // once (a small, bounded set, not an unbounded list),
                      // eagerly loading all of them is cheap — but it does
                      // mean they all hit Wikimedia at once, which is why
                      // this is RetryImage (see that file) rather than plain
                      // Image: verified live that eager-loading this many at
                      // once reliably 429s several of them, and without a
                      // retry they'd stay permanently broken instead of
                      // recovering once the rate limit window passes.
                      loading="eager"
                      sizes="(min-width: 1024px) 410px, 40vw"
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
                        // view knows exactly where on screen to grow from.
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

                    <p className="line-clamp-2 text-[11px] text-white/50">{item.description}</p>

                    {/*
                      The panel's one primary action, so it's styled and
                      sized to match — not just another metadata pill. Same
                      teal/ink treatment and font-weight as the "Plan a trip"
                      CTA in TopNav.tsx, and `h-11` (44px) meets the min touch
                      target on its own real box rather than relying on an
                      invisible hit-slop hack. `mt-auto` pins it to the
                      panel's bottom edge — the same spot on every card
                      regardless of how much room the name/description above
                      it take up — and `w-full` gives it the full-width
                      footer-CTA shape common to card layouts, instead of a
                      small pill lost between the badges and the description.
                      Still its own button, separate from the card's
                      tap-to-navigate handler above (stopPropagation on both
                      pointerdown and click) — tapping anywhere else on the
                      card never adds it to the trip, only this button does.
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
                      className={`mt-auto flex h-11 w-full shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                        selected
                          ? "bg-white/10 text-white/70 hover:bg-white/15"
                          : "bg-accent-500 text-ink-950 hover:bg-accent-400"
                      }`}
                    >
                      {selected ? "Added ✓" : "Add to Trip"}
                    </button>
                  </div>

                  {/*
                    Glossy floor reflection — a mirrored, fading copy of just
                    the photo, matching a classic Cover Flow look. A plain
                    CSS background-image (not a second RetryImage) so it
                    doesn't duplicate a real network request per card —
                    purely decorative, so a slightly lower-fidelity render is
                    an acceptable trade.
                  */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-full left-0 h-16 w-full origin-top -scale-y-100 opacity-30 [-webkit-mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)]"
                    style={{
                      backgroundImage: `url(${item.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </div>
              ) : (
                // Side/peek cards are bare photo tiles — no name, rating,
                // price, or button. Tap one to bring it to the front, where
                // its full info panel appears above. Fixed height (not
                // `h-full`, see the wrapper's `flex items-center` above) so
                // a card whose width now scales with the stage (24cqw, no
                // rem cap — see styleForSlot.ts) still stays roughly
                // photo-shaped instead of stretching into a tall sliver.
                <div className="glass-card relative h-44 w-full cursor-pointer overflow-hidden">
                  <RetryImage
                    src={item.image}
                    alt={item.name}
                    fill
                    draggable={false}
                    loading="eager"
                    sizes="(min-width: 1024px) 246px, 24vw"
                    className="select-none object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-full left-0 h-10 w-full origin-top -scale-y-100 opacity-25 [-webkit-mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent)]"
                    style={{
                      backgroundImage: `url(${item.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        </div>

        <button
          type="button"
          aria-label="Previous destination"
          disabled={!canNavigate}
          onClick={() => step(-1)}
          className="border-ink-900/10 absolute top-1/2 left-2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-ink-900 shadow-[0_2px_8px_rgba(0,0,0,0.35),0_0_0_4px_rgba(0,0,0,0.15)] transition enabled:hover:scale-110 enabled:hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next destination"
          disabled={!canNavigate}
          onClick={() => step(1)}
          className="border-ink-900/10 absolute top-1/2 right-2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white text-ink-900 shadow-[0_2px_8px_rgba(0,0,0,0.35),0_0_0_4px_rgba(0,0,0,0.15)] transition enabled:hover:scale-110 enabled:hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/*
        `relative z-10`: the circular 3D stage above has no overflow
        clipping (peek cards are meant to spread past its own box during
        the ring transform), so without an explicit stacking priority here
        a peek card mid-transition could visually paint over these dots —
        this guarantees they always win regardless of how far a card's
        transform extends beyond the stage.
      */}
      <div className="relative z-10 flex items-center gap-2">
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

      {currentRank != null && (
        <p className="relative z-10 text-xs tracking-wide text-white/40">
          Top {currentRank} destination
        </p>
      )}

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
