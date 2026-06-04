// Single place to tune the pitch recorders' cursor + dwell pacing.
// Lower = snappier. Consumed by tests/_demo/pitch/*.spec.ts.
// Holds are only a fraction of each clip (the rest is typing, cursor travel,
// and waitFor on step headings — all fixed). Measured: ch4-5 was 13.3s with
// ~3.8s of tunable holds, so to add ~6.5s and clear its 19.86s VO the per-step
// holds must roughly triple, not nudge. These values are sized from that.
export const PACE = {
  /** Cursor glide steps (moveAndClick / cursorTrack moveClick). Fewer = faster travel. */
  moveSteps: 6,
  /** ms the cursor dwells on a target before clicking. ~0 = click on arrival, no wait. */
  clickPause: 60,
  /** ms pause after filling a form field. */
  fieldHold: 40,
  /** ms pause between flow/wizard steps. */
  stepHold: 700,
  /** ms hold to let a key screen register (generated docs, confirmations). */
  readHold: 1000,
};
