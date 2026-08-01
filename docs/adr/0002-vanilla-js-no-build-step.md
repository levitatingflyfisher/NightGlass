# 0002 — Vanilla JS, no framework, no build step

**Status:** accepted · **Date:** 2026-06

## Context

Most of the OpenHearth fleet is Flutter (Clean Architecture, Riverpod, Drift),
because most of the fleet stores structured household data and ships an APK.
NightGlass stores one coordinate and a couple of toggles, and its entire job is
arithmetic plus a canvas.

The fleet also has a second, smaller precedent — Parlour and ohPrimer are
single-file PWAs with zero dependencies — for exactly this shape of app.

## Decision

`app/` is plain ES modules, served as-is. No framework, no bundler, no
transpiler, no runtime dependencies. The only `node_modules` entry is
`astronomy-engine`, a **dev** dependency that exists solely so the tests have
an independent implementation to check against (ADR-0004).

## Consequences

**We get:** `npm run serve` and it runs; what you read in `app/js/` is exactly
what ships; the no-egress test can scan the real sources rather than a bundle;
the service worker caches a handful of stable files; and there is no supply
chain to speak of, which for an app whose selling point is "nothing leaves your
device" is worth more than any developer convenience.

**We give up:** the ergonomics people expect — no JSX, no reactive state, no
type checking. State is a plain object and rendering is explicit. That is
sustainable at ~900 lines and would not be at ten times that; if this app ever
grows a second major screen, revisit rather than accreting a hand-rolled
framework.

## Revisit if

The UI outgrows explicit render calls, *or* someone wants an APK — a WebView
shell (Parlour's pattern) keeps this decision intact, whereas a Flutter rewrite
would replace it.
