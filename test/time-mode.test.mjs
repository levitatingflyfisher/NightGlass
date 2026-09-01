// The time slider puts the chart into a mode: it shows a moment other than
// now. The fleet floor (Q4) is that the state is visible where the eye is
// and the control carries it, and nothing moves the shown moment but the
// user. nightglass:humane-interface-01.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scrub, shownJd, timeView } from "../app/js/time-mode.js";

const NOW = 2461000.5;

test("at now, the chart follows the clock", () => {
  const s = scrub(null, 0, NOW);
  assert.equal(s.offsetMin, 0);
  assert.equal(shownJd(s, NOW + 0.1), NOW + 0.1);
});

test("a scrubbed moment is pinned: the five-minute refresh cannot creep it", () => {
  const s = scrub(scrub(null, 0, NOW), 120, NOW);
  const shown = shownJd(s, NOW);
  assert.equal(shownJd(s, NOW + 5 / 1440), shown, "five minutes later the chart shows the same instant");
  assert.equal(shownJd(s, NOW + 60 / 1440), shown);
});

test("dragging further keeps the first anchor; returning to now clears it", () => {
  const a = scrub(null, 60, NOW);
  const b = scrub(a, 90, NOW + 3 / 1440);
  assert.equal(b.anchorJd, a.anchorJd);
  assert.equal(shownJd(b, NOW + 10), a.anchorJd + 90 / 1440);
  const c = scrub(b, 0, NOW + 10);
  assert.equal(c.anchorJd, null);
});

test("at now, nothing claims a mode: no caption, no Back button", () => {
  const v = timeView({ scrubbed: false });
  assert.equal(v.caption, null);
  assert.equal(v.backHidden, true);
  assert.equal(v.readout, "Now");
});

test("scrubbed, the chart carries the time in its own drawing and the button says where it goes", () => {
  const v = timeView({ scrubbed: true, time: "11:58 PM", tomorrow: false });
  assert.deepEqual(v.caption, ["Sky at", "11:58 PM"]);
  assert.equal(v.backHidden, false);
  assert.equal(v.backLabel, "Back to now");
  assert.equal(v.readout, "Showing 11:58 PM");
  assert.notEqual(v.readout, v.backLabel, "the two controls no longer both say 'Now'");
});

test("a scrubbed time past midnight says which night", () => {
  const v = timeView({ scrubbed: true, time: "01:40 AM", tomorrow: true });
  assert.deepEqual(v.caption, ["Sky tomorrow at", "01:40 AM"]);
  assert.match(v.readout, /tomorrow/);
});
