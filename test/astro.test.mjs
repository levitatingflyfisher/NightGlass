// Validates the hand-written ephemeris engine against astronomy-engine
// (https://github.com/cosinekitty/astronomy, MIT), a rigorously tested
// reference implementation. astronomy-engine is a dev dependency only —
// the app ships zero runtime dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Astronomy from "astronomy-engine";
import {
  julianDate, gmst, sunPosition, moonPosition, moonIllumination,
  planetPosition, altAz, riseSet, darknessIntervals, belowIntervals,
  intersectIntervals, norm360, PLANET_NAMES,
} from "../app/js/astro.js";

// Angular separation in degrees between two RA/Dec pairs.
function sep(ra1, dec1, ra2, dec2) {
  const d = Math.PI / 180;
  const c =
    Math.sin(dec1 * d) * Math.sin(dec2 * d) +
    Math.cos(dec1 * d) * Math.cos(dec2 * d) * Math.cos((ra1 - ra2) * d);
  return Math.acos(Math.min(1, Math.max(-1, c))) / d;
}

// Geocentric apparent RA/Dec of date from the reference library.
function refEquatorial(body, date) {
  const vec = Astronomy.GeoVector(body, date, true); // EQJ frame, with aberration
  const rot = Astronomy.Rotation_EQJ_EQD(date);
  const eq = Astronomy.EquatorFromVector(Astronomy.RotateVector(rot, vec));
  return { ra: eq.ra * 15, dec: eq.dec }; // hours -> degrees
}

// A spread of instants across seasons and years, including "now"-ish dates.
const INSTANTS = [
  new Date("2024-03-20T12:00:00Z"),
  new Date("2025-08-09T03:30:00Z"),
  new Date("2026-01-15T22:00:00Z"),
  new Date("2026-08-01T04:00:00Z"),
  new Date("2027-11-05T18:45:00Z"),
];

test("gmst matches astronomy-engine sidereal time", () => {
  for (const date of INSTANTS) {
    const expected = Astronomy.SiderealTime(date) * 15;
    const got = gmst(julianDate(date));
    const diff = Math.abs(norm360(got - expected + 180) - 180);
    assert.ok(diff < 0.01, `${date.toISOString()}: gmst off by ${diff} deg`);
  }
});

test("sun position within 0.02 deg of reference", () => {
  for (const date of INSTANTS) {
    const ref = refEquatorial(Astronomy.Body.Sun, date);
    const got = sunPosition(julianDate(date));
    const d = sep(got.ra, got.dec, ref.ra, ref.dec);
    assert.ok(d < 0.02, `${date.toISOString()}: sun off by ${d} deg`);
  }
});

test("moon position within 0.05 deg of reference", () => {
  for (const date of INSTANTS) {
    const ref = refEquatorial(Astronomy.Body.Moon, date);
    const got = moonPosition(julianDate(date));
    const d = sep(got.ra, got.dec, ref.ra, ref.dec);
    assert.ok(d < 0.05, `${date.toISOString()}: moon off by ${d} deg`);
  }
});

test("moon distance within 100 km of reference", () => {
  for (const date of INSTANTS) {
    const refKm = Astronomy.GeoMoon(date).Length() * Astronomy.KM_PER_AU;
    const got = moonPosition(julianDate(date)).dist;
    assert.ok(Math.abs(got - refKm) < 100,
      `${date.toISOString()}: moon distance off by ${Math.abs(got - refKm)} km`);
  }
});

test("moon illuminated fraction within 1% of reference", () => {
  for (const date of INSTANTS) {
    const ref = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
    const got = moonIllumination(julianDate(date)).fraction;
    assert.ok(Math.abs(got - ref) < 0.01,
      `${date.toISOString()}: fraction ${got} vs ${ref}`);
  }
});

test("planets within naked-eye accuracy of reference", () => {
  // Schlyter elements: arcminutes for inner planets, ~0.1 deg Jupiter/Saturn.
  const tolerance = { Mercury: 0.2, Venus: 0.2, Mars: 0.2, Jupiter: 0.3, Saturn: 0.3 };
  for (const name of PLANET_NAMES) {
    for (const date of INSTANTS) {
      const ref = refEquatorial(Astronomy.Body[name], date);
      const got = planetPosition(name, julianDate(date));
      const d = sep(got.ra, got.dec, ref.ra, ref.dec);
      assert.ok(d < tolerance[name],
        `${name} ${date.toISOString()}: off by ${d} deg`);
    }
  }
});

test("alt/az agrees with reference observer", () => {
  const lat = 47.6, lon = -122.3; // a campsite near Seattle
  for (const date of INSTANTS) {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
    const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec); // no refraction
    const s = sunPosition(julianDate(date));
    const got = altAz(s.ra, s.dec, julianDate(date), lat, lon);
    assert.ok(Math.abs(got.alt - hor.altitude) < 0.2,
      `${date.toISOString()}: alt ${got.alt} vs ${hor.altitude}`);
    const azDiff = Math.abs(norm360(got.az - hor.azimuth + 180) - 180);
    assert.ok(azDiff < 0.2, `${date.toISOString()}: az ${got.az} vs ${hor.azimuth}`);
  }
});

test("sunset and sunrise within 2 minutes of reference", () => {
  const lat = 44.6, lon = -110.5; // Yellowstone
  const observer = new Astronomy.Observer(lat, lon, 0);
  const from = new Date("2026-08-01T18:00:00Z");
  const jd0 = julianDate(from);
  const events = riseSet("sun", jd0, jd0 + 1, lat, lon);
  const refSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, from, 2);
  const refRise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, from, 2);
  const set = events.find((e) => !e.rising);
  const rise = events.find((e) => e.rising);
  assert.ok(set && rise, "found sunset and sunrise");
  const setDiffMin = Math.abs(set.jd - julianDate(refSet.date)) * 1440;
  const riseDiffMin = Math.abs(rise.jd - julianDate(refRise.date)) * 1440;
  assert.ok(setDiffMin < 2, `sunset off by ${setDiffMin} min`);
  assert.ok(riseDiffMin < 2, `sunrise off by ${riseDiffMin} min`);
});

test("moonrise within 3 minutes of reference", () => {
  const lat = 35.1, lon = -106.6; // Albuquerque
  const observer = new Astronomy.Observer(lat, lon, 0);
  const from = new Date("2026-08-01T00:00:00Z");
  const jd0 = julianDate(from);
  const events = riseSet("moon", jd0, jd0 + 1, lat, lon);
  const refRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, from, 2);
  const rise = events.find((e) => e.rising);
  assert.ok(rise, "found a moonrise");
  const diffMin = Math.abs(rise.jd - julianDate(refRise.date)) * 1440;
  assert.ok(diffMin < 3, `moonrise off by ${diffMin} min`);
});

test("astronomical darkness interval is found and sane", () => {
  const lat = 44.6, lon = -110.5;
  const from = julianDate(new Date("2026-08-01T18:00:00Z")); // evening local
  const dark = darknessIntervals(from, from + 1, 18, lat, lon);
  assert.ok(dark.length >= 1, "found an astronomical-darkness interval");
  const hours = (dark[0].end - dark[0].start) * 24;
  assert.ok(hours > 2 && hours < 12, `dark window ${hours} h looks wrong`);
});

test("interval intersection", () => {
  const a = [{ start: 0, end: 10 }, { start: 20, end: 30 }];
  const b = [{ start: 5, end: 25 }];
  assert.deepEqual(intersectIntervals(a, b), [
    { start: 5, end: 10 },
    { start: 20, end: 25 },
  ]);
});

test("polar edge case: no crossings at midsummer high latitude", () => {
  // Tromsø in late June: sun never sets — riseSet must return no events
  // and belowIntervals must return an empty list, not crash.
  const lat = 69.6, lon = 18.9;
  const jd0 = julianDate(new Date("2026-06-21T00:00:00Z"));
  const events = riseSet("sun", jd0, jd0 + 1, lat, lon);
  assert.equal(events.length, 0);
  const dark = darknessIntervals(jd0, jd0 + 1, 18, lat, lon);
  assert.equal(dark.length, 0);
});

test("belowIntervals handles body already below at start", () => {
  const lat = 44.6, lon = -110.5;
  const jdMidnight = julianDate(new Date("2026-08-01T08:00:00Z")); // 2am local
  const below = belowIntervals("sun", jdMidnight, jdMidnight + 0.2, -18, lat, lon);
  assert.ok(below.length >= 1);
  assert.equal(below[0].start, jdMidnight, "interval starts at range start");
});

// ── the accuracy claims, actually established ────────────────────────────────
//
// The tests above spot-check five hand-picked instants. That is enough to
// catch a transcription error and NOT enough to support the numbers the
// README prints, because an ephemeris is wrong in narrow windows — near a
// planet's conjunction, at the extremes of the moon's evection term — that
// five dates will happily step over.
//
// So sweep. These are the tolerances VISION.md and the README quote, and
// this is what makes them claims rather than hopes.
test("accuracy holds across five years, not just five dates", () => {
  const N = 1500;                       // ~1.37-day stride from 2024 into 2029
  const worst = { sun: 0, moon: 0 };
  for (const n of PLANET_NAMES) worst[n] = 0;

  for (let i = 0; i < N; i++) {
    const date = new Date(Date.UTC(2024, 0, 1) + i * 86400000 * 1.37);
    const jd = julianDate(date);

    const s = sunPosition(jd);
    const sr = refEquatorial(Astronomy.Body.Sun, date);
    worst.sun = Math.max(worst.sun, sep(s.ra, s.dec, sr.ra, sr.dec));

    const m = moonPosition(jd);
    const mr = refEquatorial(Astronomy.Body.Moon, date);
    worst.moon = Math.max(worst.moon, sep(m.ra, m.dec, mr.ra, mr.dec));

    for (const n of PLANET_NAMES) {
      const p = planetPosition(n, jd);
      const pr = refEquatorial(Astronomy.Body[n], date);
      worst[n] = Math.max(worst[n], sep(p.ra, p.dec, pr.ra, pr.dec));
    }
  }

  // Measured maxima at the time of writing: sun 0.009°, moon 0.032°,
  // planets 0.019–0.030°. The bounds below leave headroom for a refactor
  // that is a little less exact without silently letting the numbers in the
  // README become false.
  assert.ok(worst.sun < 0.02, `sun worst ${worst.sun.toFixed(4)} deg`);
  assert.ok(worst.moon < 0.05, `moon worst ${worst.moon.toFixed(4)} deg`);
  for (const n of PLANET_NAMES) {
    assert.ok(worst[n] < 0.05, `${n} worst ${worst[n].toFixed(4)} deg`);
  }
});
