// The setup / change-location flow: recomputation must not choose the view,
// and a GPS fix must not silently overwrite what the user typed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sectionFor } from "../app/js/location-flow.js";

test("first run with no location shows setup", () => {
  assert.equal(sectionFor({ hasLocation: false, editing: false }), "setup");
});

test("with a location and no edit in progress, shows the sky", () => {
  assert.equal(sectionFor({ hasLocation: true, editing: false }), "content");
});

test("a refresh during an edit keeps the editor open (the 5-minute timer must not close it)", () => {
  assert.equal(sectionFor({ hasLocation: true, editing: true }), "setup");
});

// ---- GPS: merge, never clobber; an in-flight locate can be cancelled

import { resolveGpsFix, createLocator } from "../app/js/location-flow.js";

const COORDS = { latitude: 44.60432, longitude: -110.50391 };

test("a GPS fix is rounded to ~1 km and keeps the place name in the form", () => {
  assert.deepEqual(
    resolveGpsFix(COORDS, { name: "Yellowstone camp", typedSinceLocate: false }),
    { lat: 44.6, lon: -110.5, name: "Yellowstone camp" },
  );
});

test("a GPS fix with an empty name field stores no name", () => {
  assert.deepEqual(
    resolveGpsFix(COORDS, { name: "", typedSinceLocate: false }),
    { lat: 44.6, lon: -110.5, name: undefined },
  );
});

test("a GPS fix never overwrites coordinates typed while it was locating", () => {
  assert.equal(resolveGpsFix(COORDS, { name: "", typedSinceLocate: true }), null);
});

// A geolocation stand-in whose callbacks the test fires by hand.
function fakeGeolocation() {
  const calls = [];
  return {
    calls,
    getCurrentPosition(ok, err, opts) { calls.push({ ok, err, opts }); },
  };
}

test("a locate delivers its fix, then is no longer pending", () => {
  const geo = fakeGeolocation();
  const loc = createLocator(geo);
  const got = [];
  loc.locate((p) => got.push(p), () => got.push("error"), { timeout: 15000 });
  assert.equal(loc.pending, true);
  assert.deepEqual(geo.calls[0].opts, { timeout: 15000 });
  geo.calls[0].ok({ coords: COORDS });
  assert.deepEqual(got, [{ coords: COORDS }]);
  assert.equal(loc.pending, false);
});

test("a fix arriving after Cancel is ignored", () => {
  const geo = fakeGeolocation();
  const loc = createLocator(geo);
  const got = [];
  loc.locate((p) => got.push(p), () => got.push("error"));
  loc.cancel();
  assert.equal(loc.pending, false);
  geo.calls[0].ok({ coords: COORDS });
  assert.deepEqual(got, []);
});

test("an error arriving after Cancel is ignored", () => {
  const geo = fakeGeolocation();
  const loc = createLocator(geo);
  const got = [];
  loc.locate((p) => got.push(p), () => got.push("error"));
  loc.cancel();
  geo.calls[0].err({ code: 3 });
  assert.deepEqual(got, []);
});

test("only the latest locate may answer", () => {
  const geo = fakeGeolocation();
  const loc = createLocator(geo);
  const got = [];
  loc.locate(() => got.push("first"), () => {});
  loc.locate(() => got.push("second"), () => {});
  geo.calls[0].ok({ coords: COORDS });
  geo.calls[1].ok({ coords: COORDS });
  assert.deepEqual(got, ["second"]);
});

// ---- typed coordinates obey ADR-0005 exactly as the GPS path does

import { resolveTypedLocation } from "../app/js/location-flow.js";

test("typed coordinates are rounded to ~1 km before storage, same as GPS", () => {
  const typed = resolveTypedLocation({ lat: 44.60432, lon: -110.50391, name: "Camp" });
  const gps = resolveGpsFix(COORDS, { name: "Camp", typedSinceLocate: false });
  assert.deepEqual(typed, { lat: 44.6, lon: -110.5, name: "Camp" });
  assert.deepEqual(typed, gps);
});

test("typed coordinates out of range or not numbers are rejected", () => {
  assert.equal(resolveTypedLocation({ lat: 91, lon: 0, name: "" }), null);
  assert.equal(resolveTypedLocation({ lat: 0, lon: -180.5, name: "" }), null);
  assert.equal(resolveTypedLocation({ lat: NaN, lon: 0, name: "" }), null);
});

test("an empty typed name stores no name", () => {
  assert.deepEqual(resolveTypedLocation({ lat: 1, lon: 2, name: "" }), { lat: 1, lon: 2, name: undefined });
});

// ---- a failed locate says why, and points the right way

import { gpsErrorMessage } from "../app/js/location-flow.js";

const CAUSES = [
  [{ code: 1 }, /denied|permission/i],
  [{ code: 2 }, /couldn.t determine|unavailable|signal/i],
  [{ code: 3 }, /too long|timed out/i],
  [{ unsupported: true }, /browser/i],
  [{}, /fix/i],
];

test("each GPS failure cause gets its own message", () => {
  const seen = new Set();
  for (const [err, re] of CAUSES) {
    const msg = gpsErrorMessage(err);
    assert.match(msg, re);
    seen.add(msg);
  }
  assert.equal(seen.size, CAUSES.length);
});

test("GPS failure messages point down at the fields, never up", () => {
  // #setup-status sits right under "Use my location", so the fields are below it.
  for (const [err] of CAUSES) {
    const msg = gpsErrorMessage(err);
    assert.match(msg, /below/);
    assert.doesNotMatch(msg, /above/);
  }
});

test("a browser without geolocation fails the locate as unsupported", () => {
  const loc = createLocator(undefined);
  const got = [];
  loc.locate(() => got.push("fix"), (e) => got.push(e));
  assert.deepEqual(got, [{ unsupported: true }]);
  assert.equal(loc.pending, false);
});

// ---- where the status lines sit (audit row 4: next to what they are about)

import { readFile } from "node:fs/promises";
const HTML = await readFile(new URL("../app/index.html", import.meta.url), "utf8");
const CSS = await readFile(new URL("../app/css/style.css", import.meta.url), "utf8");

test("the GPS status sits directly under its button, so 'below' is true", () => {
  const at = (id) => HTML.indexOf(`id="${id}"`);
  assert.ok(at("use-gps") < at("setup-status"), "status after the GPS button");
  assert.ok(at("setup-status") < at("manual-form"), "status before the coordinate fields");
  // Only the in-flight "Cancel locating" chip may sit between them.
  const between = HTML.slice(at("use-gps"), HTML.lastIndexOf("<p", at("setup-status")));
  assert.equal((between.match(/<(button|input|label|form|p)\b/g) || []).length, 1, between);
});

test("the form's own error sits right after its Set location button", () => {
  const submit = HTML.indexOf('type="submit"');
  const status = HTML.indexOf('id="form-status"');
  assert.ok(submit > 0 && status > submit, "form-status follows the submit button");
  assert.ok(status < HTML.indexOf("</form>"), "and is inside the form");
});

// ---- status lines: an error carries colour + icon + word; info carries none

import { STATUS, gpsFailure, invalidTyped } from "../app/js/location-flow.js";

test("a failed locate and a bad coordinate are errors with a word that says so", () => {
  for (const s of [...CAUSES.map(([e]) => gpsFailure(e)), invalidTyped()]) {
    assert.equal(s.kind, "error");
    assert.match(s.title, /couldn.t/i, "the error names the failure in words");
    assert.ok(s.text.length > 0);
  }
  assert.equal(gpsFailure({ code: 1 }).text, gpsErrorMessage({ code: 1 }));
});

test("locating and keeping typed coordinates are info, not errors", () => {
  for (const s of [STATUS.locating, STATUS.keptTyped]) {
    assert.equal(s.kind, "info");
    assert.ok(s.text.length > 0);
  }
});

test("every status line carries the error icon, shown only for errors", () => {
  for (const id of ["setup-status", "form-status"]) {
    const m = HTML.match(new RegExp(`<p id="${id}" class="status"[^>]*>([\\s\\S]*?)</p>`));
    assert.ok(m, `#${id} is a .status line`);
    assert.match(m[1], /<svg class="status-icon"/, `#${id} has the icon`);
    assert.match(m[1], /class="status-title"/, `#${id} has a slot for the word`);
  }
  assert.match(CSS, /\.status\.error\s*\{[^}]*color:\s*var\(--error\)/, "errors take --error");
  assert.match(CSS, /\.status\.error\s*\{[^}]*border/, "and a border, so hue is not alone");
  assert.match(CSS, /\.status:not\(\.error\)\s+\.status-icon\s*\{[^}]*display:\s*none/);
});
