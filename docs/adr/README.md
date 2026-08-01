# Architecture Decision Records

Short notes on decisions that were *not obvious*, written when they were made
so the reasoning survives the reasoning's author. Each one says what was
decided, what it costs, and what would have to change for it to be revisited.

An ADR is not a design doc and not a spec. If a decision was forced (MIT
because the fleet is MIT) it does not need a record. If someone could
reasonably arrive tomorrow and say "why on earth is it like this?", it does.

| # | Decision |
|---|---|
| [0001](0001-compute-the-sky-on-device.md) | Compute the sky on-device; never call a service |
| [0002](0002-vanilla-js-no-build-step.md) | Vanilla JS, no framework, no build step |
| [0003](0003-ship-a-trimmed-star-catalog.md) | Ship a trimmed star catalog, generated and checked in |
| [0004](0004-validate-ephemeris-against-a-second-implementation.md) | Validate the ephemeris against an independent implementation |
| [0005](0005-round-location-at-capture.md) | Round the location at capture, not at use |
