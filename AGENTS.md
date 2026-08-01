# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## What this is

A calm, local-first **stargazing** app for family camping trips (vanilla-JS
PWA, no build step, no runtime dependencies). Part of the OpenHearth family;
WeatherGlass is the closest sibling and its conventions apply where they fit.

**Read in this order:** [README](README.md) → [VISION.md](VISION.md) (the one
idea + the honest scorecard) → this file → [docs/](docs/) (the Diátaxis hub).
Decisions are in [docs/adr/](docs/adr/) — read 0001 before touching anything
that could reach the network.

## Non-negotiables (breaking one is a regression, not a feature)

- **Zero network at runtime.** No fetch, no CDN, no fonts, no analytics, no
  backend — the app must work with airplane mode on, forever.
  [`test/no-egress.test.mjs`](test/no-egress.test.mjs) pins this; code that
  reaches the network must make that test fail. Treat any new URL as a privacy
  change, not a feature.
- **Location stays on-device.** It lives in `localStorage`, rounded to ~1 km
  at capture. There is nowhere to send it; keep it that way.
- **No runtime dependencies, no build step.** `app/` is served as-is.
  `astronomy-engine` is a dev dependency used only by tests as a reference
  implementation.
- **Ephemeris changes ship with validation.** Anything touching
  `app/js/astro.js` must keep `test/astro.test.mjs` green — its tolerances ARE
  the spec (sun 0.02°, moon 0.05°, planets 0.05°, rise/set 2–3 min), and the
  five-year sweep at the bottom of that file is what turns the README's
  accuracy numbers into claims rather than hopes. Spot-checking a handful of
  dates is not enough: an ephemeris goes wrong in narrow windows a short list
  steps straight over. Full table: [docs/reference/accuracy.md](docs/reference/accuracy.md).
- **`astro.js` stays pure.** No DOM, no storage, no clock of its own — every
  function takes the instant it should use. That purity is what lets the
  reference implementation check it; if you need "now" or the user's place,
  pass them in.
- **`app/js/data.js` is generated.** Never hand-edit; change
  `tools/generate_data.py` and regenerate (provenance is documented there).

## Where things are

| You're touching… | Go to |
|---|---|
| Ephemeris math (sun/moon/planets, rise/set, twilight) | `app/js/astro.js` |
| Star chart rendering & projection | `app/js/skymap.js` |
| UI, tonight panel, planets list, location, night mode | `app/js/app.js` |
| Star/constellation catalog (generated) | `app/js/data.js` ← `tools/generate_data.py` |
| Theme (incl. red night palette) | `app/css/style.css` (CSS vars), `PALETTES` in `skymap.js` |
| Offline behavior | `app/sw.js` — bump `CACHE` version when app files change |

## How to work here

```sh
npm install   # dev deps for tests only
npm test      # must be green before you commit
npm run serve # http://localhost:8321
```

When you're unsure, prefer the more private default, a failing test over a
plausible fix, and matching the surrounding code over a new pattern.

## Fleet conventions that bind this repo

- **The shipped agent guide is this file.** `CLAUDE.md` is a local working
  artifact and is git-ignored — never commit one.
- **Commits use the neutral persona** `OpenHearth Development`, state the
  *why* rather than the what, and carry no tool-attribution trailers.
- **Default branch is `master`**, which CI keys off. If you ever rename it,
  change `.github/workflows/ci.yml` in the same commit or CI simply stops
  running without saying so.
- **The PWA deploys by hand to the `gh-pages` branch**, like every other app
  in the fleet: copy `app/` to a clean tree and force-push it. There is no
  deploy workflow on purpose — a shipped release is a thing someone chose to
  do, and the whole fleet does it the same way.
- **Fetch before push. Atomic commits.** MIT, like the rest of the fleet.
