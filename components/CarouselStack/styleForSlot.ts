// Cover Flow: a large front card with two smaller peek cards fanned out on
// each side, touching/slightly overlapping it rather than leaving a gap,
// clipped at the stage's own edge (see CarouselStack.tsx's
// `overflow-hidden` + `mask-image`) rather than spilling past it.
//
// An earlier version here used 2 slots each side with a wider front card
// (60cqw) and wider peeks (36cqw) — verified live this read as too large/
// wide overall. This version drops both card sizes (front 40cqw, peek
// 24cqw — see the matching widths in CarouselStack.tsx) and adds a 3rd peek
// level each side (7 cards visible at once instead of 5), closer to the
// reference image's denser fan.
//
// Before that, an even earlier attempt tried 4 slots each side with a "true
// circle" (sin/cos) formula sized so the fan reached ~90% of the stage
// width or beyond — verified live that this pushed cards 74%+ past the
// stage's own box, which (with no clipping) spilled into the page's
// sidebar and off the browser window, and (once clipping was added) left
// almost nothing visible since the front card alone nearly filled the box.
export const SLOTS_BEHIND = 3;
export const SLOTS_AHEAD = 3;

// The offsets below AND the card widths in CarouselStack.tsx are all
// cqw-relative, not capped in rem — verified live that mixing the two (cqw
// offsets against rem-capped widths) is what caused a visible gap once the
// stage widened (page redesign, sidebar -> top nav): the offset kept
// scaling with the wider stage while the rem-capped cards didn't grow to
// match, so they drifted apart.
//
// Center-to-center offset of each peek level from the front card, in cqw
// (percent of the stage's own width, via `container-type: inline-size` on
// the stage) — indexed by magnitude (offset for slot ±1 is OFFSETS_CQW[0],
// ±2 is OFFSETS_CQW[1], etc). NOT an arithmetic progression (a constant
// step per level, like the 2-level version this replaced used) — solved
// instead from the actual box math, level by level, front-to-back:
//   front's box is [30, 70] (its own half-width, 20cqw, either side of
//   center). Each peek level's *box* is placed so its *visible* sliver
//   (past whatever's already drawn on top of it, front or a nearer peek)
//   comes out to roughly 67% / 42% / 17% of that peek's own 24cqw width —
//   a deliberately decreasing sequence, so the deck reads as fading out
//   toward the back rather than each level showing an equal amount. The
//   3rd level's remaining 17% also happens to land inside the stage's own
//   10%-edge `mask-image` fade (see CarouselStack.tsx), so in practice it
//   reads as a soft glow at the boundary rather than a hard-edged sliver.
//   A constant per-level step (as the 2-level version used) doesn't
//   produce this: with 3 levels the same box-math shows the 3rd level's
//   box entirely covered by the 2nd's — 0% visible, not a fading sliver —
//   because a fixed step doesn't account for how much of the *stage's*
//   remaining width each successive level actually has left to work with.
const OFFSETS_CQW = [24, 34, 38];
// How far back each depth level sits, in px — small enough that (combined
// with the stage's own `perspective`) peek cards stay close to full size
// rather than shrinking toward a vanishing point.
const RECEDE_PX_PER_LEVEL = 60;
// A constant tilt applied to every card (not part of the per-level rotation
// above) so the whole deck reads as viewed from slightly above rather than
// dead-on — the "overhead carousel" look. Small enough that card content
// stays fully legible; this is a viewing-angle cue, not a real perspective
// shift.
const OVERHEAD_TILT_DEG = 7;

export interface SlotStyle {
  transform: string;
  transformOrigin: string;
  opacity: number;
  zIndex: number;
  filter?: string;
}

export function styleForSlot(slot: number, dragPx: number): SlotStyle {
  const magnitude = Math.abs(slot);
  const side = slot < 0 ? -1 : 1;

  // Nearer-to-center cards must draw over farther ones on the same side
  // (they visually overlap by design) — magnitude-based zIndex, unaffected
  // by the 3D transform itself since these are independently-positioned
  // absolute elements, not one shared `preserve-3d` group.
  const zIndex = 40 - magnitude;

  if (magnitude === 0) {
    return {
      transform: `translate(calc(-50% + ${dragPx}px), 0) rotateX(${OVERHEAD_TILT_DEG}deg) rotate(${dragPx / 24}deg)`,
      transformOrigin: "center",
      opacity: 1,
      zIndex,
    };
  }

  const offsetCqw = side * OFFSETS_CQW[magnitude - 1];
  const recedePx = magnitude * RECEDE_PX_PER_LEVEL;
  // Darkens toward the back, floored well above black so the outermost
  // ring position still visibly reads as "a card", not a void.
  const brightness = Math.max(0.55, 1 - magnitude * 0.18);

  return {
    // No rotateY here — peek cards stay flat/upright, just offset sideways
    // and pushed back slightly (translateZ + the darkening below cue their
    // depth instead of a rotated "wheel" turn). Only the constant
    // overhead-viewing-angle tilt (rotateX, every card including the
    // front one) remains.
    transform: `translate(calc(-50% + ${offsetCqw}cqw), 0) translateZ(${-recedePx}px) rotateX(${OVERHEAD_TILT_DEG}deg)`,
    transformOrigin: "center",
    opacity: 1,
    zIndex,
    filter: `brightness(${brightness})`,
  };
}
