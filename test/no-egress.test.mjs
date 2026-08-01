// The NightGlass invariant: the app makes NO network requests at runtime.
// No API, no CDN, no fonts, no telemetry — the sky is computed on-device.
// This test pins that. If you add code that reaches the network, this fails,
// and that is a privacy regression, not a feature.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const APP = new URL("../app/", import.meta.url).pathname;

async function jsFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await jsFiles(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

test("no JavaScript reaches the network", async () => {
  const files = [...await jsFiles(path.join(APP, "js")), path.join(APP, "sw.js")];
  assert.ok(files.length >= 5, "found the app's scripts");
  for (const f of files) {
    const src = await readFile(f, "utf8");
    const code = src.replace(/^\s*\/\/.*$/gm, ""); // comments may cite URLs
    for (const banned of [
      "http://", "https://", "XMLHttpRequest", "WebSocket", "EventSource",
      "sendBeacon", "importScripts", "new Request(",
    ]) {
      assert.ok(!code.includes(banned), `${path.basename(f)} contains ${banned}`);
    }
    // fetch() may appear only in the service worker's cache passthrough,
    // which replays same-origin requests the page itself made — and the page
    // only ever requests its own local files.
    if (path.basename(f) !== "sw.js") {
      assert.ok(!/\bfetch\s*\(/.test(code), `${path.basename(f)} calls fetch()`);
    }
  }
});

test("index.html loads no external resources", async () => {
  const html = await readFile(path.join(APP, "index.html"), "utf8");
  // Every src=, and every stylesheet/manifest/icon href, must be relative.
  // Plain <a href> links are user navigation, not runtime requests.
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    const isAnchor = html.slice(Math.max(0, m.index - 30), m.index).includes("<a ");
    if (isAnchor) continue;
    assert.ok(!/^[a-z]+:|^\/\//i.test(url), `external resource: ${url}`);
  }
});
