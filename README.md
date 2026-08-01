# NightGlass

A calm, local-first **stargazing** app for family camping trips. *The night sky,
from your campsite.*

NightGlass tells you when tonight gets truly dark, what the moon will do to your
view, which planets are out, and shows a star chart of the sky directly above
you. It is part of the **OpenHearth** family of small, private, open-source apps
for domestic life — WeatherGlass reads the day sky; NightGlass reads the night.

> **Vision, in one line:** the whole sky is computed on your device.
> NightGlass makes **zero network requests** — no API, no CDN, no fonts, no
> telemetry — so it works at a campsite with no signal at all. That property is
> enforced by a test ([`test/no-egress.test.mjs`](test/no-egress.test.mjs)),
> not just a promise.

**Orientation:** this README → [VISION.md](VISION.md) (the one idea + an
honest scorecard of what it does *not* do) → [AGENTS.md](AGENTS.md) (map of
the code + how to work here) → [docs/](docs/) (the
[Diátaxis](https://diataxis.fr/) hub: tutorials · how-to · reference ·
explanation). Decisions live in [docs/adr/](docs/adr/).

## What it does

- **Tonight** — sunset and sunrise, the *true darkness* window (astronomical
  twilight, falling back to nautical/civil at midnight-sun latitudes), moonrise,
  moonset, phase and illumination, and the headline campers actually want: the
  **best moon-free dark window** for stargazing.
- **Sky map** — a full-sky chart of 1,600+ naked-eye stars, constellation
  figures and names, the moon and planets, for your spot and any moment
  tonight (drag the time slider). Hold the screen overhead, face N north.
- **Naked-eye planets** — when each of Mercury–Saturn is visible tonight,
  which direction to look, and how high.
- **Red night mode** — one tap turns everything deep red to preserve
  dark-adapted eyes at the campsite; suggested automatically after dusk.
- **Installable PWA** — works fully offline after the first visit.

## Why it's different

- **Local-first, offline-always.** The ephemeris (sun, moon, planets) is
  computed on-device from classical astronomical algorithms (Meeus, Schlyter);
  the star catalog ships with the app. Your location and settings live in
  `localStorage`. No account, no cloud, no backend.
- **Private by construction.** WeatherGlass must round your coordinate before
  a request leaves the device; NightGlass goes one better — *nothing* leaves
  the device, because there are no requests. Geolocation (if you use it) is
  rounded to ~1 km before it's even stored.
- **No ads, no trackers, no analytics. No dependencies at runtime.**

## Accuracy

Good enough that you'd need a telescope to notice. Worst case across 1500
instants spanning 2024–2029, checked in CI against
[astronomy-engine](https://github.com/cosinekitty/astronomy) (a dev-only
dependency): **sun 0.009°, moon 0.032°, planets under 0.030°** — all well
inside 2 arcminutes, against a full moon 0.5° wide. Rise and set times land
within 2–3 minutes. Full table and what is deliberately not modelled:
[docs/reference/accuracy.md](docs/reference/accuracy.md).

## Run it

It's a static page — any web server works, no build step:

```sh
npm run serve          # http://localhost:8321
```

## Develop

```sh
npm install            # dev deps only (astronomy-engine, for tests)
npm test               # validates the ephemeris + the no-egress invariant
```

The star catalog (`app/js/data.js`) is generated — see
[`tools/generate_data.py`](tools/generate_data.py) for provenance and how to
regenerate it.

## Data & licenses

- App: **MIT** (see [LICENSE](LICENSE)).
- Star and constellation data: extracted from
  [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3-Clause,
  © Olaf Frohn), derived from the HYG database (Yale Bright Star Catalog +
  Hipparcos).
