# Vision

> The north star for NightGlass. If you (person or agent) are about to change
> something load-bearing — especially anything that could make the app reach
> the network, or anything under `app/js/astro.js` — read this first. It says
> what must stay true and why. For *how it's built*, see [AGENTS.md](AGENTS.md);
> for *why each decision was made*, [docs/adr/](docs/adr/).

## The one idea

**The whole sky is computed on your device.**

Every other stargazing app is a service. It wants your coordinates, an account,
a subscription, and a signal — and a signal is the one thing a good campsite
does not have. The sky is the most public data there is: the positions of the
sun, moon, planets and stars are determined centuries in advance by arithmetic
anyone can run. There is no reason at all to ask a server where Saturn is.

So NightGlass asks nobody.

> **Ship the catalog, compute the ephemeris on-device, and make zero network
> requests — so the app works in a canyon with no bars, and there is no
> location trail because there is no request to carry one.**

This is the sharper end of a move WeatherGlass already makes. WeatherGlass
*must* talk to a weather service, so it rounds your coordinate to a coarse grid
cell before anything leaves the device and shows you the exact request.
NightGlass needs no service at all, so the privacy property stops being a
promise about what we send and becomes a fact about the code: there is no
`fetch`. That is enforced by a test
([`test/no-egress.test.mjs`](test/no-egress.test.mjs)), not by this paragraph.

## What this is

A calm, **local-first** stargazing app for family camping trips: when tonight
actually gets dark, what the moon will do to your view, which planets are up
and where to look, and a chart of the sky directly overhead. Part of the
**OpenHearth** family of small, private, open-source tools for domestic life.
A vanilla-JS PWA — no framework, no build step, no runtime dependencies.

```
   your campsite                NightGlass                 the network
 ─────────────────         ────────────────────        ──────────────────
  a coordinate you    ──▶   rounded to ~1 km,               (nothing)
  typed, or GPS            stored in localStorage      no API, no CDN, no
                           ephemeris computed here     fonts, no telemetry
                           catalog shipped in-app      — pinned by a test
```

## What it must never become

- **A service.** The moment NightGlass needs a server, it stops working at the
  place it was built for. Any new URL is a privacy change, not a feature.
- **A telescope-owner's tool.** The audience is a family on a camping trip who
  want to know whether tonight is worth staying up for, and what that bright
  thing is. Depth is welcome; a barrier to entry is not.
- **A nag.** No streaks, no notifications, no "you missed the Perseids". The
  sky will be there next month.

## Honest scorecard

The point of this table is that it is allowed to say "no".

| Promise | Status |
|---|---|
| Zero network requests, forever | **Shipped** — no `fetch`/CDN/font/analytics anywhere; pinned by `test/no-egress.test.mjs`, which fails on any new URL |
| Works fully offline at a campsite | **Shipped** — service worker caches the app on first visit; the catalog and ephemeris are already local |
| Ephemeris accurate enough to trust | **Shipped** — sun 0.02°, moon 0.05°, planets arcminutes, rise/set 2–3 min, every tolerance validated against `astronomy-engine` in CI |
| Dark-window headline (moon-free astronomical night) | **Shipped** — with nautical/civil fallback at latitudes that never get astronomically dark |
| Naked-eye star chart | **Shipped** — 1,600+ stars to mag 5.0, constellation figures, moon and planets, time slider |
| Red night mode | **Shipped** — one tap; suggested after dusk, never forced |
| Installable PWA | **Shipped** |
| Location privacy | **Shipped, and structural** — rounded to ~1 km at capture, `localStorage` only. There is nowhere to send it |
| Android APK | **Not built.** The fleet ships PWA+APK for most apps; NightGlass is web-only today. A WebView shell (the Parlour/Trellis pattern) is the cheap path if it's wanted |
| Encrypted backup (`.ohbk`) | **Not built, and probably shouldn't be.** The only user data is a coordinate and a few toggles — a sanctuary backup would be ceremony around one line of JSON |
| Deep-sky objects, telescope targets | **Not built.** Deliberate: see "what it must never become" |
| Light-pollution / cloud forecast | **Not built, and cannot be** without breaking the one idea. Cloud cover needs a service. WeatherGlass is the app for that, and pointing a user at it is the honest answer |

## The seam worth knowing

`app/js/astro.js` is pure arithmetic — no DOM, no storage, no clock of its own
(every function takes the time it should use). That is what lets
`test/astro.test.mjs` check it against an independent implementation, and it is
why the accuracy claims above can be numbers rather than adjectives. Keep it
pure; if you need the current time or the user's place, pass them in.
