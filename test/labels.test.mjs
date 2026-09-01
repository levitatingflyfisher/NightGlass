// The chart's labels: they grow with the reader's text size, and no two are
// drawn on top of each other. Checked with the real catalog at a crowded
// instant (Auriga and Taurus high on a winter evening), because a fixture of
// three labels can pass while the real sky still smears.
import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutLabels, textScale, labelFont, LABEL_PX, boxesOverlap } from "../app/js/labels.js";
import { projector, labelCandidates } from "../app/js/skymap.js";
import { julianDate, planetPosition, moonPosition, PLANET_NAMES } from "../app/js/astro.js";

// Width model: a system sans averages a bit over half an em per character.
const measure = (text, font) => text.length * parseFloat(font.match(/([\d.]+)px/)[1]) * 0.58;

const SIZE = 294; // the chart's CSS width on a 360 px phone (audit screens.md)
const JD = julianDate(new Date(Date.UTC(2026, 0, 15, 3, 0))); // 8 PM MST
const LAT = 44.6, LON = -110.5;

function sky(scale) {
  const R = SIZE / 2 - 14;
  const toXY = projector({ jd: JD, lat: LAT, lon: LON, cx: SIZE / 2, cy: SIZE / 2, R });
  const bodies = PLANET_NAMES.map((name) => ({ name, ...planetPosition(name, JD), kind: "planet" }));
  bodies.push({ name: "Moon", ...moonPosition(JD), kind: "moon" });
  return labelCandidates({ toXY, bodies, scale, dpr: 1 });
}

const pairs = (xs) => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b]));

test("text scale follows the page's root font size, not the body's fixed 16px", () => {
  assert.equal(textScale(16), 1);
  assert.equal(textScale(20.8), 1.3);
  assert.equal(textScale(NaN), 1, "an unreadable size falls back to 1");
  assert.ok(textScale(80) <= 2, "clamped so a huge setting cannot swallow the chart");
});

test("label fonts grow with text scale and device pixel ratio; two sizes, not four", () => {
  assert.equal(new Set(Object.values(LABEL_PX)).size, 2);
  assert.match(labelFont("minor", 1, 1), new RegExp(`^${LABEL_PX.minor}px `));
  assert.match(labelFont("major", 1.3, 2), new RegExp(`^bold ${LABEL_PX.major * 1.3 * 2}px `));
});

test("the real sky at a crowded instant has colliding candidates (so the next test means something)", () => {
  const all = sky(1).map((c) => ({ ...c, box: layoutLabels([c], measure)[0].box }));
  assert.ok(pairs(all).some(([a, b]) => boxesOverlap(a.box, b.box)), "raw labels overlap");
});

for (const scale of [1, 1.3]) {
  test(`at text scale ${scale}, no two drawn labels overlap and planets and the Moon always win`, () => {
    const cands = sky(scale);
    const placed = layoutLabels(cands, measure);
    const loose = placed.filter((p) => !p.always);
    for (const a of loose) {
      for (const b of placed) {
        if (a !== b) assert.ok(!boxesOverlap(a.box, b.box), `${a.text} overlaps ${b.text}`);
      }
    }
    const bodies = cands.filter((c) => c.always).map((c) => c.text).sort();
    assert.deepEqual(placed.filter((p) => p.always).map((p) => p.text).sort(), bodies);
    assert.ok(loose.length >= 10, `a useful number of names survive (${loose.length})`);
  });
}

test("larger text draws larger labels and never more of them", () => {
  const a = layoutLabels(sky(1), measure);
  const b = layoutLabels(sky(1.3), measure);
  assert.ok(b.length <= a.length);
  assert.ok(b[0].size > a[0].size);
});

test("reserved areas (such as a time caption) are never drawn over", () => {
  const reserved = [{ x0: 0, y0: 0, x1: SIZE, y1: SIZE / 2 }];
  const placed = layoutLabels(sky(1), measure, reserved);
  for (const p of placed.filter((q) => !q.always)) {
    assert.ok(!boxesOverlap(p.box, reserved[0]), `${p.text} is in the reserved area`);
  }
});

test("a name whose first spot is taken falls back to its next spot", () => {
  const base = { tier: "minor", scale: 1, dpr: 1 };
  const placed = layoutLabels([
    { ...base, text: "Jupiter", x: 100, y: 100, priority: 100, always: true },
    { ...base, text: "Capella", x: 100, y: 100, priority: 45, alts: [{ x: 100, y: 130 }] },
  ], measure);
  assert.deepEqual(placed.map((p) => [p.text, p.y]), [["Jupiter", 100], ["Capella", 130]]);
});
