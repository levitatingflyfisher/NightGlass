// NightGlass UI. Everything is computed on this device; there is no network
// code in this app — the only URLs anywhere are the service worker's list of
// our own local files.
import {
  julianDate, dateFromJD, sunPosition, moonPosition, moonIllumination,
  moonPhaseName, planetPosition, altAz, riseSet, darknessIntervals,
  belowIntervals, intersectIntervals, PLANET_NAMES,
} from "./astro.js";
import { SkyMap } from "./skymap.js";
import { textScale } from "./labels.js";
import { scrub, shownJd, timeView } from "./time-mode.js";
import { darkness, bestWindowNote } from "./tonight-copy.js";
import {
  sectionFor, resolveGpsFix, resolveTypedLocation, createLocator,
  STATUS, gpsFailure, invalidTyped,
} from "./location-flow.js";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "nightglass.location";
const MODE_KEY = "nightglass.mode";

const state = {
  location: loadLocation(),
  mode: localStorage.getItem(MODE_KEY) === "night" ? "night" : "normal",
  time: scrub(null, 0), // sky-map time: {offsetMin, anchorJd}; see time-mode.js
  editing: false, // the change-location form is open over a saved location
};

function loadLocation() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const loc = JSON.parse(raw);
    if (typeof loc.lat === "number" && typeof loc.lon === "number") return loc;
  } catch { /* fall through */ }
  return null;
}

function saveLocation(loc) {
  state.location = loc;
  localStorage.setItem(STORE_KEY, JSON.stringify(loc));
}

// ------------------------------------------------------------- formatting

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const fmtTime = (jd) => timeFmt.format(dateFromJD(jd));

function fmtDuration(jdSpan) {
  const min = Math.round(jdSpan * 1440);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m ? m + " min" : ""}`.trim() : `${m} min`;
}

const WINDS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S",
  "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (az) => WINDS[Math.round(az / 22.5) % 16];

// ------------------------------------------------------------- tonight

// The "night" runs from the most recent solar noon AT THE CAMPSITE to the
// next one, so it always brackets one full night there — independent of the
// timezone this device happens to be set to. In solar time (jd + lon/360),
// integer JDs are exactly local solar noon.
function nightWindow(lon, now = new Date()) {
  const jdSolarNoon = Math.floor(julianDate(now) + lon / 360);
  const jd0 = jdSolarNoon - lon / 360;
  return { jd0, jd1: jd0 + 1 };
}

function computeTonight(lat, lon) {
  const { jd0, jd1 } = nightWindow(lon);
  const sunEvents = riseSet("sun", jd0, jd1, lat, lon);
  const sunset = sunEvents.find((e) => !e.rising)?.jd ?? null;
  const sunrise = sunEvents.find((e) => e.rising && (!sunset || e.jd > sunset))?.jd ?? null;

  // Deepest available darkness: astronomical, else nautical, else civil.
  let darkKind = "astronomical";
  let dark = darknessIntervals(jd0, jd1, 18, lat, lon);
  if (!dark.length) { darkKind = "nautical"; dark = darknessIntervals(jd0, jd1, 12, lat, lon); }
  if (!dark.length) { darkKind = "civil"; dark = darknessIntervals(jd0, jd1, 6, lat, lon); }

  const moonEvents = riseSet("moon", jd0, jd1, lat, lon);
  const moonDown = belowIntervals("moon", jd0, jd1, -0.5667, lat, lon);
  const best = intersectIntervals(dark, moonDown)
    .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] ?? null;

  const midJd = sunset && sunrise ? (sunset + sunrise) / 2 : jd0 + 0.5;
  const illum = moonIllumination(midJd);

  return {
    jd0, jd1, sunset, sunrise, darkKind, dark, moonEvents, best,
    moonFraction: illum.fraction,
    moonPhase: moonPhaseName(illum.fraction, illum.waxing),
  };
}

function renderTonight(t, lat, lon) {
  $("sunset-time").textContent = t.sunset ? fmtTime(t.sunset) : "—";
  $("sunrise-time").textContent = t.sunrise ? fmtTime(t.sunrise) : "—";

  const d = darkness(t.darkKind, t.dark.length > 0);
  $("dark-label").textContent = d.label;
  $("dark-time").textContent = t.dark.length
    ? `${fmtTime(t.dark[0].start)} – ${fmtTime(t.dark[0].end)}`
    : d.value;
  $("dark-note").textContent = d.explain ?? "";
  $("dark-note").hidden = !d.explain;

  const rise = t.moonEvents.find((e) => e.rising);
  const set = t.moonEvents.find((e) => !e.rising);
  const parts = [];
  if (rise) parts.push(`rises ${fmtTime(rise.jd)}`);
  if (set) parts.push(`sets ${fmtTime(set.jd)}`);
  $("moon-times").textContent = parts.length ? parts.join(", ") : "in the sky all night or not at all";
  $("moon-phase").textContent = `${t.moonPhase} · ${Math.round(t.moonFraction * 100)}% lit`;
  $("moon-icon").style.setProperty("--lit", String(t.moonFraction));

  const bestEl = $("best-window");
  if (t.best) {
    const span = t.best.end - t.best.start;
    bestEl.innerHTML =
      `<strong>Best stargazing: ${fmtTime(t.best.start)} – ${fmtTime(t.best.end)}</strong>` +
      `<span>${fmtDuration(span)} ${bestWindowNote(t.darkKind)}</span>`;
  } else if (t.dark.length) {
    bestEl.innerHTML =
      `<strong>Moon is up during dark hours</strong>` +
      `<span>Darkest stretch: ${fmtTime(t.dark[0].start)} – ${fmtTime(t.dark[0].end)} (moonlight will wash out faint stars)</span>`;
  } else {
    bestEl.innerHTML =
      `<strong>No real darkness tonight</strong>` +
      `<span>The sun stays close to the horizon at this latitude right now.</span>`;
  }

  $("location-chip").textContent =
    state.location.name || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

// ------------------------------------------------------------- planets

function renderPlanets(t, lat, lon) {
  const list = $("planet-list");
  list.innerHTML = "";
  // "Visible" = above 5 deg altitude while the sun is below -6 deg.
  const duskDark = darknessIntervals(t.jd0, t.jd1, 6, lat, lon);
  let anyVisible = false;
  for (const name of PLANET_NAMES) {
    const up = belowIntervals(name, t.jd0, t.jd1, 5, lat, lon);
    // belowIntervals gives "below 5 deg"; invert within the window.
    const above = [];
    let cursor = t.jd0;
    for (const iv of up) {
      if (iv.start > cursor) above.push({ start: cursor, end: iv.start });
      cursor = iv.end;
    }
    if (cursor < t.jd1) above.push({ start: cursor, end: t.jd1 });

    const visible = intersectIntervals(above, duskDark)
      .filter((iv) => iv.end - iv.start > 20 / 1440)
      .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];

    const li = document.createElement("li");
    if (visible) {
      anyVisible = true;
      // Direction at the middle of the visible stretch.
      const midJd = (visible.start + visible.end) / 2;
      const p = planetPosition(name, midJd);
      const { alt, az } = altAz(p.ra, p.dec, midJd, lat, lon);
      li.innerHTML = `<strong>${name}</strong> ${fmtTime(visible.start)} – ${fmtTime(visible.end)}, ` +
        `look ${compass(az)}, ${Math.round(alt)}° up`;
    } else {
      li.className = "not-visible";
      li.innerHTML = `<strong>${name}</strong> not visible tonight`;
    }
    list.appendChild(li);
  }
  $("planets-note").hidden = anyVisible;
}

// ------------------------------------------------------------- sky map

const skymap = new SkyMap($("skymap"));

function renderMap() {
  if (!state.location) return;
  const { lat, lon } = state.location;
  const jd = shownJd(state.time, julianDate(new Date()));
  const bodies = PLANET_NAMES.map((name) => {
    const p = planetPosition(name, jd);
    return { name, ra: p.ra, dec: p.dec, kind: "planet" };
  });
  const m = moonPosition(jd);
  const illum = moonIllumination(jd);
  bodies.push({ name: "Moon", ra: m.ra, dec: m.dec, kind: "moon", moonFraction: illum.fraction });
  // The chart's labels follow the reader's text size. Read the root element:
  // body is pinned to 16 px, so it never reflects the phone's setting.
  const scale = textScale(parseFloat(getComputedStyle(document.documentElement).fontSize));
  const shown = dateFromJD(jd);
  const view = timeView({
    scrubbed: state.time.offsetMin !== 0,
    time: timeFmt.format(shown),
    tomorrow: shown.getDate() !== new Date().getDate(),
  });
  skymap.draw({ jd, lat, lon, mode: state.mode, bodies, scale, caption: view.caption });

  $("map-time").textContent = view.readout;
  $("sky").classList.toggle("scrubbed", !view.backHidden);
  $("time-now").hidden = view.backHidden;
  $("time-now").textContent = view.backLabel;
}

// ------------------------------------------------------------- wiring

// Which section is visible is decided by the user's actions (save, cancel,
// tapping the chip), never by a recompute — so the 5-minute timer cannot
// close the editor and throw away half-typed coordinates.
function showSection() {
  const section = sectionFor({ hasLocation: !!state.location, editing: state.editing });
  $("setup").hidden = section !== "setup";
  $("content").hidden = section !== "content";
  $("cancel-edit").hidden = !state.location;
}

function refresh() {
  showSection();
  if (!state.location) return;
  const { lat, lon } = state.location;
  const t = computeTonight(lat, lon);
  renderTonight(t, lat, lon);
  renderPlanets(t, lat, lon);
  renderMap();
}

function applyMode() {
  document.body.classList.toggle("night", state.mode === "night");
  $("mode-toggle").setAttribute("aria-pressed", String(state.mode === "night"));
  renderMap();
}

$("mode-toggle").addEventListener("click", () => {
  state.mode = state.mode === "night" ? "normal" : "night";
  localStorage.setItem(MODE_KEY, state.mode);
  applyMode();
});

// A status line shows {kind, title?, text}, or nothing when given null.
function setStatus(id, status) {
  const el = $(id);
  el.classList.toggle("error", status?.kind === "error");
  el.classList.toggle("info", status?.kind === "info");
  el.querySelector(".status-title").textContent = status?.title ?? "";
  el.querySelector(".status-text").textContent = status?.text ?? "";
}

function clearStatuses() {
  setStatus("setup-status", null);
  setStatus("form-status", null);
}

const locator = createLocator(navigator.geolocation);
let typedSinceLocate = false; // lat/lon edited while a fix was on its way

function stopLocating() {
  locator.cancel();
  $("cancel-locate").hidden = true;
}

$("use-gps").addEventListener("click", () => {
  setStatus("setup-status", STATUS.locating);
  typedSinceLocate = false;
  $("cancel-locate").hidden = false;
  locator.locate(
    (pos) => {
      $("cancel-locate").hidden = true;
      // Rounded to ~1 km — plenty for astronomy, and less precise to store.
      const loc = resolveGpsFix(pos.coords, {
        name: $("name-input").value.trim(),
        typedSinceLocate,
      });
      if (!loc) {
        setStatus("setup-status", STATUS.keptTyped);
        return;
      }
      saveLocation(loc);
      clearStatuses();
      state.editing = false;
      refresh();
    },
    (err) => {
      $("cancel-locate").hidden = true;
      setStatus("setup-status", gpsFailure(err));
    },
    { timeout: 15000 }
  );
});

$("cancel-locate").addEventListener("click", () => {
  stopLocating();
  setStatus("setup-status", null);
});

for (const id of ["lat-input", "lon-input"]) {
  $(id).addEventListener("input", () => {
    if (locator.pending) typedSinceLocate = true;
  });
}

$("manual-form").addEventListener("submit", (e) => {
  e.preventDefault();
  // Rounded to ~1 km before storage, exactly like a GPS fix (ADR-0005).
  const loc = resolveTypedLocation({
    lat: parseFloat($("lat-input").value),
    lon: parseFloat($("lon-input").value),
    name: $("name-input").value.trim(),
  });
  if (loc) {
    stopLocating(); // a save supersedes any fix still on its way
    saveLocation(loc);
    clearStatuses();
    state.editing = false;
    refresh();
  } else {
    setStatus("form-status", invalidTyped());
  }
});

$("location-chip").addEventListener("click", () => {
  state.editing = true;
  clearStatuses(); // no stale message from a past visit
  showSection();
  if (state.location) {
    $("lat-input").value = state.location.lat;
    $("lon-input").value = state.location.lon;
    $("name-input").value = state.location.name || "";
  }
});

$("cancel-edit").addEventListener("click", () => {
  stopLocating();
  state.editing = false;
  clearStatuses();
  showSection();
});

$("time-slider").addEventListener("input", (e) => {
  state.time = scrub(state.time, Number(e.target.value), julianDate(new Date()));
  renderMap();
});

$("time-now").addEventListener("click", () => {
  state.time = scrub(state.time, 0);
  $("time-slider").value = "0";
  renderMap();
});

window.addEventListener("resize", renderMap);

// Keep "tonight" fresh if the app stays open at the campsite.
setInterval(refresh, 5 * 60 * 1000);

// Auto-suggest night mode after sunset on first visit this session.
if (!localStorage.getItem(MODE_KEY) && state.location) {
  const s = sunPosition(julianDate(new Date()));
  const { alt } = altAz(s.ra, s.dec, julianDate(new Date()),
    state.location.lat, state.location.lon);
  if (alt < -6) state.mode = "night";
}

applyMode();
refresh();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
