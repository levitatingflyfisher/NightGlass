# How to regenerate the star catalog

Task-oriented. `app/js/data.js` is generated and checked in
([ADR-0003](../adr/0003-ship-a-trimmed-star-catalog.md)) — never hand-edit it.
Regenerate when you want a different magnitude cut, more named stars, or a
refreshed upstream catalog.

## Steps

From the repo root:

```sh
curl -O https://registry.npmjs.org/d3-celestial/-/d3-celestial-0.7.35.tgz
tar -xzf d3-celestial-0.7.35.tgz \
    package/data/stars.6.json package/data/starnames.json \
    package/data/constellations.json package/data/constellations.lines.json
python3 tools/generate_data.py package/data
npm test
```

The generator writes `app/js/data.js` in place. Nothing else needs to change.

## Choosing the limits

Two constants at the top of `tools/generate_data.py`:

| Constant | Default | What it does |
|---|---|---|
| `MAG_LIMIT` | `5.0` | Stars fainter than this are dropped entirely |
| `NAME_MAG_LIMIT` | `2.0` | Only stars brighter than this get an on-map label |

`5.0` is chosen for a real campsite rather than a perfect one. A genuinely dark
site reaches about magnitude 6, but going there roughly triples the star count
for objects most people cannot pick out, and every one of those rows is bytes
the service worker has to cache before you lose signal.

Raising `NAME_MAG_LIMIT` clutters the chart fast — labels collide long before
the stars do.

## What must stay true afterwards

- **The BSD-3-Clause notice travels with the data.** It appears in the
  generator's docstring, in the header of the generated `data.js`, and in the
  README's *Data & licenses* section. Keep all three.
- **`npm test` stays green.** The chart tests read the catalog's shape.
- **Bump `CACHE` in `app/sw.js`.** Otherwise anyone who has already installed
  the PWA keeps the old catalog forever — the service worker has no reason to
  suspect the file changed.
- **Do not check in `package/` or the tarball.** They are upstream inputs, not
  ours to redistribute; only the generated, attributed extract ships.
