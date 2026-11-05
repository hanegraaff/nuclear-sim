# Nuke Simulator Site source

This directory builds the user-facing static Site. The full-screen MapLibre satellite map carries the prototype-style control panel, independent cloud instrument, animated missiles, ground effects, and WebGL fireballs. The public product has one entry point; the source packages below keep selection, physical estimates, state transitions, and drawing separate.

## What happens after a click

The map converts a click into a geographic aim point and a viewport-edge carrier route. The application store freezes the selected device and route in one launch group and advances it with an injected monotonic clock. A normal click carries one impact. A MIRV click uses its catalog count and **per-warhead** yield to create a deterministic geographic spread around the aim point. One carrier follows the route until roughly 60% of flight, then continuous individual branches lead to staggered impacts. The same group survives a multi-to-single mode switch.

The renderer projects geographic routes through the current camera for every frame, keeping the missile, reticles, fireballs, fields, and markers attached during pan, zoom, pitch, and resize. On a narrow screen, an otherwise hidden MIRV spread is framed once with room below the controls. In single mode, a settled field has four geographic zone boundaries, a dashed ruler, and inspectable markers. In multi mode, click groups accumulate, the incoming carriers share a general entry direction, and bounded field intensities move overlapping samples toward warmer legend colors. The lower-left distance bar and four-band legend replace the single ruler. Reset cancels animation and clears every group while retaining device, mode, and camera.

The cloud monitor follows the latest group's first ignited warhead through growth and modeled peak. Nuclear and conventional silhouettes differ; MIRV wording identifies the per-warhead scale. All displayed distances and heights are illustrative estimates. See [model notes](docs/model.md) and [visual reference](docs/visual-reference.md).

## Source boundaries

| Area | Responsibility |
| --- | --- |
| [`src/catalog/`](src/catalog/README.md) | Exact device and scenario choices, labels, yields, and coordinates. |
| [`src/domain/`](src/domain/README.md) | Pure geodesy, blast, MIRV spread, cloud, zone-area, and overlap calculations in physical units. |
| [`src/application/`](src/application/README.md) | Selection, launch groups, injected clock, phases, inspection state, and cloud presentation. |
| [`src/rendering/`](src/rendering/README.md) | MapLibre camera and imagery, Canvas fields and missiles, WebGL fireballs, and geographic overlays. |
| [`src/ui/`](src/ui/README.md) | React controls, map mount, status, instrument, and accessible inspection. |
| [`tests/`](tests/README.md) | Deterministic unit, integration, and browser verification. |

Model output never contains screen pixels or drawing objects. Application state never owns MapLibre or React components. Rendering receives immutable launch frames and uses one map camera to project them. The shared multi-field grid has bounded sample storage and chunked work; dense scenes may render more softly or finish filling after a camera change, but visible impacts remain eligible. The map scale estimates distance at the camera center, especially approximate on a pitched view.

## Engineering setup and delivery

Use Node.js 22.13 or newer. In this directory, run `npm ci` and, when needed, `npx playwright install chromium`. `npm run verify` runs type checking, lint, unit and integration tests, a build, and Playwright browser checks. `npm run dev` and `npm run preview` support engineering inspection. Browser tests replace live Esri raster tiles with a deterministic fixture; production uses Esri World Imagery with visible attribution and a retry notice if imagery fails.

The tracked `.openai/hosting.json` points the existing Site to the static `dist/` build. The root GitHub repository is authoritative; [publishing instructions](../docs/sites-publishing.md) copy an exact pushed source tree into a clean temporary release checkout, verify it, and publish to the same owner-private Site. Prototype code and screenshots are read-only references outside this directory.
