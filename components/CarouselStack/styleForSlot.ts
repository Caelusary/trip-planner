// Cover Flow, with progressive rotation — matches the reference image the
// user pointed to: cards overlap in a receding, darkening stack (Cover
// Flow's classic look) AND each successive card is tilted further than the
// one before it, so the deck visibly *curves* toward the back instead of
// every side card sharing one flat angle. An earlier version used one
// constant tilt per side (true to Cover Flow, but read as a fixed fan, not
// something "going around") — this keeps Cover Flow's stacking/overlap/
// darkening but swaps in a per-depth angle so it reads as wrapping around
// a curve.
export const SLOTS_BEHIND = 4;
export const SLOTS_AHEAD = 4;
// Outermost ring position's tilt. Kept under 90deg deliberately: past 90,
// `rotateY` shows a card's mirrored backside (no separate back face is
// defined here), flipping its text into unreadable mirror noise. 78deg
// stays just shy of that while still reading as "nearly edge-on, curving
// out of view" at the deepest slot.
const MAX_TILT_DEG = 78;
const TILT_STEP_DEG = MAX_TILT_DEG / SLOTS_AHEAD;
// Horizontal step between consecutively stacked cards on the same side, in
// cqw (percent of the stage's own current width, via the
// `container-type: inline-size` set on the stage element) — smaller than a
// card's own rendered width so each one visibly overlaps its neighbor
// (stacked deck, not separated tiles), but wide enough that a real portion
// of each card shows past the one in front of it. Verified live that the
// original 11/15 values here read as "cramped" — the first peek card sat
// almost entirely hidden behind the primary card's own half-width — these
// are roughly 60% wider.
const STEP_CQW = 17;
// First side card's offset from center.
const BASE_OFFSET_CQW = 23;

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
  // (they visually overlap by design, see STEP_CQW above) — magnitude-based
  // zIndex, unaffected by the 3D transform itself since these are
  // independently-positioned absolute elements, not one shared
  // `preserve-3d` group.
  const zIndex = 40 - magnitude;

  if (magnitude === 0) {
    return {
      transform: `translate(calc(-50% + ${dragPx}px), 0) rotate(${dragPx / 24}deg)`,
      transformOrigin: "center",
      opacity: 1,
      zIndex,
    };
  }

  const offsetCqw = BASE_OFFSET_CQW + (magnitude - 1) * STEP_CQW;
  const tiltDeg = magnitude * TILT_STEP_DEG;
  const recedePx = magnitude * 46;
  const scale = Math.max(0.56, 1 - magnitude * 0.095);
  // Darkens toward the back, floored well above black so the outermost
  // ring position still visibly reads as "a card", not a void — matches
  // the reference image's near-but-not-fully-black outer edge.
  const brightness = Math.max(0.4, 1 - magnitude * 0.15);

  return {
    // translate/translateZ position the card first (independent of
    // rotation); rotateY comes last so it tilts each card in place around
    // its own center rather than further displacing it — that's what lets
    // STEP_CQW's overlap and the progressive tilt both hold at once
    // instead of fighting each other.
    transform: `translate(calc(-50% + ${side * offsetCqw}cqw), 0) translateZ(${-recedePx}px) rotateY(${side * tiltDeg}deg) scale(${scale})`,
    transformOrigin: "center",
    opacity: 1,
    zIndex,
    filter: `brightness(${brightness})`,
  };
}
