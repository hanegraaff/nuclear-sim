# Visual reference — Plan 01

The read-only prototype screenshots show Esri satellite imagery filling the viewport. `Missile.jpeg` has the left control stack hidden, making the imagery and bottom-right navigation controls useful references for this first map-only increment. Plan 01 intentionally does not include the missile, crosshair, effect fields, cloud profile, or controls; those are assigned to later roadmap plans.

The browser smoke test compares an initial **2208 × 1276** screenshot with a reviewed baseline using a synthetic tile fixture. That fixture proves map layout, viewport coverage, controls, and attribution without depending on live Esri tiles; it is not a visual target for the real satellite imagery. The deployed Site uses the live configured imagery source. Most full-page prototype references have the same viewport, so later visual comparisons can use this size with matching camera state.

No approved visual deviation from the Plan 01 map behavior is recorded.

## Plan 02 device panel

`Nuke Blast Top.png` is the panel reference. At roughly **1280 × 740 CSS pixels**, the implementation panel has the prototype's 356 px width, 16 px upper-left offset, clipped charcoal shape, coral title, dense mono label, dark selector, and red selected-device text. The 47 fixed options and four native optgroup labels preserve the prototype order and wording. Packaged Geist Sans and Geist Mono avoid a runtime font request.

The Plan 02 panel intentionally shows only the working Device selector and custom-yield input. The screenshot's Scenario, Reset, Multi-Launch Mode, Night, Hide, and cloud-monitor elements are scheduled for later plans. Until clicking the map launches in Plan 04, the subtitle reads “Choose a device” in place of “Click Map to Launch.” These are staged differences for R-02/R-03, not final visual changes.

## Plan 03 scenario controls

The Scenario and Device tabs and grouped dropdown follow `Nuke Blast Top.png` and the prototype's selector styling. Fixed-tile captures at 1280 × 740 CSS pixels cover both tabs; a keyboard-focused tab has an additional visible focus outline. For R-02/R-04, the subtitle says “Choose a scenario” or “Choose a device” until launch exists. Reset, Multi-Launch, Night, Hide, and the cloud panel remain scheduled for later plans.

## Plan 04 target and missile

`Missile.jpeg` is the visual reference for R-05/V-01. The reviewed [fixed-time capture](../tests/e2e/missile.spec.ts-snapshots/plan-04-missile-3200ms-darwin.png) uses a 1508 × 1080 CSS-pixel viewport, synthetic tiles, the first launch's upper-right entry angle, and 3200 ms of browser clock time. The red reticle, compact amber-white missile, and thin pale trail match the reference's shapes, approximate scale, and layer order. The source screenshot has its left controls hidden and real Esri imagery; this staged Plan 04 capture shows the panel and fixed tile fixture. Hide/Show is assigned to Plan 15. The smoke is a deterministic approximation of the prototype's small drifting puffs. At arrival, this plan keeps the reticle and reports target reached; the flash and blast begin in Plan 05. The review fix projects the route before sampling its curve, so pitch and zoom now follow the prototype's drawing order; the inspected first-launch frame remains within the approved baseline threshold.

## Plan 05 impact and single field

The fixed-tile **1508 × 1080** browser captures use a 21 kt Fat Man, two zoom-control clicks from the initial New York camera, and a ground target at (1000, 580) CSS pixels. [Impact at 50 ms](../tests/e2e/blast.spec.ts-snapshots/plan-05-impact-50ms-darwin.png), [expansion at 2300 ms](../tests/e2e/blast.spec.ts-snapshots/plan-05-expansion-2300ms-darwin.png), and [settled field](../tests/e2e/blast.spec.ts-snapshots/plan-05-settled-darwin.png) were inspected against `Nuke Blast with Fireball.png` and `Nuke Blast Top.png`. The impact has a warm white/yellow/orange bloom over the target, the expansion has a white/red shock ring, and the final field reads from light center through orange, magenta, and translucent purple. Terrain remains visible through the outer field. The source references use live Esri imagery and a different camera zoom; the synthetic-tile frames establish shape, color, timing, and layer order without depending on current imagery.

Remaining staged differences: zone boundary strokes, radial ruler, markers, and popups arrive in Plan 06; grounded pitched field geometry arrives in Plan 07; the raised 3D fireball dome arrives in Plan 08; and the cloud monitor arrives in Plan 09. The Plan 05 center is a flat luminous gradient. Reset is a working single button in the existing compact panel; the prototype pairs it with the later Multi-Launch toggle. The prototype's short lower-edge scientific qualification is now present.
