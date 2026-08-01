# Your first night out

Learning-oriented: from opening NightGlass to knowing what time to set an
alarm for. About five minutes, and you can do it from your kitchen — you do
not need to be at the campsite yet.

## 1. Tell it where you'll be

On first open, NightGlass asks where you are camping. Two ways:

- **Use my location** — the browser asks permission; the answer is rounded to
  about a kilometre before it is even stored ([ADR-0005](../adr/0005-round-location-at-capture.md)).
- **Type it** — latitude and longitude, plus a name you'll recognise
  ("Yellowstone camp"). This is the one to use when you are planning a trip
  from home, because it should be the *campsite's* coordinates, not yours.

Two decimal places is plenty. You can get them from any map app by
long-pressing the spot.

## 2. Read tonight

The **Tonight** panel answers the question campers actually ask, which is not
"when is sunset" but *"when is it actually worth looking up?"*

The headline is the **best dark window** — the stretch when the sun is far
enough below the horizon for real darkness *and* the moon is out of the way.
That second half is the part people forget: a full moon is a floodlight, and a
technically-dark sky with the moon up shows a fraction of the stars.

Underneath it:

- **Sunset** and **sunrise** — the bookends.
- **True darkness** — astronomical twilight, when the sun is 18° down. At high
  latitudes in summer that never happens, so NightGlass falls back to nautical
  or civil twilight and says which it used rather than pretending.
- **Moonrise, moonset, phase and illumination** — how much light you are
  contending with, and when.

**Set your alarm for the start of the dark window.** That is the whole trick.

## 3. Look at the sky map

The **Sky map** is the sky above your spot, drawn as if you were lying on your
back looking up. Hold your phone overhead with the **N** on the chart pointing
north and the chart matches what you see.

Drag the **time slider** to move through the night. This is worth doing before
you go: it shows you what will have risen by the time your dark window starts,
which is often quite different from what is up at sunset.

## 4. Find the planets

The **Naked-eye planets** list gives you, for each of Mercury through Saturn
that is visible tonight: when, which direction to look, and how high above the
horizon.

"How high" matters more than beginners expect. Anything under about 15° is
looking through several times as much atmosphere as overhead, and through
whatever trees and hills you have. A planet at 8° is technically up and
practically not there.

## 5. Turn on red mode when you arrive

One tap turns the whole app deep red. Your eyes take twenty to thirty minutes
to fully dark-adapt and about half a second of white phone screen to undo it —
which is why every observer's torch is red. NightGlass suggests red mode after
dusk; it never forces it.

## 6. Install it before you leave

Add NightGlass to your home screen while you still have signal. After that
first load it works with no connection at all, forever, because it never had
one to lose ([the no-egress invariant](../reference/no-egress.md)).

That last step is the one to actually do now — a stargazing app you cannot
open at the campsite is worth nothing at all.
