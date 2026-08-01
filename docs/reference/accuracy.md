# Accuracy tolerances

NightGlass computes the sky itself ([ADR-0001](../adr/0001-compute-the-sky-on-device.md)),
so "is it right?" deserves numbers rather than reassurance. Every figure here
is checked in CI against [astronomy-engine](https://github.com/cosinekitty/astronomy),
an independently-derived implementation ([ADR-0004](../adr/0004-validate-ephemeris-against-a-second-implementation.md)).

## Position

Measured as the worst angular separation from the reference across **1500
instants spanning 2024 into 2029** (`test/astro.test.mjs`, "accuracy holds
across five years"):

| Body | Bound enforced | Worst measured |
|---|---|---|
| Sun | 0.02° | **0.009°** (0.5′) |
| Moon | 0.05° | **0.032°** (1.9′) |
| Mercury | 0.05° | **0.019°** (1.2′) |
| Venus | 0.05° | **0.030°** (1.8′) |
| Mars | 0.05° | **0.030°** (1.8′) |
| Jupiter | 0.05° | **0.020°** (1.2′) |
| Saturn | 0.05° | **0.029°** (1.8′) |

For scale: the full moon is about 0.5° across, and 1 arcminute is roughly the
finest detail an unaided eye can resolve. Every error above is smaller than
the thing it is describing — you would need a telescope and a target list to
notice any of them.

The enforced bounds are deliberately looser than the measured maxima, so a
refactor that costs a little exactness fails loudly rather than quietly
turning the numbers in the README into fiction.

## Time

| Quantity | Bound |
|---|---|
| Sunset, sunrise | 2 minutes |
| Moonrise, moonset | 3 minutes |
| Moon distance | 100 km |
| Sidereal time | 0.01° |
| Alt/az conversion | 0.2° |

Rise and set are looser than position on purpose: near the horizon the
dominant error is atmospheric refraction, which genuinely varies with
temperature and pressure by more than any ephemeris disagreement. A published
rise time is an estimate about the atmosphere, not just about geometry.

## What is deliberately *not* modelled

- **Topocentric parallax for the moon.** Positions are geocentric. The moon's
  parallax reaches about 1° — the largest single term omitted — which matters
  for occultation timing and not at all for "where do I look?". If you compare
  NightGlass against a topocentric source and see roughly a degree of moon
  disagreement, this is why, and both are right.
- **Nutation and polar motion**, which are far below the tolerances above.
- **Local horizon.** A mountain to your east delays sunrise by much more than
  any error here, and the app cannot know about your mountain.

## If you change `app/js/astro.js`

The tolerances are the specification. Keep `npm test` green — and if a change
makes something *more* accurate, tighten the bound and update this table, so
the next person inherits the improvement rather than the old promise.
