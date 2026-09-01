// What the app and its docs claim, pinned to what is true. A counted or
// promised statement with no test behind it is a wish
// (nightglass:writing-is-designing-14); each claim here fails when the
// thing it counts stops being so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { STARS } from "../app/js/data.js";
import { PLANET_NAMES } from "../app/js/astro.js";

const ROOT = new URL("../", import.meta.url).pathname;
const read = (p) => readFile(path.join(ROOT, p), "utf8");
const HTML = await read("app/index.html");
const text = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

test("'1,600+ stars to mag 5.0' (README, VISION) is what ships", async () => {
  assert.ok(STARS.length >= 1600, `${STARS.length} stars`);
  assert.ok(STARS.every((s) => s[2] <= 5.0), "every star is mag 5.0 or brighter");
  for (const doc of ["README.md", "VISION.md"]) assert.match(await read(doc), /1,600\+/);
});

test("'the five naked-eye planets' is the list the app computes", () => {
  assert.equal(PLANET_NAMES.length, 5);
  assert.deepEqual([...PLANET_NAMES].sort(), ["Jupiter", "Mars", "Mercury", "Saturn", "Venus"]);
  assert.match(text(HTML.match(/<p id="planets-note"[\s\S]*?<\/p>/)[0]), /five naked-eye planets/);
});

// "Works with no signal after the first visit" is only true if the service
// worker precaches every file the page needs.
async function shipped(dir, rel = "") {
  const out = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await shipped(dir, r));
    else if (r !== "sw.js") out.push(r);
  }
  return out;
}

test("'works with no signal after the first visit': the service worker precaches every shipped file", async () => {
  const sw = await read("app/sw.js");
  const assets = [...sw.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]);
  for (const f of await shipped(path.join(ROOT, "app"))) {
    assert.ok(assets.includes(f), `${f} is not in sw.js ASSETS, so it will not load offline`);
  }
  for (const a of assets.filter(Boolean)) {
    await assert.doesNotReject(readFile(path.join(ROOT, "app", a)), `ASSETS lists missing ${a}`);
  }
});

test("the privacy line claims what the no-egress test guards, not more", () => {
  const footer = text(HTML.match(/<footer>[\s\S]*?<\/footer>/)[0]);
  // The page is fetched once from its host and the service worker can pass
  // an uncached request through, so "no network requests" is not the true
  // sentence. What is guarded: nothing about you leaves, and offline works.
  assert.doesNotMatch(footer, /no network requests/i);
  assert.match(footer, /Nothing about you leaves this device/);
  assert.match(footer, /after the first visit/i);
});

test("the page says what it is: keyphrase first in the title and manifest", async () => {
  const title = HTML.match(/<title>([^<]*)<\/title>/)[1];
  assert.match(title, /^Offline star chart/i, title);
  assert.match(title, /NightGlass/);
  const manifest = JSON.parse(await read("app/manifest.webmanifest"));
  assert.match(manifest.name, /star chart/i);
  assert.equal(manifest.short_name, "NightGlass", "the home-screen label stays short");
  const desc = HTML.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.match(desc, /offline star chart/i);
  for (const s of [title, manifest.name, manifest.description, desc]) {
    assert.doesNotMatch(s, /—/, `no em dash in new copy: ${s}`);
  }
});

test("the docs hub's count of decision records matches docs/adr/", async () => {
  const adrs = (await readdir(path.join(ROOT, "docs/adr"))).filter((f) => /^\d{4}-.*\.md$/.test(f));
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const hub = await read("docs/README.md");
  const m = hub.match(/\*\*\[Architecture decisions\]\(adr\/\)\*\*\s+—\s+(\w+) records/);
  assert.ok(m, "docs/README.md states a record count");
  assert.equal(m[1], words[adrs.length], `${adrs.length} ADR files`);
  const index = await read("docs/adr/README.md");
  for (const f of adrs) assert.ok(index.includes(`(${f})`), `docs/adr/README.md lists ${f}`);
});
