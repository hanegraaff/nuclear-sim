# Nuke Simulator Site source

This directory builds the user-facing static Site. The full-screen MapLibre satellite map carries the prototype-style control panel, independent cloud instrument, animated missiles, ground effects, and WebGL fireballs. The public product has one entry point; the source packages below keep selection, physical estimates, state transitions, and drawing separate.

## What happens after a click

The map converts a click into a geographic aim point. The application freezes the selected device and a MIRV's deterministic geographic targets at that click, before any camera movement. The map chooses a viewport-edge carrier route; the application store keeps the resulting launch group and advances it with an injected monotonic clock. A normal click carries one impact. A MIRV click uses its catalog count and **per-warhead** yield for three or ten distinct impacts. One carrier normally branches near 60% of flight. Geographic route planning moves separation earlier or lengthens the incoming approach if needed to keep the warheads moving forward; the map also checks the projected route for the current pitch and bearing before launch. The targets and their physical radii do not move. The same group survives a multi-to-single mode switch.

The renderer projects geographic routes through the current camera for every frame, keeping the missile, reticles, fireballs, fields, and markers attached during pan, zoom, pitch, and resize. If an entry or spread is unsafe at the current high zoom or narrow view, a red reticle appears immediately and the map eases for roughly 450 ms before dispatching the frozen click. Multi-mode clicks wait in order; Reset and replacement cancel pending work. A failed route after bounded framing attempts is reported without disabling the map. A narrow spread that would hide almost all settled centers can receive an additional one-time fit below the controls. When a hidden page returns or the window regains focus, the fireball layer discards its stale camera matrix and requests a fresh projection. In single mode, a settled field has four geographic zone boundaries, a dashed ruler, and inspectable markers. In multi mode, click groups accumulate, carriers share a general entry direction, and bounded field intensities move overlapping samples toward warmer legend colors. The lower-left distance bar and four-band legend replace the single ruler. Reset cancels animation and clears every group while retaining device, mode, and camera.

## Settled effect views

Once every retained delivery has completed and no launch is pending, Blast and eligible Fallout views can be selected. Availability follows the retained impacts rather than the currently selected device: conventional-only scenes have no Fallout tab, mixed scenes include only nuclear fields, and a MIRV contributes a separate footprint for each warhead using its individual yield. A new launch returns to Blast; Reset removes both views' effects and inspection state.

Fallout shows an H+24 surface-burst screening envelope driven by a deterministic latitude-band wind proxy. Its warm local core, curved irregular plume, purple/pink/orange bands, and four inspectable markers reproduce the prototype. In single mode, the map frames the first nuclear footprint and restores the saved Blast camera on return; a retained MIRV still renders all its warhead fields. Multi mode preserves the camera and replaces the geographic ruler with a map scale and four-band legend describing the newest nuclear delivery. Overlap sums normalized field intensity, bounded at one, without inventing a combined device or dose. The printed Gy bands and health descriptions are illustrative prototype copy, not computed exposure or live meteorology. Only Blast and Fallout are currently implemented.

The cloud monitor follows the latest group's first ignited warhead through growth and modeled peak. Nuclear and conventional silhouettes differ; MIRV wording identifies the per-warhead scale. All displayed distances and heights are illustrative estimates. See [model notes](docs/model.md) and [visual reference](docs/visual-reference.md).

## Source boundaries

| Area | Responsibility |
| --- | --- |
| [`src/catalog/`](src/catalog/README.md) | Exact device and scenario choices, labels, yields, and coordinates. |
| [`src/domain/`](src/domain/README.md) | Pure geodesy, blast, MIRV spread, cloud, deterministic wind/fallout, zone-area, and normalized overlap calculations. |
| [`src/application/`](src/application/README.md) | Selection, launch groups, injected clock, phases, effect-view eligibility, inspection state, and model-derived presentation. |
| [`src/rendering/`](src/rendering/README.md) | MapLibre camera and imagery, Canvas fields and missiles, WebGL fireballs, and geographic overlays. |
| [`src/ui/`](src/ui/README.md) | React controls, map mount, status, instrument, and accessible inspection. |
| [`tests/`](tests/README.md) | Deterministic unit, integration, and browser verification. |

Model output never contains screen pixels or drawing objects. Application state never owns MapLibre or React components. Rendering receives immutable launch frames and uses one map camera to project them. The shared multi-field grid has bounded sample storage and chunked work; dense scenes may render more softly or finish filling after a camera change, but visible impacts remain eligible. The map scale estimates distance at the camera center, especially approximate on a pitched view.

## Engineering setup and delivery

Use Node.js 22.13 or newer. In this directory, run `npm ci` and, when needed, `npx playwright install chromium`. `npm run verify` runs type checking, lint, unit and integration tests, a build, and Playwright browser checks. `npm run dev` and `npm run preview` support engineering inspection. Browser tests replace live Esri raster tiles with a deterministic fixture; production uses Esri World Imagery with visible attribution and a retry notice if imagery fails.

The tracked `.openai/hosting.json` points the existing Site to the static `dist/` build. The root GitHub repository is authoritative; [publishing instructions](../docs/sites-publishing.md) copy an exact pushed source tree into a clean temporary release checkout, verify it, and publish to the same owner-private Site. Prototype code and screenshots are read-only references outside this directory.
