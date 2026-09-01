// app.js un-hides #planets-note on a night when no planet is visible. It must
// then say something: an empty paragraph revealed is a shipped defect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("#planets-note carries a sentence for the no-planet night", async () => {
  const html = await readFile(new URL("../app/index.html", import.meta.url), "utf8");
  const m = html.match(/<p id="planets-note"[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(m, "#planets-note exists");
  assert.ok(m[1].replace(/<[^>]*>/g, "").trim().length > 0, "#planets-note is not blank");
});

test("nothing in app.js overwrites the note's text", async () => {
  const js = await readFile(new URL("../app/js/app.js", import.meta.url), "utf8");
  assert.ok(!/planets-note"\)\.(textContent|innerHTML)/.test(js));
});
