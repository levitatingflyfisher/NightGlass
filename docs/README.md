# Documentation

Organized on the [Diátaxis](https://diataxis.fr/) model — four kinds of docs
for four different needs. Find what you need by *what you're trying to do*,
not by guessing a filename.

| I want to… | I need | Go to |
|---|---|---|
| **learn by doing** | a Tutorial | [Tutorials](#tutorials) |
| **accomplish a specific task** | a How-to guide | [How-to guides](#how-to-guides) |
| **look up exact details** | Reference | [Reference](#reference) |
| **understand why** | Explanation | [Explanation](#explanation) |

New here? Read the [README](../README.md), then [VISION.md](../VISION.md) —
the one idea and an honest list of what this app does *not* do — then
[AGENTS.md](../AGENTS.md) for the map of the code.

---

## Tutorials
*Learning-oriented — take me by the hand through my first success.*

- **[Your first night out](tutorials/your-first-night.md)** — from opening the
  app to knowing what time to set an alarm for.

## How-to guides
*Task-oriented — I have a specific job to do.*

- **[Regenerate the star catalog](how-to/regenerate-the-catalog.md)** — fetch
  upstream data and rebuild `app/js/data.js`, including what to keep intact.

*Gap (contributions welcome):* how to wrap the PWA in an Android WebView shell,
the way Parlour and Trellis do. See the scorecard row in
[VISION.md](../VISION.md).

## Reference
*Information-oriented — I need exact details.*

- **[The no-egress invariant](reference/no-egress.md)** — precisely what "zero
  network requests" means, what the test checks, and what it cannot check.
- **[Accuracy tolerances](reference/accuracy.md)** — the numbers the ephemeris
  is held to, and why each one is where it is.

## Explanation
*Understanding-oriented — I want to know why.*

- **[VISION.md](../VISION.md)** — the one idea, what this must never become,
  and the honest scorecard.
- **[Architecture decisions](adr/)** — five records covering on-device
  computation, the vanilla-JS choice, the shipped catalog, ephemeris
  validation, and location rounding.
