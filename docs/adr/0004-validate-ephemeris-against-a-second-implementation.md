# 0004 — Validate the ephemeris against an independent implementation

**Status:** accepted · **Date:** 2026-06

## Context

Hand-written astronomy is quietly wrong in a way that is hard to notice. A
transcribed coefficient with a digit swapped still produces a plausible-looking
moon that is a degree off, and "a degree off" is invisible in a UI and obvious
through binoculars. Unit tests written by the same person who wrote the
algorithm tend to encode the same misreading.

## Decision

`test/astro.test.mjs` checks `app/js/astro.js` against
[astronomy-engine](https://github.com/cosinekitty/astronomy) — a separate,
independently-derived implementation — as a **dev dependency only**. The
tolerances are the specification:

| Quantity | Tolerance |
|---|---|
| Sun position | 0.02° |
| Moon position | 0.05° |
| Planet positions | a few arcminutes |
| Rise / set / twilight times | 2–3 minutes |

Those numbers are chosen to be *below what the app can show you*: an error
inside them cannot change a displayed time or a chart position a human eye
could check.

## Consequences

**We get:** accuracy claims in the README that are checked in CI rather than
asserted, and the freedom to optimise `astro.js` (fewer terms, cheaper
trigonometry) with something watching.

**We give up:** a dev dependency, and the mild awkwardness of shipping an app
whose reference implementation is better than its own. That is the right trade:
astronomy-engine is far larger than the whole of NightGlass, and pulling it in
at runtime would cost more bytes than the entire app.

**Note the asymmetry** — astronomy-engine is the *reference*, not the truth.
Both could be wrong together only if they shared a derivation, and they do not.

## Revisit if

Never remove the second implementation. If astronomy-engine goes unmaintained,
replace it with another independent one rather than dropping the check.
