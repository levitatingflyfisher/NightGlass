# 0003 — Ship a trimmed star catalog, generated and checked in

**Status:** accepted · **Date:** 2026-06

## Context

ADR-0001 rules out fetching a catalog, so it has to ship with the app. Full
star catalogs are large — the HYG database is megabytes — and a camper does not
need them. From a dark campsite the naked eye reaches about magnitude 6; from
anywhere with a neighbouring town, closer to 4.

## Decision

`app/js/data.js` is **generated** by `tools/generate_data.py` from
[d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3-Clause, © Olaf
Frohn), whose data derives from HYG (Yale Bright Star Catalog + Hipparcos). It
is cut to magnitude 5.0, with on-map names only for stars brighter than
magnitude 2.0, and coordinates rounded to two decimals.

The generated file **is checked in**. The generator is not run at build time —
there is no build.

## Consequences

**We get:** a catalog small enough to cache in a service worker, a sky that
matches what an unaided eye actually sees rather than a wall of noise, and no
generation step between clone and run.

**We give up:** faint objects, and the ability to change the cut without
regenerating. The magnitude limits are in the generator, so changing them is a
one-line edit plus a re-run — but it does require fetching the upstream tarball
again, which is why the exact commands live in the generator's docstring.

**Obligation:** the BSD-3-Clause notice travels with the data. It is in the
generator's docstring, in the header of the generated `data.js`, and in the
README's *Data & licenses* section. If the data is ever re-cut, all three stay.

## Revisit if

Someone wants deep-sky objects (they shouldn't — see VISION) or a fainter
limit for genuinely dark sites. A second, optional catalog file that the
service worker fetches on demand would violate ADR-0001; a larger shipped
catalog would not, it would just cost bytes.
