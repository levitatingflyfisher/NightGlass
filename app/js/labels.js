// Chart label sizing and placement. Pure: no DOM, no canvas. skymap.js
// hands in the candidates and a measure function; test/labels.test.mjs runs
// the real catalog through it.

// Two sizes, in CSS px at text scale 1: names of stars and constellations,
// and the bold labels that must always be read (planets, the Moon, N/S/E/W).
export const LABEL_PX = { minor: 11, major: 12 };

// The reader's text size, as a multiple of the 16 px default. Read it from
// the root element: body is pinned to 16 px in the CSS, so it never moves.
export function textScale(rootFontPx) {
  const s = rootFontPx / 16;
  if (!Number.isFinite(s) || s <= 0) return 1;
  return Math.min(2, Math.max(0.75, s));
}

export function labelFont(tier, scale, dpr) {
  const px = LABEL_PX[tier] * scale * dpr;
  return `${tier === "major" ? "bold " : ""}${px}px system-ui, sans-serif`;
}

export const boxesOverlap = (a, b) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// candidates: [{text, x, y, tier, scale, dpr, priority, always?, alts?}]
//   x is the text's centre, y its baseline (textAlign "center").
//   alts: other {x, y} spots to try, in order, if the first is taken.
// measure(text, font) -> width in the same units as x/y.
// reserved: boxes nothing optional may cover.
// Returns the labels to draw, each with its font, size and box. Labels
// marked `always` (planets, the Moon) are placed first and unconditionally;
// the rest go in priority order and are skipped if they would touch one
// already placed. Fewer names, all legible.
export function layoutLabels(candidates, measure, reserved = []) {
  const ordered = candidates
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (b.c.always === true) - (a.c.always === true) ||
      b.c.priority - a.c.priority || a.i - b.i)
    .map(({ c }) => c);
  const taken = [...reserved];
  const placed = [];
  for (const c of ordered) {
    const font = labelFont(c.tier, c.scale, c.dpr);
    const size = LABEL_PX[c.tier] * c.scale * c.dpr;
    const w = measure(c.text, font);
    const pad = size * 0.15;
    const boxAt = ({ x, y }) => ({
      x0: x - w / 2 - pad, x1: x + w / 2 + pad,
      y0: y - size - pad, y1: y + size * 0.3 + pad,
    });
    const spots = [{ x: c.x, y: c.y }, ...(c.always ? [] : c.alts ?? [])];
    const spot = c.always ? spots[0] : spots.find((p) => !taken.some((t) => boxesOverlap(boxAt(p), t)));
    if (!spot) continue;
    const box = boxAt(spot);
    taken.push(box);
    placed.push({ ...c, x: spot.x, y: spot.y, font, size, box });
  }
  return placed;
}
