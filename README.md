# Z0DI Clock

The **Z0DI Clock** is an interactive web animation that visualizes the relationship between the Sun, Earth, and Moon within the tropical zodiac. It’s designed to be both visually compelling and phase-accurate for key lunar events.

## How to Embed Z0DI Clock

Interactive Sun–Earth–Moon visual in the tropical zodiac. Geocentric display. Phase-accurate Sun–Moon geometry around key lunar events.

## Live 
- App: https://bkuhlman80.github.io/zodi-clock/
- Embed view: https://bkuhlman80.github.io/zodi-clock/embed.html

## Why a Web Component

`<zodi-clock>` is a custom element exported by `docs/js/component.js`.

**Advantages**
- **Embed anywhere:** No iframe needed. Works in static HTML, CMS pages, React/Vue apps.
- **Config via attributes:** Set mode, datetime, labels without touching internals.
- **Multiple instances:** Independent clocks on one page.
- **Scoped styles:** Shadow DOM prevents CSS collisions.
- **Host control:** Size with CSS, position with your layout.

**Include once**
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<script defer src="https://cdn.jsdelivr.net/npm/astronomy-engine@2/astronomy.browser.min.js"></script>
<script type="module" src="https://bkuhlman80.github.io/zodi-clock/js/component.js"></script>
<zodi-clock initial-mode="animated" labels="1" style="display:block;max-width:960px"></zodi-clock>
```

**Runtime control (no iframe messaging)**
```js
const clock = document.querySelector('zodi-clock');
// jump to a specific UTC moment and freeze
clock.setAttribute('initial-dt', '2025-08-19T03:11:00Z');
clock.setAttribute('initial-mode', 'frozen');
// resume animation
clock.setAttribute('initial-mode', 'animated');
```

**Styling**
- Outer box: style the `<zodi-clock>` element (width, max-width, aspect-ratio).
- Internals are scoped; use attributes (`controls`, `labels`, `initial-*`) to change behavior.

## URL params (for `embed.html`)
- `mode`: `animated` | `frozen`
- `dt`: ISO-8601 UTC datetime, e.g. `2025-08-19T03:11:00Z` (optional)
- `controls`: `1` show | `0` hide
- `labels`: `1` show | `0` hide

## Direct embed (custom element)
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<script defer src="https://cdn.jsdelivr.net/npm/astronomy-engine@2/astronomy.browser.min.js"></script>
<script type="module" src="https://bkuhlman80.github.io/zodi-clock/js/component.js"></script>
<zodi-clock initial-mode="animated"></zodi-clock>
```

## Element attributes
- `initial-mode="animated|frozen"`
- `initial-dt="YYYY-MM-DDTHH:MM:SSZ"` (UTC)
- `controls="0|1"` (internal header UI)
- `labels="0|1"` (month/season labels)
- `embed="1"` (used by hosted embed; optional)
- `no-controls` (boolean; hide internal header)

## Controls behavior 
- Animated → header datetime input is blank; scene advances.
- Frozen → jumps to now (UTC) and freezes; input shows exact UTC.
- Changing the input sets the scene to that exact UTC datetime.

## Repo layout
All runtime assets live in `/docs` (served by GitHub Pages).
```bash
docs/
  index.html          # app
  embed.html          # iframe host
  js/
    component.js      # <zodi-clock> custom element
    wheel.js          # zodiac ring, spokes, sign labels
    seasons.js        # equinox/solstice ticks + labels
    nodes.js          # lunar nodes + eclipse corridor arcs
    bodies.js         # Sun/Earth/Moon + readouts
    engine.js         # fast longitude helpers + phase
    ephemeris.js      # true-node lookups
    ctx.js, svg.js    # drawing helpers
  favicon.svg / .png
  preview.png
```

## Develop

Serve docs/ locally and edit files in place.
```bash
- python3 -m http.server -d docs 5173
# open http://localhost:5173
```
Cache-bust during iteration by bumping the query on the module line in HTML:
```html
<script type="module" src="./js/component.js?v=2025-09-08-1"></script>
```

## Deploy

GitHub Pages serves from main → /docs. Push to deploy.
```bash
git add -A
git commit -m "update"
git push origin main
```

## Troubleshooting
- Old code showing → hard refresh or bump the ?v= query.
- Nothing renders → ensure astronomy-engine and component.js load (module type).
- Header duplicated → guard _mountControls() so it runs once.
- Seasons clipped → component.js sets a padded viewBox and svg.style.overflow = "visible". Adjust padding if needed.
