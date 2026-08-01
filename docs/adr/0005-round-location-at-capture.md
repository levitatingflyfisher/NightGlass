# 0005 — Round the location at capture, not at use

**Status:** accepted · **Date:** 2026-06

## Context

ADR-0001 means there is nowhere for a coordinate to go, so it is tempting to
say location privacy is already solved and store whatever the GPS returns.

That reasoning is fragile in a specific way: it makes the privacy property
depend on a *promise about future code* ("we will never add a request") rather
than on the data at rest. Browser `localStorage` is also readable by anything
that achieves script execution on the origin, and a shared device is shared.

## Decision

A coordinate is rounded to roughly a kilometre **at the moment it is captured**
— before it is stored, before it is used. Nothing in the app ever holds a
precise fix.

## Consequences

**We get:** a store that cannot leak precision it never had. If NightGlass one
day grows an export, a bug report attachment, or a sync feature, the worst it
can carry is a coarse cell. The invariant holds without anyone remembering it.

**We give up:** nothing the app needs. At ~1 km, rise and set times move by
well under the 2–3 minute tolerance of ADR-0004, and the star chart is
unchanged to the eye. Precision beyond this buys accuracy no user could detect.

**Relationship to WeatherGlass:** the sibling app rounds for the same reason
but under real pressure — it *must* send a coordinate to Open-Meteo, so its
rounding is the only lever it has. NightGlass rounds even though it has no
request to protect, because the lever costs nothing and the guarantee stops
depending on anyone's future restraint.

## Revisit if

Someone reports rise/set times that are wrong at their location by more than
the stated tolerance — check whether rounding is the cause before increasing
precision, since a bug in `astro.js` is the likelier explanation.
