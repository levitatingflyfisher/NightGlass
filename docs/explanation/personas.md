# Personas

Agents drive the real NightGlass PWA as these people, per the fleet testing
rule. Each scenario gives a start state, plain steps, what success looks like,
and what to check. "Standard checks" means: a 360 px wide viewport with
browser text at 130 percent, red night mode as well as day mode, offline
after the first load, and every message in plain words placed next to the
thing it is about. Scenarios aim at the weak spots found by the September
2026 lens audit.

## Primary: Kiri, a parent planning a camping-trip star night

Kiri is 37, takes their two kids camping twice a summer, and wants to know
when to wake them for the best dark sky. At camp there is no signal. They
check at dusk by the tent, phone in one hand, torch in the other.

- **Goal:** find tonight's best moon-free window, then see what the sky will
  look like then.
- **Context:** no signal, dark-adapted eyes, red night mode, one-handed.
- **Would quit if:** typed coordinates vanish, or the screen shows two
  different times at once.

**K1. First run with GPS denied.** Start: fresh load, location permission
denied. Steps: tap "Use my location". Success: the message says the
permission was denied (not a generic failure), sits next to the button, and
does not point "below" at fields above it. Check: the message clears after a
manual save; standard checks.

**K2. Change campsite while waiting.** Start: a saved location. Steps: tap the
location chip; start typing new coordinates; wait six minutes without saving.
Success: the form stays open with the digits intact; a Cancel exists. Check:
the chip looks tappable and says what it does.

**K3. Scrub to midnight.** Start: dashboard opened at 4 PM. Steps: drag the
time slider to about midnight; read the chart, the planet list and the time
readout. Success: the shown time is stated on or beside the chart; the planet
list matches the chart's moment, or says it describes the whole night; the
slider can reach the end of the recommended window. Check: text at 130
percent.

**K4. Nothing up tonight.** Start: a date and place where no planet clears 5
degrees. Steps: read Naked-eye planets. Success: a sentence explains, not a
blank paragraph. Check: offline.

**K5. Coordinates from a paper map.** Start: GPS off, at a new site. Steps:
enter latitude 44.60 and longitude 110.50, forgetting the minus for West.
Success: fields explain the sign convention (N +, S -; E +, W -), and the
chip shows "44.60 N, 110.50 E" so the mistake is visible. Check: placeholders
show an example.

## Secondary: Jonah, a teenager using red night mode

Jonah is 15, Kiri's eldest, and is in charge of the star chart at camp.

- **Goal:** find Saturn and name a constellation.
- **Context:** red night mode, phone held overhead, dim screen.
- **Would quit if:** labels smear together or the red text is unreadable.

**J1. Night mode state.** Start: after dusk, first launch. Steps: note whether
night mode switched on by itself; tap the toggle twice. Success: the control
says "Night mode: on" or "off" in words. Check: secondary red text is
readable against the panel.

**J2. Chart legibility.** Start: dashboard with a crowded region such as
Auriga. Steps: read star and constellation names at 130 percent text.
Success: labels do not overlap and grow with text size. Check: night mode.

**J3. Which way is East?** Start: dashboard with Saturn listed as "look
SSE". Steps: find the posture hint; hold the phone as it says, facing north;
compare the chart with the planet list. Success: the hint is easy to find
and read; chart and list agree on directions. Check: 130 percent text.
