# 0006 — Two palettes, dark and red night; no light theme, no "follow the phone"

**Status:** accepted · **Date:** 2026-09

## Context

The fleet rule (operator ruling Q3) is that light, dark and "follow the
phone" are one tap away in every app that has themes, defaulting to the
phone. NightGlass has two palettes: a dark blue one, the default, and a red
one for night vision. It has no light palette, so the rule's three choices
do not map onto it, and the question is whether to add one.

## Decision

NightGlass keeps its two palettes and does not add a light theme or a
"follow the phone" option. The red night palette stays one tap away, in
the header, on every screen (there is only one).

- **A light theme would do harm where the app is used.** The app is opened
  outdoors after dusk. A white screen undoes the twenty minutes or more it
  takes eyes to adapt to the dark, for the person holding the phone and for
  everyone around the campfire. Offering it as a choice invites the harm.
- **The phone's light/dark setting is the wrong signal.** It says what the
  person prefers for their phone in general, not whether their eyes are
  dark-adapted right now. The signal that matters is the sun's altitude at
  the campsite, which the app already computes.
- **Daytime planning still reads.** The dark palette's text clears 4.5:1 on
  every ground (`test/contrast.test.mjs`), so checking tonight from the
  kitchen at noon works without a light theme.

## Consequences

**We get:** no path by which the app lights up a dark campsite, and one
fewer control.

**We give up:** a light theme for someone planning in bright sunlight, and
parity with the fleet's three-way toggle.

**Not decided here:** who chooses between dark and red (the app from the
sun, or only the user), and saying the toggle's state in words ("Night
mode: on"). Both are open audit findings (NightGlass audit finding 7,
contested row 1).

**Revisit if:** people report they cannot read the dark palette in
daylight. Then add a light palette as an explicit choice only, never the
default and never switched on after dusk.
