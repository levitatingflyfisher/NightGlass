// Pure view-state and location-capture logic for the setup / change-location
// flow. No DOM, no storage, no clock — app.js wires these to the page, and
// test/location-flow.test.mjs pins them.

// Which top-level section a refresh should show. Recomputing the sky must
// never choose the view on the user's behalf.
export function sectionFor({ hasLocation, editing }) {
  return !hasLocation || editing ? "setup" : "content";
}

// ADR-0005: every coordinate, typed or GPS, is rounded to ~1 km (two
// decimal places) at capture, before it is stored or used.
export const roundCoord = (x) => Math.round(x * 100) / 100;

// A GPS fix, rounded to ~1 km at capture (ADR-0005), merged with what the
// form holds: the place name is kept (read when the fix lands, so a name
// typed during the locate counts). If the user typed coordinates while the
// fix was on its way, the fix loses — returns null and nothing is saved.
export function resolveGpsFix(coords, { name, typedSinceLocate }) {
  if (typedSinceLocate) return null;
  return {
    lat: roundCoord(coords.latitude),
    lon: roundCoord(coords.longitude),
    name: name || undefined,
  };
}

// Wraps navigator.geolocation so an in-flight locate can be cancelled.
// getCurrentPosition cannot be aborted, so each locate gets a token and any
// callback whose token is no longer current is dropped.
export function createLocator(geolocation) {
  let current = null;
  return {
    locate(onFix, onError, options) {
      if (!geolocation) { current = null; onError({ unsupported: true }); return; }
      const token = {};
      current = token;
      geolocation.getCurrentPosition(
        (pos) => { if (current === token) { current = null; onFix(pos); } },
        (err) => { if (current === token) { current = null; onError(err); } },
        options,
      );
    },
    cancel() { current = null; },
    get pending() { return current !== null; },
  };
}

// Typed coordinates, validated and rounded exactly as a GPS fix is, turned
// into the location to save; null if out of range.
export function resolveTypedLocation({ lat, lon, name }) {
  if (!(Number.isFinite(lat) && Number.isFinite(lon) &&
        Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null;
  return { lat: roundCoord(lat), lon: roundCoord(lon), name: name || undefined };
}

// Why a locate failed, in words, pointing at the coordinate fields.
// The codes are the W3C GeolocationPositionError constants. The status line
// sits directly under "Use my location", so the fields are *below* it.
export function gpsErrorMessage(err = {}) {
  if (err.unsupported) return "This browser can’t share a location. Enter coordinates below.";
  switch (err.code) {
    case 1: return "Location permission was denied. Allow it in your browser’s site settings, or enter coordinates below.";
    case 2: return "Your device couldn’t determine a position (no GPS signal?). Try again outside, or enter coordinates below.";
    case 3: return "Locating took too long. Try again under open sky, or enter coordinates below.";
    default: return "No location fix came back. Try again, or enter coordinates below.";
  }
}

// Status lines. An error carries the error colour, an icon and a word
// (the title), so it still reads as an error with the colour taken away;
// the night palette has no red to spare for it. Info carries none of those.
export const STATUS = {
  locating: { kind: "info", text: "Locating…" },
  keptTyped: { kind: "info", text: "Kept the coordinates you typed; the location fix was not used." },
};

export const gpsFailure = (err) =>
  ({ kind: "error", title: "Couldn’t get your location.", text: gpsErrorMessage(err) });

export const invalidTyped = () => ({
  kind: "error",
  title: "Couldn’t set the location.",
  text: "Latitude must be between −90 and 90, longitude between −180 and 180.",
});
