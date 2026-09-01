// The sky map's time mode. Pure: no DOM, no clock of its own; app.js passes
// "now" in. test/time-mode.test.mjs pins it.
//
// Dragging the slider shows a moment other than now. That moment is pinned
// to the instant the drag began (anchorJd), so a refresh cannot creep it;
// returning to 0 goes back to following the clock.

// state: {offsetMin, anchorJd} or null at start.
export function scrub(state, offsetMin, nowJd) {
  if (!offsetMin) return { offsetMin: 0, anchorJd: null };
  const anchorJd = state?.anchorJd ?? nowJd;
  return { offsetMin, anchorJd };
}

export function shownJd(state, nowJd) {
  return state.offsetMin ? state.anchorJd + state.offsetMin / 1440 : nowJd;
}

// What the screen says about the mode. The caption is drawn inside the
// chart, where the eye already is; the readout sits by the slider; the Back
// button exists only when there is somewhere to go back from.
export function timeView({ scrubbed, time, tomorrow }) {
  if (!scrubbed) return { caption: null, readout: "Now", backHidden: true, backLabel: "Back to now" };
  return {
    caption: [tomorrow ? "Sky tomorrow at" : "Sky at", time],
    readout: `Showing ${time}${tomorrow ? " tomorrow" : ""}`,
    backHidden: false,
    backLabel: "Back to now",
  };
}
