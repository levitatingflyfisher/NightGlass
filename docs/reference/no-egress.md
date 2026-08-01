# The no-egress invariant

> **NightGlass makes no network requests at runtime.** Not "few". Not
> "anonymised". None.

This page states that precisely, says exactly what the test checks, and — more
importantly — says what it *cannot* check, because an invariant you overstate
is worse than one you describe honestly.

## What is guaranteed

After the first visit loads the app, NightGlass never contacts anything. There
is no API, no CDN, no web font, no analytics, no error reporting, no update
ping. Turn on airplane mode and every feature still works: tonight's darkness
window, the star chart, the planet list, the time slider.

This is a property of the code, not a policy. There is nothing to opt out of.

## What the test checks

[`test/no-egress.test.mjs`](../../test/no-egress.test.mjs), run in CI on every
push:

**In every shipped `.js` file** (`app/js/*.js` plus `app/sw.js`), with `//`
comment lines stripped first so a comment may still cite a URL:

- no `http://` or `https://` string anywhere
- no `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`,
  `importScripts`, or `new Request(`
- no `fetch(` **except** in `app/sw.js`

The service worker is the single deliberate exception, and a narrow one: its
`fetch` handler intercepts requests *the page already made* and serves them
from cache. Since the page only ever requests its own files, that handler
cannot originate traffic — it can only answer it.

**In `app/index.html`:** every `src=` and every non-anchor `href=` must be a
relative path. An absolute URL or a protocol-relative `//` fails the test.
Plain `<a href>` links are skipped on purpose: a link the user chooses to
click is navigation, not a runtime request.

## What the test cannot check

Say this plainly rather than let a green tick imply more than it earns:

- **It is a source scan, not a runtime sandbox.** A URL assembled from pieces
  at runtime (`"htt" + "ps://…"`) would pass. Nothing does that today, and
  doing it deliberately would be a straightforward act of sabotage rather than
  an accident — which is the class of thing this test is designed to catch.
- **It says nothing about the page that *hosts* the app.** Served from GitHub
  Pages, your browser still contacts GitHub to fetch the app itself; the
  guarantee starts once it is loaded, and is absolute once installed as a PWA.
- **It does not audit the browser.** Extensions, a captive portal, or DNS
  prefetch are outside the app's reach.

## If you need to add a URL

You almost certainly should not — see [ADR-0001](../adr/0001-compute-the-sky-on-device.md).
If a genuine case appears, the honest path is: change the ADR first, say what
the app now sends and to whom, and only then touch the test. Editing the test
to make a feature pass is how an app like this quietly becomes an app like
every other one.
