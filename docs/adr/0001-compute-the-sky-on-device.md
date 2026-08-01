# 0001 — Compute the sky on-device; never call a service

**Status:** accepted · **Date:** 2026-06

## Context

The obvious way to build a stargazing app is to call something: an ephemeris
API, a light-pollution tile server, a cloud-cover forecast. That is how most of
them work, and it is why most of them are useless at the exact moment you want
them — standing in a field, two hours from a town, with no bars.

The sky is also the least private-feeling and most private-in-practice data
there is. Where Jupiter is tonight is identical for everyone at your latitude
and determined centuries ahead. But *asking* where Jupiter is tells a server
where you are and when you were outside.

## Decision

NightGlass makes **zero network requests at runtime**. The star catalog ships
inside the app; the sun, moon and planet positions are computed on-device from
classical algorithms (Meeus; Schlyter's planetary elements).

This is enforced, not promised: `test/no-egress.test.mjs` scans the shipped
sources for network APIs and external URLs and fails on any of them. Adding a
URL is therefore a test failure, which makes it a conversation rather than an
accident.

## Consequences

**We get:** an app that works in airplane mode forever, no location trail
because there is no request to carry one, no API key to rotate, no service to
pay for or keep alive, and a privacy claim a reader can verify by running one
test instead of trusting a policy.

**We give up:** anything that genuinely requires a server. Cloud-cover
forecasts and live aurora alerts are the two people ask for, and NightGlass
cannot have them without ceasing to be this app. The honest answer is to point
at WeatherGlass for the sky *conditions* and keep NightGlass for the sky
*itself*.

**We also give up** free accuracy upgrades. A service could improve its
ephemeris without us; ours improves only when someone edits `astro.js` — which
is why ADR-0004 exists.

## Revisit if

Never, while the app is called local-first. A build-time data refresh (a newer
catalog baked into a release) is compatible with this decision; a runtime fetch
is not, whatever it fetches.
