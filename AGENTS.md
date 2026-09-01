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
- **Bump `CACHE` in `app/sw.js` in every commit that changes a shipped file,
  and list every new file in `ASSETS`.** The worker serves cache-first, so a
  family who installed the app and then drove out of signal keeps the old
  version for as long as the old cache name stands. `test/claims.test.mjs`
  fails if a shipped file is missing from `ASSETS`; nothing can check that you
  bumped the name, so the deploy list below starts with it.

## Where things are

| You're touching… | Go to |
|---|---|
| Ephemeris math (sun/moon/planets, rise/set, twilight) | `app/js/astro.js` |
| Star chart rendering & projection | `app/js/skymap.js` |
| Chart label size (follows the reader's text size) & collision layout | `app/js/labels.js` (pure; `test/labels.test.mjs` runs the real catalog through it) |
| UI, tonight panel, planets list, location, night mode | `app/js/app.js` |
| Star/constellation catalog (generated) | `app/js/data.js` ← `tools/generate_data.py` |
| Theme (incl. red night palette) | `app/css/style.css` (CSS vars), `PALETTES` in `skymap.js` |
| Offline behavior | `app/sw.js` (see the `CACHE` rule above) |

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

## Deploying the PWA (read, then do, one line at a time)

*What this is for:* putting `app/` on `gh-pages` so an installed copy updates
the next time it has signal, and still works when it has none.

1. `CACHE` in `app/sw.js` is higher than the one on `gh-pages`
   (`git show gh-pages:sw.js | grep CACHE`). If not, stop and bump it.
2. Every file under `app/` is in `ASSETS`, and every test file passes, one
   file at a time (`node --test test/<file>.test.mjs`).
3. Copy `app/` to a clean tree, commit as the neutral persona, fetch, then
   force-push to `gh-pages`.
4. Fetch the deployed `sw.js` and `index.html` from the live URL and confirm
   the new `CACHE` name is what is served.
- **Fetch before push. Atomic commits.** MIT, like the rest of the fleet.
