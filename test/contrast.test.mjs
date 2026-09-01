// Every piece of text NightGlass shows must clear WCAG 4.5:1 against every
// ground it sits on, in both palettes: the dim tier included, and the night
// palette especially, since that is the mode the app is built for. The
// numbers are read from the shipped CSS and canvas palette, so a colour edit
// that drops below the floor fails here rather than at the campsite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PALETTES, LABEL_ALPHA } from "../app/js/skymap.js";

const FLOOR = 4.5;
const css = await readFile(new URL("../app/css/style.css", import.meta.url), "utf8");

function tokens(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `found ${selector} in style.css`);
  const out = {};
  for (const m of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

// "#rrggbb" or "rgba(r,g,b,a)" -> [r, g, b, a] in 0..255 / 0..1
function parse(c) {
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
  const rgba = c.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(rgba, `parsable colour: ${c}`);
  const p = rgba[1].split(",").map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

// Paint fg (with alpha, times any extra draw alpha) over an opaque ground.
function over(fg, ground, extraAlpha = 1) {
  const [r, g, b, a0] = parse(fg);
  const bg = parse(ground);
  const a = a0 * extraAlpha;
  return [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
}

const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function ratio(fg, ground, extraAlpha = 1) {
  const a = lum(over(fg, ground, extraAlpha));
  const b = lum(parse(ground).slice(0, 3));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const day = tokens(":root");
const night = { ...day, ...tokens("body.night") };

// Text tokens, and every ground a text token is painted on.
const TEXT = ["text", "text-dim", "accent", "good", "error"];
const GROUNDS = ["bg", "panel", "banner-bg"];

for (const [name, pal] of [["day", day], ["night", night]]) {
  test(`${name} palette: every text token clears ${FLOOR}:1 on every ground`, () => {
    for (const t of TEXT) {
      assert.ok(pal[t], `--${t} is defined in the ${name} palette`);
      for (const g of GROUNDS) {
        const r = ratio(pal[t], pal[g]);
        assert.ok(r >= FLOOR, `${name}: --${t} ${pal[t]} on --${g} ${pal[g]} is ${r.toFixed(2)}:1`);
      }
    }
  });
}

// The chart: labels inside the disc sit on the sky gradient (both ends are
// checked); the cardinal letters sit outside it, on the section's --panel.
for (const [name, css] of [["normal", day], ["night", night]]) {
  test(`${name} chart: every label clears ${FLOOR}:1 on the ground it is drawn on`, () => {
    const P = PALETTES[name];
    for (const key of ["starName", "constellationName", "planetName", "caption"]) {
      for (const ground of [P.sky, P.edgeFade]) {
        const r = ratio(P[key], ground, LABEL_ALPHA[key] ?? 1);
        assert.ok(r >= FLOOR, `${name}: ${key} ${P[key]} on ${ground} is ${r.toFixed(2)}:1`);
      }
    }
    // The cardinals and the time caption sit outside the disc, on --panel.
    for (const key of ["cardinal", "caption"]) {
      const r = ratio(P[key], css.panel);
      assert.ok(r >= FLOOR, `${name}: ${key} ${P[key]} on --panel ${css.panel} is ${r.toFixed(2)}:1`);
    }
  });
}

test("the night palette keeps one brighter red for the best window", () => {
  assert.ok(ratio(night.good, night["banner-bg"]) > ratio(night.text, night["banner-bg"]),
    "--good is brighter than --text at night, so the headline keeps its emphasis");
});
