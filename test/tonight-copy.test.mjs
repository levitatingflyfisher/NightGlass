// The Tonight card's darkness words. Operator ruling 47: made-up coinages
// become plain words; real astronomy terms stay, each with a one-line
// explanation, shown only where they apply. nightglass:writing-is-designing-07,
// nightglass:badass-users-08.
import { test } from "node:test";
import assert from "node:assert/strict";
import { darkness, bestWindowNote } from "../app/js/tonight-copy.js";

const COINED = /true darkness|midnight sun season/i;

test("a fully dark night says so in plain words and needs no footnote", () => {
  const d = darkness("astronomical", true);
  assert.equal(d.label, "Fully dark");
  assert.equal(d.explain, null);
});

for (const kind of ["nautical", "civil"]) {
  test(`a ${kind}-twilight night keeps the real term, with a one-line explanation`, () => {
    const d = darkness(kind, true);
    assert.equal(d.label, "Darkest it gets");
    assert.match(d.explain, new RegExp(`${kind} twilight`, "i"), "the real term is kept");
    assert.match(d.explain, /\d+°/, "and says what it means in degrees of sun");
    assert.ok(!d.explain.includes("\n") && d.explain.length < 160, "one line");
  });
}

test("a night that never gets dark says so plainly", () => {
  const d = darkness("civil", false);
  assert.equal(d.value, "none tonight");
  assert.doesNotMatch(d.label, COINED);
  assert.match(d.explain, /never/);
});

test("no darkness label or banner line uses the old coinages", () => {
  const all = [
    ...["astronomical", "nautical", "civil"].flatMap((k) => [darkness(k, true), darkness(k, false)]),
  ].flatMap((d) => [d.label, d.value ?? "", d.explain ?? ""]);
  all.push(bestWindowNote("astronomical"), bestWindowNote("nautical"));
  for (const s of all) assert.doesNotMatch(s, COINED, s);
});

test("the banner keeps its shape: moon-free, and honest about how dark", () => {
  assert.equal(bestWindowNote("astronomical"), "of moon-free full darkness");
  assert.equal(bestWindowNote("nautical"), "of moon-free darkness (not fully dark)");
});

test("app.js and index.html carry no coinage of their own", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const f of ["../app/js/app.js", "../app/index.html"]) {
    const src = await readFile(new URL(f, import.meta.url), "utf8");
    assert.doesNotMatch(src, COINED, f);
  }
});
