// The primary card keeps a fixed max width (22rem, see `max-w-[22rem]` on
// each card in CarouselStack.tsx) while the stage around it is now much
// wider (matches the page's max-w-3xl content column), so there's real room
// for peek cards to spread out horizontally instead of huddling right
// behind the primary card's edges.
//
// Symmetric window: THREE visible peek cards now stack behind the primary
// card on EACH side (slots ±1, ±2, ±3 — up from two), plus one invisible
// pre-stage per side (±4) so a fourth consecutive step in either direction
// slides smoothly into place instead of popping into existence. The deck
// always reads as balanced — same depth left and right — instead of
// favoring one direction.
export const SLOTS_BEHIND = 4;
export const SLOTS_AHEAD = 4;
// Primary card width stays capped at 22rem (see the `max-w-[22rem]` on each
// card in CarouselStack.tsx) — fixed, not fluid to the (much wider) stage —
// so widening the stage spreads the peeking cards apart instead of
// stretching the front card itself into an oversized landscape shape.

export interface SlotStyle {
  transform: string;
  transformOrigin: string;
  opacity: number;
  zIndex: number;
  filter?: string;
}

// Every card sits at `left: 50%` of the (wide) stage and is re-centered via
// the `translate(-50%, ...)` baked into every branch below; the horizontal
// offset added on top of that is what spreads each slot out from the
// primary card. That offset is expressed in `cqw` (percent of the STAGE's
// own current width, via the `container-type: inline-size` set on the
// stage element in CarouselStack.tsx) rather than a fixed px value — so the
// spread scales down proportionally on a narrow phone-width stage instead
// of staying a fixed pixel distance and overflowing past a much narrower
// box. The cqw values below are tuned so they land at the same pixel
// spread (~64/126/182/224px) at the stage's full max-w-3xl (768px) width.
// Positive slots (ahead, to the right) and negative slots (behind, to the
// left) are exact mirrors of each other via `side`, so the stack is always
// visually symmetric around the primary card.
export function styleForSlot(slot: number, dragPx: number): SlotStyle {
  const magnitude = Math.abs(slot);
  const side = slot < 0 ? -1 : 1;
  const corner = side < 0 ? "bottom left" : "bottom right";

  if (magnitude === 0) {
    return {
      transform: `translate(calc(-50% + ${dragPx}px), 0) rotate(${dragPx / 24}deg)`,
      transformOrigin: "center",
      opacity: 1,
      zIndex: 40,
    };
  }
  if (magnitude === 1) {
    return {
      transform: `translate(calc(-50% + ${side * 8.3}cqw), 16px) scale(0.9)`,
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
      transform: `translate(calc(-50% + ${side * 16.4}cqw), 30px) scale(0.78)`,
      transformOrigin: corner,
      opacity: 1,
      zIndex: 20,
    };
  }
  if (magnitude === 3) {
    // Third peek, newly visible now that the stage is wide enough to show
    // it without crowding the primary card — same fully-opaque treatment
    // as slots 1 and 2 so the extra depth reads as more stack, not a fade.
    return {
      transform: `translate(calc(-50% + ${side * 23.7}cqw), 42px) scale(0.66)`,
      transformOrigin: corner,
      opacity: 1,
      zIndex: 10,
    };
  }
  // magnitude === 4: pre-staged one step beyond the third peek — fully
  // invisible, exists only so the next swipe in that direction has somewhere
  // to slide in from instead of popping into place.
  return {
    transform: `translate(calc(-50% + ${side * 29}cqw), 52px) scale(0.56)`,
    transformOrigin: corner,
    opacity: 0,
    zIndex: 0,
  };
}
